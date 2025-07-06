// All modules exports
const auth = require('./auth');
const users = require('./users');
const photos = require('./photos');
const matches = require('./matches');
const filters = require('./filters');
const fastMatch = require('./fast_match');
const oneNight = require('./one_night');
const marketprofiles = require('./marketprofiles');
const notifications = require('./notifications');
const complain = require('./complain');
const invites = require('./invites');
const qr = require('./qr');
const country = require('./country');
const deleteAllData = require('./delete_all_data');
module.exports = {
  auth,
  users,
  photos,
  matches,
  filters,
  fastMatch,
  oneNight,
  marketprofiles,
  notifications,
  complain,
  invites,
  qr,
  country,
  deleteAllData
}; 