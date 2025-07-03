const Match = require('../models/match.model');
const User = require('../../auth/models/User');
const { getFullPhotoUrl } = require('../../photos/photo.utils');

exports.getAllMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const clientMatches = req.body.matches || [];

    console.log('Getting matches for user:', userId);
    console.log('Client matches:', clientMatches);

    // Находим пользователя по userId
    const user = await User.findOne({ userId: userId });
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User matches from database:', user.matches);

    // Находим ID пользователей, которых нет на клиенте
    const missingMatchIds = user.matches.filter(id => !clientMatches.includes(id.toString()));
    
    // Находим ID пользователей, которых нет на сервере
    const matchesToRemove = clientMatches.filter(id => !user.matches.includes(id.toString()));

    console.log('Missing match IDs:', missingMatchIds);
    console.log('Matches to remove:', matchesToRemove);

    // Если нет ни новых мэтчей, ни мэтчей для удаления
    if (missingMatchIds.length === 0 && matchesToRemove.length === 0) {
      console.log('All matches are synchronized');
      return res.status(200).json({ 
        matches: [],
        matchesToRemove: [],
        message: 'All matches are synchronized'
      });
    }

    // Получаем только необходимые данные пользователей
    const missingUsers = await User.find({ 
      userId: { $in: missingMatchIds }
    }).select('userId name photos birthday about');

    console.log('Found missing users:', missingUsers.length);

    // Форматируем данные для отправки
    const formattedMatches = missingUsers.map(user => ({
      userId: user.userId,
      name: user.name,
      photos: getFullPhotoUrls(user.photos),
      birthday: user.birthday,
      about: user.about
    }));

    console.log('Sending formatted matches:', formattedMatches.length);
    console.log('Sending matches to remove:', matchesToRemove.length);

    return res.status(200).json({ 
      matches: formattedMatches,
      matchesToRemove: matchesToRemove,
      message: `Found ${formattedMatches.length} new matches and ${matchesToRemove.length} matches to remove`
    });

  } catch (error) {
    console.error('Error getting all matches:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 