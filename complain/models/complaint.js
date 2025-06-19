const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  senderEmail: {
    type: String,
    required: true
  },
  reportedUserId: {
    type: String,
    required: true
  },
  complaintText: {
    type: String,
    required: true
  },
  complaintType: {
    type: String,
    enum: ['SPAM', 'FAKE_PROFILE', 'INSULT', 'HARASSMENT', 'SCAM', 'OTHER', 'IMPROVEMENTS', 'ISSUES'],
    required: true
  },
  type: {
    type: String,
    enum: ['complain', 'improve_and_problem'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Complaint', complaintSchema); 