const Complaint = require('../models/complaint');

exports.createComplaint = async (req, res) => {
  try {
    const { senderId, senderEmail, reportedUserId, complaintText, complaintType, type } = req.body;

    const complaint = new Complaint({
      senderId,
      senderEmail,
      reportedUserId,
      complaintText,
      complaintType,
      type
    });

    await complaint.save();
    res.status(200).json({ message: 'Complaint submitted successfully' });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Error submitting complaint' });
  }
}; 