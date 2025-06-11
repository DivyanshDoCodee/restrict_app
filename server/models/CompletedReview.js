const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const completedReviewSchema = new Schema({
  employeeName: { type: String, required: true },
  menuRights: { type: Schema.Types.Mixed, default: null },
  branchRights: { type: Schema.Types.Mixed, default: null },
  reviewerRemarks: { type: String, default: null },
  actionTaken: { type: String, enum: ['retain', 'revoke', 'modify'], required: true },
  reviewerName: { type: String, required: true },
  applicationName: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: false }
});

const CompletedReview = mongoose.model('CompletedReview', completedReviewSchema);

module.exports = CompletedReview; 