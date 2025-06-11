const mongoose = require('mongoose');
const createChangeLoggingMiddleware = require('../middleware/changeLogging');

// Example schema for the 'apps' collection
const appSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  // Add other fields as needed
}, {
  timestamps: true
});

// Add the change logging middleware
appSchema.pre('findOneAndUpdate', createChangeLoggingMiddleware('apps'));

// Example schema for the 'employees' collection
const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  department: String,
  // Add other fields as needed
}, {
  timestamps: true
});

// Add the change logging middleware
employeeSchema.pre('findOneAndUpdate', createChangeLoggingMiddleware('employees'));

// Example schema for the 'frequencies' collection
const frequencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  // Add other fields as needed
}, {
  timestamps: true
});

// Add the change logging middleware
frequencySchema.pre('findOneAndUpdate', createChangeLoggingMiddleware('frequencies'));

// Create and export the models
const App = mongoose.model('apps', appSchema);
const Employee = mongoose.model('employees', employeeSchema);
const Frequency = mongoose.model('frequencies', frequencySchema);

module.exports = {
  App,
  Employee,
  Frequency
}; 