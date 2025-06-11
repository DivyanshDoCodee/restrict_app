const mongoose = require('mongoose');
const CompletedReview = require('./models/CompletedReview');
const Employee = require('./models/Employee');

async function backfillEmployeeId() {
  await mongoose.connect('mongodb://127.0.0.1:27017/restrict_app');

  const reviews = await CompletedReview.find({ employeeId: { $exists: false } });
  for (const review of reviews) {
    // Try to find the employee by name
    const employee = await Employee.findOne({ name: review.employeeName });
    if (employee) {
      review.employeeId = employee._id;
      await review.save();
      console.log(`Updated review for ${review.employeeName}`);
    } else {
      console.log(`No employee found for review: ${review.employeeName}`);
    }
  }
  console.log('Backfill complete!');
  process.exit();
}

backfillEmployeeId(); 