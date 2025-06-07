const mongoose = require('mongoose');

const AppLogsSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete']
    },
    field: {
        type: String,
        required: true
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userRole: {
        type: String,
        required: true,
        enum: ['admin', 'hod', 'user']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    documentType: {
        type: String,
        required: true,
        enum: ['Application', 'User', 'Employee', 'Frequency', 'Audit']
    }
});

// Add indexes for better query performance
AppLogsSchema.index({ timestamp: -1 });
AppLogsSchema.index({ documentId: 1, documentType: 1 });
AppLogsSchema.index({ updatedBy: 1 });

const AppLogs = mongoose.model('AppLogs', AppLogsSchema);

module.exports = AppLogs; 