const mongoose = require('mongoose');

const ChangeLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // User who made the change, optional for initial setup
  actionType: { type: String, required: true, enum: ['Create', 'Update', 'Delete', 'Enable', 'Disable'] }, // e.g., 'Create', 'Update', 'Delete', 'Enable', 'Disable'
  documentModel: { type: String, required: true }, // e.g., 'Application', 'Employee', 'Frequency', 'User'
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the document that was changed
  // You can add more fields later if needed, e.g., details: {} to store old/new values
});

const ChangeLogModel = mongoose.model('ChangeLog', ChangeLogSchema);

module.exports = ChangeLogModel; 