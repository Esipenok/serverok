const User = require('../../auth/models/User');
const MarketCard = require('../models/MarketCard');

const getAllMarketData = async (req, res) => {
    try {
        console.log('[GetAllMarketData] Начало получения данных');
        console.log('[GetAllMarketData] Входящие данные:', req.body);

        const { requests } = req.body;

        if (!requests || !Array.isArray(requests) || requests.length === 0) {
            console.log('[GetAllMarketData] ❌ Отсутствуют или некорректные данные запроса');
            return res.status(400).json({
                status: 'error',
                message: 'Необходимо указать массив requests с userId и marketCardId'
            });
        }

        const results = await Promise.all(requests.map(async (request) => {
            const { userId, marketCardId } = request;
            
            // Получаем данные пользователя
            const userData = await User.findOne(
                { userId },
                { userId: 1, name: 1, photos: 1 }
            );

            // Получаем данные карточки
            const cardData = await MarketCard.findOne({ marketCardId });

            return {
                user: userData ? {
                    userId: userData.userId,
                    name: userData.name,
                    photo: userData.photos?.[0] || null
                } : {
                    status: 'deleted',
                    message: 'User has been deleted'
                },
                card: cardData ? {
                    ...cardData.toObject(),
                    photos: cardData.photos || []
                } : {
                    status: 'deleted',
                    message: 'Card has been deleted'
                }
            };
        }));

        const response = {
            status: 'success',
            data: results
        };

        console.log('[GetAllMarketData] ✅ Ответ сформирован');
        console.log('[GetAllMarketData] Отправка ответа клиенту:', JSON.stringify(response, null, 2));

        res.status(200).json(response);
    } catch (error) {
        console.error('[GetAllMarketData] ❌ Ошибка:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllMarketData
}; 