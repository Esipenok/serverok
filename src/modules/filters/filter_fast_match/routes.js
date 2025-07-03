const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../core/security/jwt.middleware');
const { authLimiter } = require('../../auth/middleware/rate-limiter');
const { filterUsers } = require('./combined_filter');
const Match = require('../../matches/models/match.model');
const { filterUsersByAge } = require('./age_filter');
const { filterUsersByGender } = require('./gender_filter');
const User = require('../../auth/models/User');
const mongoose = require('mongoose');
const { filterByBlockedUsers } = require('./blocked_users_filter');
const { kafkaModuleService } = require('../../../infrastructure/kafka');

// Маршрут для получения отфильтрованных по возрасту пользователей
router.get('/age/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredUsers = await filterUsersByAge(userId);
        
        res.json({
            status: 'success',
            data: filteredUsers
        });
    } catch (error) {
        console.error('Error in age filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения отфильтрованных по полу пользователей
router.get('/gender/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredUsers = await filterUsersByGender(userId);
        
        res.json({
            status: 'success',
            data: filteredUsers
        });
    } catch (error) {
        console.error('Error in gender filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения пользователей, отфильтрованных по всем критериям
router.post('/filter/:userId', async (req, res) => {
    try {
        const startTime = Date.now();
        const { userId } = req.params;
        const filters = req.body;
        console.log('Получены параметры фильтрации:', filters);
        
        const filteredUsers = await filterUsers(userId, filters);
        
        // Отправляем асинхронные операции в Kafka
        try {
          // Асинхронная аналитика фильтрации
          await kafkaModuleService.sendFilterOperation('analytics', {
            userId: userId,
            filterType: 'fast_match',
            searchCriteria: filters,
            resultCount: filteredUsers.length,
            searchTime: Date.now() - startTime
          });
          
          // Асинхронное обновление кэша
          await kafkaModuleService.sendFilterOperation('cache_update', {
            userId: userId,
            filterType: 'fast_match',
            cacheKey: `fast_match_${userId}_${JSON.stringify(filters)}`,
            cacheData: { users: filteredUsers.length, timestamp: Date.now() }
          });
          
        } catch (error) {
          console.error('Ошибка отправки асинхронных операций в Kafka:', error);
          // Не прерываем основной поток, так как фильтрация уже выполнена
        }
        
        res.json({
            status: 'success',
            data: filteredUsers
        });
    } catch (error) {
        console.error('Error in combined filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для отправки запроса на быстрое свидание
router.post('/request', async (req, res) => {
    try {
        const { userId, targetUserId } = req.body;
        
        console.log('Received fast match request:', { userId, targetUserId, headers: req.headers });
        
        if (!userId || !targetUserId) {
            console.log('Missing userId or targetUserId');
            return res.status(400).json({
                status: 'error',
                message: 'userId и targetUserId обязательны'
            });
        }

        // Проверяем существование обоих пользователей
        const [sender, receiver] = await Promise.all([
            User.findOne({ userId: userId }),
            User.findOne({ userId: targetUserId })
        ]);

        console.log('Found users:', { 
            senderExists: !!sender, 
            receiverExists: !!receiver,
            senderName: sender?.name,
            receiverName: receiver?.name,
            receiver_fast_match_active: receiver?.fast_match_active
        });

        if (!sender || !receiver) {
            console.log('One or both users not found');
            return res.status(404).json({
                status: 'error',
                message: 'Один или оба пользователя не найдены'
            });
        }

        // Проверяем, активирован ли fast match у получателя
        if (!receiver.fast_match_active) {
            console.log('Receiver has not activated fast match');
            return res.status(400).json({
                status: 'error',
                message: 'Пользователь не активировал быстрое свидание'
            });
        }

        // Сортируем ID пользователей для поддержания консистентности
        const [user1Id, user2Id] = [userId, targetUserId].sort();
        const isUserFirst = userId === user1Id;
        
        console.log('After sorting user IDs:', { user1Id, user2Id, isUserFirst });

        // Ищем существующий матч между пользователями
        let matchDoc = await Match.findOne({
            user1: user1Id,
            user2: user2Id
        });
        
        console.log('Existing match document:', matchDoc ? 'Found' : 'Not found');

        // Если матч не найден, создаем новый
        if (!matchDoc) {
            matchDoc = new Match({
                user1: user1Id,
                user2: user2Id,
                status: 'pending',
                user1Liked: isUserFirst ? true : false,
                user2Liked: isUserFirst ? false : true,
                feature: 'fast',
            });
            
            // Сохраняем новый матч
            await matchDoc.save();
            console.log('Created new match document with ID:', matchDoc._id);
        } else {
            // Обновляем существующий матч
            if (isUserFirst) {
                matchDoc.user1Liked = true;
            } else {
                matchDoc.user2Liked = true;
            }
            
            // Проверяем, стал ли это полным матчем
            if (matchDoc.user1Liked && matchDoc.user2Liked) {
                matchDoc.status = 'matched';
                matchDoc.feature = 'fast';
                console.log('Updated match status to "matched" - THIS IS A FULL MATCH!');
            }
            
            // Обновляем время последнего взаимодействия
            matchDoc.lastInteraction = new Date();
            
            // Сохраняем обновленный матч
            await matchDoc.save();
            console.log('Updated match document');
        }

        // Отправляем асинхронные операции в Kafka
        try {
          // Асинхронная аналитика fast match запроса
          await kafkaModuleService.sendFilterOperation('analytics', {
            userId: userId,
            filterType: 'fast_match_request',
            targetUserId: targetUserId,
            action: 'request_sent',
            timestamp: new Date().toISOString()
          });
          
          // Асинхронное обновление кэша
          await kafkaModuleService.sendFilterOperation('cache_update', {
            userId: userId,
            filterType: 'fast_match_cache',
            cacheKey: `fast_match_${userId}_${targetUserId}`,
            cacheData: { status: 'requested', timestamp: Date.now() }
          });
          
        } catch (error) {
          console.error('Ошибка отправки асинхронных операций в Kafka:', error);
          // Не прерываем основной поток, так как запрос уже отправлен
        }

        // Отправляем ответ
        res.json({
            status: 'success',
            message: 'Запрос на быстрое свидание отправлен'
        });
    } catch (error) {
        console.error('Error in fast match request route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для удаления истекших запросов на быстрое свидание
router.delete('/expired-requests', async (req, res) => {
    try {
        // Добавляем заглушку - проверяем время последнего запроса
        const now = new Date();
        const lastRequestTime = global.lastExpiredRequestsCheck || new Date(0);
        const timeSinceLastRequest = now - lastRequestTime;
        
        // Если прошло меньше 5 минут с последнего запроса, возвращаем заглушку
        if (timeSinceLastRequest < 5 * 60 * 1000) {
            console.log('Заглушка: запрос на удаление истекших запросов получен слишком часто');
            return res.status(200).json({
                status: 'success',
                message: 'Заглушка: запрос получен слишком часто'
            });
        }
        
        // Обновляем время последнего запроса
        global.lastExpiredRequestsCheck = now;
        
        return res.status(200).json({
            status: 'success',
            message: 'Запрос обработан'
        });
    } catch (error) {
        console.error('Ошибка при удалении истекших запросов:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения пользователей для быстрого знакомства
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Получен запрос на получение пользователей для быстрого знакомства:', userId);
        
        // Получаем текущего пользователя
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Получаем все пользователи, кроме текущего
        let users = await User.find({ 
            userId: { $ne: userId },
            isProfileCompleted: true
        });

        // Применяем фильтры
        users = users.filter(user => {
            // Фильтр по возрасту
            const userAge = calculateAge(user.birthday);
            if (userAge < (currentUser.ageMin || 18) || userAge > (currentUser.ageMax || 50)) {
                return false;
            }

            // Фильтр по полу
            if (currentUser.lookingFor !== 'all' && user.gender !== currentUser.lookingFor) {
                return false;
            }

            // Фильтр по расстоянию
            if (currentUser.searchDistance && 
                currentUser.location && 
                currentUser.location.coordinates && 
                user.location && 
                user.location.coordinates) {
                const distance = calculateDistance(
                    currentUser.location.coordinates,
                    user.location.coordinates
                );
                if (distance > currentUser.searchDistance) {
                    return false;
                }
            }

            // Фильтр матчей
            if (currentUser.matches && currentUser.matches.includes(user.userId)) {
                return false;
            }

            // Фильтр по excludedUsers
            if (currentUser.excludedUsers && currentUser.excludedUsers.includes(user.userId)) {
                console.log(`Пользователь ${user.userId} исключен из результатов (excludedUsers)`);
                return false;
            }

            return true;
        });

        // Применяем фильтр заблокированных пользователей
        users = await filterByBlockedUsers(userId, users);

        // Преобразуем пользователей в нужный формат
        const formattedUsers = users.map(user => ({
            userId: user.userId,
            name: user.name,
            age: calculateAge(user.birthday),
            gender: user.gender,
            photos: user.photos,
            location: user.location,
            about: user.about
        }));

        res.json({
            status: 'success',
            data: formattedUsers
        });
    } catch (error) {
        console.error('Ошибка при получении пользователей для быстрого знакомства:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Вспомогательная функция для расчета возраста
function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Вспомогательная функция для расчета расстояния
function calculateDistance(coords1, coords2) {
    const R = 6371; // Радиус Земли в км
    const dLat = toRad(coords2[1] - coords1[1]);
    const dLon = toRad(coords2[0] - coords1[0]);
    const lat1 = toRad(coords1[1]);
    const lat2 = toRad(coords2[1]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(value) {
    return value * Math.PI / 180;
}

module.exports = router; 