const mongoose = require('mongoose')
const auditMiddleware = require('../middleware/auditMiddleware'); // Import the middleware
const appLogsMiddleware = require('../middleware/appLogsMiddleware');

const EmployeeSchema = new mongoose.Schema({
    name:String,
    email:String,
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Populate this field
    hod: String, // Added field to store HOD email

    created_at: { type: Date, default: Date.now }, 
    updated_at: { type: Date, default: Date.now }, 
    deleted_at: { type: Date, default: null }, 
    status: { type: Boolean, default: true } // Changed back to Boolean and defaulted to true (Enabled)
})

// Apply the audit middleware to the EmployeeSchema
auditMiddleware(EmployeeSchema);
appLogsMiddleware(EmployeeSchema);

const EmployeeModel = mongoose.model("Employee" ,EmployeeSchema)

module.exports = EmployeeModel