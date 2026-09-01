const express = require('express');
const {
  getProblems, getDailyProblems, getProblemById,
  assignProblem, unassignProblem, solveProblem,
  getUserProblems, getUserStats, getLeaderboard,
} = require('../controllers/problemController');
const { createSubmission, getUserSubmissions, analyzeSubmission } = require('../controllers/submissionController');
const { requireAuth } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public / optional-auth
router.get('/problems', optionalAuth, getProblems);
router.get('/problems/daily', optionalAuth, getDailyProblems);
router.get('/problems/:id', optionalAuth, getProblemById);
router.get('/leaderboard', getLeaderboard);

// Authenticated user routes
router.get('/user/problems', requireAuth, getUserProblems);
router.get('/user/stats', requireAuth, getUserStats);
router.post('/user/problems/:id/assign', requireAuth, assignProblem);
router.delete('/user/problems/:id/unassign', requireAuth, unassignProblem);
router.patch('/user/problems/:id/solve', requireAuth, solveProblem);

// Submissions
router.post('/user/submissions', requireAuth, createSubmission);
router.get('/user/submissions', requireAuth, getUserSubmissions);
router.post('/user/submissions/:id/analyze', requireAuth, analyzeSubmission);

module.exports = router;
