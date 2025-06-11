const mongoose = require('mongoose')
const createChangeLoggingMiddleware = require('../middleware/changeLogging')

const FrequencySchema = new mongoose.Schema({
    name: String,
    interval_days: String,
    trigger_days: String,
    created_at: { type: Date, default: Date.now }, 
    updated_at: { type: Date, default: Date.now }, 
    deleted_at: { type: Date, default: null }
})

// Attach the change logging middleware with 'frequency' as the collection name
FrequencySchema.pre('findOneAndUpdate', createChangeLoggingMiddleware('frequency'))

const FrequencyModel = mongoose.model('frequency', FrequencySchema)

module.exports = FrequencyModel