// Filter Finder exports
const routes = require('./routes');

const ageFilter = require('./age_filter');
const combinedFilter = require('./combined_filter');
const distanceUtils = require('./distance_utils');
const genderFilter = require('./gender_filter');
const locationFilter = require('./location_filter');

module.exports = {
  routes,
  ageFilter,
  combinedFilter,
  distanceUtils,
  genderFilter,
  locationFilter
}; 