const mongoose = require('mongoose');

const frequencyLogSchema = new mongoose.Schema({
    changed_by: { type: String, required: true },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, required: true, default: Date.now }
});

const employeeLogSchema = new mongoose.Schema({
    changed_by: { type: String, required: true },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, required: true, default: Date.now }
});

const applicationLogSchema = new mongoose.Schema({
    changed_by: { type: String, required: true },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, required: true, default: Date.now }
});

const FrequencyLog = mongoose.model('frequencyLogs', frequencyLogSchema);
const EmployeeLog = mongoose.model('employeeLogs', employeeLogSchema);
const ApplicationLog = mongoose.model('applicationLogs', applicationLogSchema);

module.exports = { FrequencyLog, EmployeeLog, ApplicationLog }; 