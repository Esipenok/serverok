// Filter Fast Match exports
const routes = require('./routes');

const activeStatusFilter = require('./active_status_filter');
const ageFilter = require('./age_filter');
const blockedUsersFilter = require('./blocked_users_filter');
const combinedFilter = require('./combined_filter');
const distanceUtils = require('./distance_utils');
const filterManager = require('./filter_manager');
const genderFilter = require('./gender_filter');
const locationFilter = require('./location_filter');

module.exports = {
  routes,
  activeStatusFilter,
  ageFilter,
  blockedUsersFilter,
  combinedFilter,
  distanceUtils,
  filterManager,
  genderFilter,
  locationFilter
}; 