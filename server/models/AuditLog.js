const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: { // Type of action: 'create', 'update', 'delete'
    type: String,
    required: true,
    enum: ['create', 'update', 'delete']
  },
  modelName: { // Name of the Mongoose model affected
    type: String,
    required: true
  },
  documentId: { // ID of the document that was changed
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  user: { // Information about the user who performed the action
    username: { type: String },
    email: { type: String }
  },
  changes: { // Details of the changes (field: new value)
    type: mongoose.Schema.Types.Mixed, // Mixed type to allow flexible object structure
    default: {}
  },
  timestamp: { // Time when the action occurred
    type: Date,
    default: Date.now
  }
});

// Add an index for faster querying by model and document ID, or by timestamp
AuditLogSchema.index({ modelName: 1, documentId: 1 });
AuditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog; 