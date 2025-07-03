const express = require('express');
const router = express.Router();
const { filterUsersByAge } = require('./age_filter');
const { filterUsersByGender } = require('./gender_filter');
const { filterUsersByDistance } = require('./location_filter');
const { filterUsers } = require('./combined_filter');
const { infrastructure } = require('../../../infrastructure');
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

// Маршрут для получения отфильтрованных по расстоянию пользователей
router.get('/distance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredUsers = await filterUsersByDistance(userId);
        
        res.json({
            status: 'success',
            data: filteredUsers
        });
    } catch (error) {
        console.error('Error in distance filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения пользователей, отфильтрованных по всем критериям
router.get('/:userId', async (req, res) => {
    try {
        const startTime = Date.now();
        const { userId } = req.params;
        const filteredUsers = await filterUsers(userId);
        
        // Отправляем асинхронные операции в Kafka
        try {
          // Асинхронная аналитика фильтрации
          await kafkaModuleService.sendFilterOperation('analytics', {
            userId: userId,
            filterType: 'finder',
            searchCriteria: req.query,
            resultCount: filteredUsers.length,
            searchTime: Date.now() - startTime
          });
          
          // Асинхронное обновление кэша
          await kafkaModuleService.sendFilterOperation('cache_update', {
            userId: userId,
            filterType: 'finder',
            cacheKey: `finder_${userId}_${JSON.stringify(req.query)}`,
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

module.exports = router; 