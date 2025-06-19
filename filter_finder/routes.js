const express = require('express');
const router = express.Router();
const { filterUsersByAge } = require('./age_filter');
const { filterUsersByGender } = require('./gender_filter');
const { filterUsersByDistance } = require('./location_filter');
const { filterUsers } = require('./combined_filter');

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
        const { userId } = req.params;
        const filteredUsers = await filterUsers(userId);
        
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