const express = require('express');
const {
  getAdminStats, getAllUsers, getUserActivity, updateUserRole,
  getAdminProblems, createProblem, createBulkProblems, updateProblem, deleteProblem, toggleDailyProblem,
} = require('../controllers/adminController');
const {
  getAdminNotifications, markNotificationRead, markAllNotificationsRead,
  getSubmissionDetail, scoreSubmission,
} = require('../controllers/submissionController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// Stats & Metrics
router.get('/stats', requireAdmin, getAdminStats);
router.get('/metrics', requireAdmin, getAdminStats);

// Users Management & Per-User Activity
router.get('/users', requireAdmin, getAllUsers);
router.get('/users/:id/activity', requireAdmin, getUserActivity);
router.patch('/users/:id/role', requireAdmin, updateUserRole);

// Problems Management (Single & Bulk)
router.get('/problems', requireAdmin, getAdminProblems);
router.post('/problems', requireAdmin, createProblem);
router.post('/problems/bulk', requireAdmin, createBulkProblems);
router.put('/problems/:id', requireAdmin, updateProblem);
router.delete('/problems/:id', requireAdmin, deleteProblem);
router.patch('/problems/:id/daily', requireAdmin, toggleDailyProblem);

// Notifications
router.get('/notifications', requireAdmin, getAdminNotifications);
router.patch('/notifications/read-all', requireAdmin, markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAdmin, markNotificationRead);

// Submissions (Admin View & Score Evaluation)
router.get('/submissions/:id', requireAdmin, getSubmissionDetail);
router.patch('/submissions/:id/score', requireAdmin, scoreSubmission);

module.exports = router;
