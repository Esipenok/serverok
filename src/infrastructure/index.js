// Infrastructure module exports
const kafka = require('./kafka');
const monitoring = require('./monitoring');
const uploads = require('./uploads');

module.exports = {
  kafka,
  monitoring,
  uploads
}; 