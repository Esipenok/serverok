const express = require('express');
const router = express.Router();
const { filterMarketCardsByAge } = require('./age_filter');
const { filterMarketCardsByGender } = require('./gender_filter');
const { filterMarketCardsByDistance } = require('./location_filter');
const { filterMarketCards } = require('./combined_filter');

// Маршрут для получения отфильтрованных по возрасту маркетных карточек
router.get('/age/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredMarketCards = await filterMarketCardsByAge(userId);
        
        res.json({
            status: 'success',
            data: filteredMarketCards
        });
    } catch (error) {
        console.error('Error in age filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения отфильтрованных по полу маркетных карточек
router.get('/gender/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredMarketCards = await filterMarketCardsByGender(userId);
        
        res.json({
            status: 'success',
            data: filteredMarketCards
        });
    } catch (error) {
        console.error('Error in gender filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения отфильтрованных по расстоянию маркетных карточек
router.get('/distance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredMarketCards = await filterMarketCardsByDistance(userId);
        
        res.json({
            status: 'success',
            data: filteredMarketCards
        });
    } catch (error) {
        console.error('Error in distance filter route:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Маршрут для получения маркетных карточек, отфильтрованных по всем критериям
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filteredMarketCards = await filterMarketCards(userId);
        
        res.json({
            status: 'success',
            data: filteredMarketCards
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