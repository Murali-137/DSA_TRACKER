const supabase = require('../db');

// POST /api/signup & /api/auth/sync
const syncUser = async (req, res) => {
  const { id, email, full_name, avatar_url } = req.body;
  if (!id || !email) return res.status(400).json({ error: 'Missing id or email' });

  try {
    const { data: existing } = await supabase
      .from('user_profiles').select('*').eq('id', id).maybeSingle();

    if (existing) {
      const updates = {};
      // Preserve custom profile name & avatar
      if (!existing.full_name && full_name) updates.full_name = full_name;
      if (!existing.avatar_url && avatar_url) updates.avatar_url = avatar_url;

      if (Object.keys(updates).length > 0) {
        const { data: updated } = await supabase
          .from('user_profiles').update(updates).eq('id', id).select().single();
        return res.status(200).json({ user: updated || existing });
      }
      return res.status(200).json({ user: existing });
    }

    const defaultAvatar = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name || email)}&backgroundColor=7c3aed&textColor=fff`;

    // EVERYONE registers strictly as 'user'. Admin role can only be assigned by existing admin.
    const { data, error } = await supabase.from('user_profiles').insert([{
      id,
      email,
      full_name: full_name || email.split('@')[0],
      avatar_url: defaultAvatar,
      role: 'user',
      score: 0,
      streak_days: 0,
    }]).select().single();

    if (error) throw error;
    res.status(201).json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({ user: req.profile });
};

// PUT /api/user/profile
const updateProfile = async (req, res) => {
  const { full_name, avatar_url } = req.body;
  try {
    const updates = {};
    if (full_name !== undefined && full_name.trim() !== '') updates.full_name = full_name.trim();
    if (avatar_url !== undefined && avatar_url.trim() !== '') updates.avatar_url = avatar_url.trim();

    const { data, error } = await supabase
      .from('user_profiles').update(updates).eq('id', req.profile.id).select().single();
    if (error) throw error;
    res.status(200).json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { syncUser, getMe, updateProfile };
