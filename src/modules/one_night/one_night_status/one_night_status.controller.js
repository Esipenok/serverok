const OneNight = require('../models/one_night.model');
const User = require('../../auth/models/User');

// Обновление статуса one_night
exports.updateOneNightStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { one_night } = req.body;

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        user.one_night = one_night;
        await user.save();

        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        console.error('Ошибка при обновлении статуса one night:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}; 