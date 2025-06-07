const mongoose = require('mongoose')
const auditMiddleware = require('../middleware/auditMiddleware')
const appLogsMiddleware = require('../middleware/appLogsMiddleware')

const FrequencySchema = new mongoose.Schema({
    name:String,
    interval_days:String,
    trigger_days:String,
    created_at: { type: Date, default: Date.now }, 
    updated_at: { type: Date, default: Date.now }, 
    deleted_at: { type: Date, default: null }
 })

// Apply the audit middleware to the FrequencySchema
auditMiddleware(FrequencySchema)
appLogsMiddleware(FrequencySchema);

const FrequencyModel = mongoose.model("frequency" ,FrequencySchema)

module.exports = FrequencyModel