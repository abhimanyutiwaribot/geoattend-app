const mongoose = require('mongoose');

const LeaveRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: {
    type: String,
    enum: ['sick', 'vacation', 'personal', 'emergency', 'wfh'],
    default: 'personal'
  },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  adminComment: { type: String }, // Optional reason for rejection or approval note
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt: { type: Date }
}, {
  timestamps: true
});

// Index for efficiently querying a user's requests
LeaveRequestSchema.index({ userId: 1, startDate: -1 });

// Index for finding all overlapping leaves for a date range (for conflict detection)
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });

// Index for quickly finding pending requests for admin dashboard
LeaveRequestSchema.index({ status: 1 });

module.exports = mongoose.model('LeaveRequest', LeaveRequestSchema);
