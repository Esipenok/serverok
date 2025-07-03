// Complain module exports
const complaintController = require('./controllers/complaintController');
const complaintRoutes = require('./routes/complaintRoutes');
const complaint = require('./models/complaint');

module.exports = {
  complaintController,
  complaintRoutes,
  complaint
}; 