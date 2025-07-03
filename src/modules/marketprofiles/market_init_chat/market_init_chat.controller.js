const User = require('../../auth/models/User');
const MarketCard = require('../models/MarketCard');

const initiateChat = async (req, res) => {
    try {
        console.log('[MarketInitChat] Начало инициализации чата');
        console.log('[MarketInitChat] Входящие данные:', req.body);

        const { userId, marketCardId, otherUserId, otherMarketCardId } = req.body;

        if (!userId || !marketCardId || !otherUserId || !otherMarketCardId) {
            console.log('[MarketInitChat] ❌ Отсутствуют обязательные поля');
            return res.status(400).json({
                status: 'error',
                message: 'Необходимо указать userId, marketCardId, otherUserId и otherMarketCardId'
            });
        }

        // 1. Получаем данные карточки для определения владельца
        console.log('[MarketInitChat] Получение данных карточки...');
        const cardData = await MarketCard.findOne({ marketCardId: otherMarketCardId });

        if (!cardData) {
            console.log('[MarketInitChat] ❌ Данные карточки не найдены');
            return res.status(404).json({
                status: 'error',
                message: 'Данные карточки не найдены'
            });
        }
        console.log('[MarketInitChat] ✅ Данные карточки получены');

        const cardOwnerId = cardData.userId;
        console.log('[MarketInitChat] ID владельца карточки:', cardOwnerId);

        // 2. Обновляем market_card_exclude для обоих пользователей
        console.log('[MarketInitChat] Обновление market_card_exclude...');
        
        // Для инициатора чата (userId) добавляем ID карточки партнера
        await User.findOneAndUpdate(
            { userId },
            { $addToSet: { market_card_exclude: otherMarketCardId } },
            { new: true }
        );

        // Для партнера (otherUserId) добавляем ID карточки инициатора
        await User.findOneAndUpdate(
            { userId: otherUserId },
            { $addToSet: { market_card_exclude: marketCardId } },
            { new: true }
        );

        console.log('[MarketInitChat] ✅ market_card_exclude обновлен для обоих пользователей');

        // 3. Получаем данные пользователя
        console.log('[MarketInitChat] Получение данных пользователя...');
        const userData = await User.findOne(
            { userId: otherUserId },
            { userId: 1, name: 1, photos: 1 }
        );

        if (!userData) {
            console.log('[MarketInitChat] ❌ Данные пользователя не найдены');
            return res.status(404).json({
                status: 'error',
                message: 'Данные пользователя не найдены'
            });
        }
        console.log('[MarketInitChat] ✅ Данные пользователя получены');

        // 4. Формируем ответ
        const chatId = `${userId}_${otherUserId}_${Date.now()}`;
        console.log('[MarketInitChat] Создан chatId:', chatId);
        const response = {
            status: 'success',
            data: {
                user: {
                    userId: userData.userId,
                    name: userData.name,
                    photo: userData.photos?.[0] || null
                },
                card: {
                    ...cardData.toObject(),
                    photos: cardData.photos || []
                },
                chatId: chatId
            }
        };

        console.log('[MarketInitChat] ✅ Ответ сформирован');
        console.log('[MarketInitChat] Отправка ответа клиенту:', JSON.stringify(response, null, 2));

        res.status(200).json(response);
    } catch (error) {
        console.error('[MarketInitChat] ❌ Ошибка:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

module.exports = {
    initiateChat
}; 