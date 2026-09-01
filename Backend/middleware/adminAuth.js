const { requireAuth, requireAdmin } = require('./auth');

module.exports = {
  requireAdmin: [requireAuth, requireAdmin],
  adminAuth: [requireAuth, requireAdmin],
};
