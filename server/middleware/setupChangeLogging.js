const { createChangeLoggerMiddleware } = require('./changeLogger');
const { ApplicationLog, EmployeeLog, FrequencyLog } = require('../models/logSchemas');
const App = require('../models/Application');
const Employee = require('../models/Employee');
const Frequency = require('../models/Frequency');

/**
 * Sets up change logging middleware for all models
 */
const setupChangeLogging = () => {
    // Setup Application change logging
    App.schema.pre('findOneAndUpdate', createChangeLoggerMiddleware({
        model: App,
        logModel: ApplicationLog
    }));

    // Setup Employee change logging
    Employee.schema.pre('findOneAndUpdate', createChangeLoggerMiddleware({
        model: Employee,
        logModel: EmployeeLog
    }));

    // Setup Frequency change logging
    Frequency.schema.pre('findOneAndUpdate', createChangeLoggerMiddleware({
        model: Frequency,
        logModel: FrequencyLog
    }));
};

module.exports = setupChangeLogging; 