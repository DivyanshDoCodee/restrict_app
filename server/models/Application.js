const mongoose = require('mongoose');
const auditMiddleware = require('../middleware/auditMiddleware');
const appLogsMiddleware = require('../middleware/appLogsMiddleware');

// Define the schema for the app
const AppSchema = new mongoose.Schema({
  appName: {
    type: String,
    required: true
  },
  
  frequency_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'frequency' }],

  status: {
    type: Boolean,
    default: true
  },
  next_audit_date: {
    type: Date, // You can store this as a Date to handle date and time.
    default: null
  },
  last_audit_date: {
    type: Date, // You can store this as a Date to handle date and time.
    default: null,
  },
  desc: {
    type: String,
    required: false // Assuming description is optional.
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  app_rights:{
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  error: {
    type: String,
    default: null // Assuming error is a string, but could be adjusted based on your error handling.
  },
  adminEmail: {
    type: String,
    required: false // Assuming admin email is optional
  },
   created_at: { 
    type: Date, default: Date.now
   }, 
  updated_at: {
     type: Date, default: Date.now 
    }, 
  deleted_at: {
     type: Date, default: null 
    }, 
});

// Apply both middleware
auditMiddleware(AppSchema);
appLogsMiddleware(AppSchema);

// Create and export the model
const App = mongoose.model('App', AppSchema);

module.exports = App;
