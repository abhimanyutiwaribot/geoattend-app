const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/leaveRequest');
const authMiddleware = require('../middleware/authmiddleware'); // User auth
const { adminAuthMiddleware } = require('../middleware/adminAuthMiddleware'); // Admin auth

// ==========================================
// USER ROUTES
// ==========================================

// @desc    Submit a new leave request
// @route   POST /api/v1/leaves/request
// @access  Private (User)
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id; // Extracted from token by authmiddleware
    const { startDate, endDate, type, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Start date, end date, and reason are required' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date' });
    }

    // Check for overlapping requests
    const existingLeave = await LeaveRequest.findOne({
      userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    if (existingLeave) {
      return res.status(400).json({ success: false, message: 'You already have an active leave request for these dates' });
    }

    const leaveRequest = new LeaveRequest({
      userId,
      startDate,
      endDate,
      type,
      reason,
      status: 'pending'
    });

    await leaveRequest.save();
    res.status(201).json({ success: true, data: leaveRequest });

  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Get my leave requests
// @route   GET /api/v1/leaves/my-requests
// @access  Private (User)
router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error fetching user leaves:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Cancel a pending request
// @route   DELETE /api/v1/leaves/:id
// @access  Private (User)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const leave = await LeaveRequest.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a processed request' });
    }

    await leave.deleteOne();
    res.json({ success: true, message: 'Leave request cancelled' });

  } catch (error) {
    console.error('Error cancelling leave:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// @desc    Get all leave requests
// @route   GET /api/v1/leaves/admin/all
// @access  Private (Admin)
router.get('/admin/all', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const leaves = await LeaveRequest.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error fetching admin leaves:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Update leave status (Approve/Reject)
// @route   PUT /api/v1/leaves/admin/:id/status
// @access  Private (Admin)
router.put('/admin/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, adminComment } = req.body;
    const adminId = req.admin._id;

    const leave = await LeaveRequest.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    leave.status = status;
    leave.adminComment = adminComment;
    leave.reviewedAt = Date.now();
    leave.reviewedBy = adminId;

    await leave.save();
    res.json({ success: true, data: leave });

  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
