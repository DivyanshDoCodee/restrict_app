const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditSchema = new Schema({
    emp_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    frequency_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'frequency', required: false }],
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: false },
    audit_date: { type: Date, default: Date.now },
    initialRights: { type: Schema.Types.Mixed, default: null }, 
    reviewer_rightsGiven: { type: Schema.Types.Mixed, default: null },
    reviewer_reviewAt: { type: Date, default: null },
    reviewer_actionTaken: { type: String, default: null },
    reviewer_remarks: { type: String, default: null },
    excelRightsData: { type: Object, default: {} },
    created_at: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
    status: { type: Boolean, default: true }
});

const Audit = mongoose.model('Audit', auditSchema);

module.exports = Audit;
