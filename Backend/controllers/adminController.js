const supabase = require('../db');

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalProblems },
      { count: totalSolves },
      { count: pendingSubmissions },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('problems').select('*', { count: 'exact', head: true }),
      supabase.from('user_problem_assignments').select('*', { count: 'exact', head: true }).eq('status', 'solved'),
      supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const { count: dailyCount } = await supabase
      .from('problems').select('*', { count: 'exact', head: true })
      .eq('is_daily', true).eq('daily_date', today);

    const { data: activeData } = await supabase
      .from('user_problem_assignments').select('user_id');
    const activeUsers = new Set((activeData || []).map(r => r.user_id)).size;

    res.status(200).json({
      metrics: {
        total_users: totalUsers || 0,
        total_problems: totalProblems || 0,
        total_solves: totalSolves || 0,
        active_users: activeUsers,
        daily_problems_count: dailyCount || 0,
        pending_submissions: pendingSubmissions || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users — enriched with solve counts and breakdown
const getAllUsers = async (req, res) => {
  const { search, role } = req.query;
  try {
    let query = supabase.from('user_profiles')
      .select('id, email, full_name, avatar_url, role, score, streak_days, last_active_date, created_at')
      .order('score', { ascending: false });

    if (role && role !== 'all') query = query.eq('role', role);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: users, error } = await query;
    if (error) throw error;

    // Fetch all assignments with problem difficulty to compute per-user solve counts
    const { data: allAssignments } = await supabase
      .from('user_problem_assignments')
      .select('user_id, status, score, problems(difficulty)');

    const statsByUser = {};
    (allAssignments || []).forEach(a => {
      if (!statsByUser[a.user_id]) {
        statsByUser[a.user_id] = { solved_count: 0, assigned_count: 0, easy_solved: 0, medium_solved: 0, hard_solved: 0 };
      }
      if (a.status === 'solved') {
        statsByUser[a.user_id].solved_count++;
        const diff = a.problems?.difficulty;
        if (diff === 'easy') statsByUser[a.user_id].easy_solved++;
        else if (diff === 'medium') statsByUser[a.user_id].medium_solved++;
        else if (diff === 'hard') statsByUser[a.user_id].hard_solved++;
      } else {
        statsByUser[a.user_id].assigned_count++;
      }
    });

    const enriched = (users || []).map(u => ({
      ...u,
      solved_count: statsByUser[u.id]?.solved_count || 0,
      assigned_count: statsByUser[u.id]?.assigned_count || 0,
      easy_solved: statsByUser[u.id]?.easy_solved || 0,
      medium_solved: statsByUser[u.id]?.medium_solved || 0,
      hard_solved: statsByUser[u.id]?.hard_solved || 0,
    }));

    res.status(200).json({ users: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users/:id/activity — detailed problems solved & assigned by specific user
const getUserActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (profileErr || !profile) return res.status(404).json({ error: 'User not found' });

    const { data: assignments } = await supabase
      .from('user_problem_assignments')
      .select('*, problems(*)')
      .eq('user_id', id)
      .order('assigned_at', { ascending: false });

    const { data: submissions } = await supabase
      .from('submissions')
      .select('*, problems(title, difficulty)')
      .eq('user_id', id)
      .order('submitted_at', { ascending: false });

    const solved = (assignments || []).filter(a => a.status === 'solved');
    const inProgress = (assignments || []).filter(a => a.status !== 'solved');

    res.status(200).json({
      user: profile,
      solved_count: solved.length,
      active_count: inProgress.length,
      assignments: assignments || [],
      submissions: submissions || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const { data, error } = await supabase
      .from('user_profiles').update({ role }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.status(200).json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/problems — with per-problem solved count
const getAdminProblems = async (req, res) => {
  const { difficulty, topic, search, is_daily } = req.query;
  try {
    let query = supabase.from('problems')
      .select('*, user_profiles!problems_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);
    if (topic && topic !== 'all') query = query.eq('topic_name', topic);
    if (is_daily === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('is_daily', true).eq('daily_date', today);
    }
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: problems, error } = await query;
    if (error) throw error;

    // Fetch solve counts for all problems
    const { data: solveRecords } = await supabase
      .from('user_problem_assignments')
      .select('problem_id, user_id')
      .eq('status', 'solved');

    const solveCountMap = {};
    (solveRecords || []).forEach(r => {
      solveCountMap[r.problem_id] = (solveCountMap[r.problem_id] || 0) + 1;
    });

    const enriched = (problems || []).map(p => ({
      ...p,
      solved_count: solveCountMap[p.id] || 0,
    }));

    res.status(200).json({ problems: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/problems (single problem)
const createProblem = async (req, res) => {
  const adminId = req.profile.id;
  const { title, description, difficulty, topic_name, tags, constraints, sample_input, sample_output, external_url, is_daily, daily_date } = req.body;

  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    // ── Duplicate check ──────────────────────────────────────────
    const { data: existing } = await supabase
      .from('problems')
      .select('id, title')
      .ilike('title', title.trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: `A problem titled "${existing.title}" already exists. Please use a unique title.`,
        duplicate: true,
      });
    }
    // ─────────────────────────────────────────────────────────────

    const payload = {
      title: title.trim(), description, difficulty: difficulty || 'easy',
      topic_name: topic_name || 'General',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      constraints, sample_input, sample_output, external_url,
      is_daily: is_daily || false,
      daily_date: is_daily ? (daily_date || new Date().toISOString().split('T')[0]) : null,
      created_by: adminId,
    };

    const { data, error } = await supabase.from('problems').insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ problem: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/problems/bulk (multiple problems at once)
const createBulkProblems = async (req, res) => {
  const adminId = req.profile.id;
  const { problems } = req.body;

  if (!Array.isArray(problems) || problems.length === 0) {
    return res.status(400).json({ error: 'An array of problems is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const payloads = problems.map(p => ({
      title: p.title?.trim(),
      description: p.description || '',
      difficulty: p.difficulty || 'easy',
      topic_name: p.topic_name || 'General',
      tags: Array.isArray(p.tags) ? p.tags : (p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      constraints: p.constraints || '',
      sample_input: p.sample_input || '',
      sample_output: p.sample_output || '',
      external_url: p.external_url || '',
      is_daily: !!p.is_daily,
      daily_date: p.is_daily ? (p.daily_date || today) : null,
      created_by: adminId,
    })).filter(p => !!p.title);

    if (payloads.length === 0) {
      return res.status(400).json({ error: 'No valid problems with titles provided' });
    }

    // ── Duplicate check: fetch all existing titles that match ────
    const incomingTitles = payloads.map(p => p.title.toLowerCase());
    const { data: existingProblems } = await supabase
      .from('problems')
      .select('title')
      .in('title', payloads.map(p => p.title));

    const existingTitlesSet = new Set(
      (existingProblems || []).map(p => p.title.toLowerCase())
    );

    const newPayloads = payloads.filter(p => !existingTitlesSet.has(p.title.toLowerCase()));
    const skippedTitles = payloads.filter(p => existingTitlesSet.has(p.title.toLowerCase())).map(p => p.title);

    if (newPayloads.length === 0) {
      return res.status(409).json({
        error: `All ${skippedTitles.length} problem(s) already exist in the database.`,
        duplicates: skippedTitles,
        created: 0,
      });
    }
    // ─────────────────────────────────────────────────────────────

    const { data, error } = await supabase.from('problems').insert(newPayloads).select();
    if (error) throw error;

    const message = skippedTitles.length > 0
      ? `Created ${data.length} new problem(s). Skipped ${skippedTitles.length} duplicate(s): ${skippedTitles.join(', ')}`
      : `Successfully created ${data.length} problems`;

    res.status(201).json({ message, problems: data, count: data.length, skipped: skippedTitles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/problems/:id
const updateProblem = async (req, res) => {
  const { title, description, difficulty, topic_name, tags, constraints, sample_input, sample_output, external_url, is_daily, daily_date } = req.body;

  try {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (topic_name !== undefined) updates.topic_name = topic_name;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (constraints !== undefined) updates.constraints = constraints;
    if (sample_input !== undefined) updates.sample_input = sample_input;
    if (sample_output !== undefined) updates.sample_output = sample_output;
    if (external_url !== undefined) updates.external_url = external_url;
    if (is_daily !== undefined) {
      updates.is_daily = is_daily;
      updates.daily_date = is_daily ? (daily_date || new Date().toISOString().split('T')[0]) : null;
    }

    const { data, error } = await supabase
      .from('problems').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.status(200).json({ problem: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/problems/:id
const deleteProblem = async (req, res) => {
  try {
    const { error } = await supabase.from('problems').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ message: 'Problem deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/problems/:id/daily — toggle daily flag
const toggleDailyProblem = async (req, res) => {
  const { is_daily, daily_date } = req.body;
  const date = daily_date || new Date().toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from('problems')
      .update({ is_daily, daily_date: is_daily ? date : null })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.status(200).json({ problem: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAdminStats, getAllUsers, getUserActivity, updateUserRole,
  getAdminProblems, createProblem, createBulkProblems, updateProblem, deleteProblem, toggleDailyProblem,
};
