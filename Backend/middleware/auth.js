const supabase = require('../db');

// Verifies the Bearer JWT from Supabase Auth and attaches the user's
// profile (id, email, full_name, avatar_url, role) to req.profile.
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, avatar_url, role, score, streak_days')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      // Auto-create profile if missing — always 'user'
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          role: 'user',
          score: 0,
          streak_days: 0,
        })
        .select()
        .single();
      profile = newProfile;
    }

    req.profile = profile || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      role: 'user',
    };
    req.user = req.profile;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Use after requireAuth — rejects non-admins.
const requireAdmin = (req, res, next) => {
  if (req.profile?.role !== 'admin' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// For public routes that still want to know "who's asking" when a
// token IS present (e.g. /api/problems annotating assign/solve state)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) return next();

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return next();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, avatar_url, role, score, streak_days')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      req.profile = profile;
      req.user = profile;
    }
  } catch {
    // Ignore — treat as anonymous.
  }
  next();
};

module.exports = { requireAuth, requireAdmin, optionalAuth, adminAuth: requireAdmin, supabase };
