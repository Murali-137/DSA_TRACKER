const supabase = require('../db');

const DIFFICULTY_SCORE = { easy: 3, medium: 6, hard: 10 };

// ─── 1. GET /api/problems ───────────────────────────────────────────────────
const getProblems = async (req, res) => {
  const userId = req.profile?.id;
  const { difficulty, topic, search, is_daily } = req.query;

  try {
    let query = supabase.from('problems').select('*').order('created_at', { ascending: false });
    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);
    if (topic && topic !== 'all') query = query.eq('topic_name', topic);
    if (is_daily === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('is_daily', true).eq('daily_date', today);
    }
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: problems, error } = await query;
    if (error) throw error;

    if (!userId || !problems?.length) {
      return res.status(200).json({ problems: problems || [], count: problems?.length || 0 });
    }

    const { data: assignments } = await supabase
      .from('user_problem_assignments')
      .select('problem_id, status, score')
      .eq('user_id', userId);

    const assignmentMap = {};
    (assignments || []).forEach(a => { assignmentMap[a.problem_id] = a; });

    const enriched = problems.map(p => ({
      ...p,
      max_score: DIFFICULTY_SCORE[p.difficulty] || 3,
      is_assigned: !!assignmentMap[p.id],
      is_solved: assignmentMap[p.id]?.status === 'solved',
      user_status: assignmentMap[p.id]?.status || null,
      user_score: assignmentMap[p.id]?.score || 0,
    }));

    res.status(200).json({ problems: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 2. GET /api/problems/daily ────────────────────────────────────────────
const getDailyProblems = async (req, res) => {
  const userId = req.profile?.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: problems, error } = await supabase
      .from('problems')
      .select('*')
      .eq('is_daily', true)
      .eq('daily_date', today)
      .order('difficulty');

    if (error) throw error;

    let enriched = problems || [];
    if (userId && enriched.length > 0) {
      const { data: assignments } = await supabase
        .from('user_problem_assignments')
        .select('problem_id, status, score')
        .eq('user_id', userId)
        .in('problem_id', enriched.map(p => p.id));

      const aMap = {};
      (assignments || []).forEach(a => { aMap[a.problem_id] = a; });

      enriched = enriched.map(p => ({
        ...p,
        max_score: DIFFICULTY_SCORE[p.difficulty] || 3,
        is_assigned: !!aMap[p.id],
        is_solved: aMap[p.id]?.status === 'solved',
        user_status: aMap[p.id]?.status || null,
        user_score: aMap[p.id]?.score || 0,
      }));
    }

    const easy   = enriched.find(p => p.difficulty === 'easy')   || null;
    const medium = enriched.find(p => p.difficulty === 'medium') || null;
    const hard   = enriched.find(p => p.difficulty === 'hard')   || null;

    res.status(200).json({ date: today, daily_set: { easy, medium, hard }, all_daily: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 3. GET /api/problems/:id ──────────────────────────────────────────────
const getProblemById = async (req, res) => {
  const userId = req.profile?.id;
  try {
    const { data: problem, error } = await supabase
      .from('problems').select('*').eq('id', req.params.id).maybeSingle();
    if (error || !problem) return res.status(404).json({ error: 'Problem not found' });

    let userState = { is_assigned: false, is_solved: false, user_status: null, user_score: 0 };
    if (userId) {
      const { data: assignment } = await supabase
        .from('user_problem_assignments')
        .select('status, score')
        .eq('user_id', userId)
        .eq('problem_id', req.params.id)
        .maybeSingle();

      if (assignment) {
        userState = {
          is_assigned: true,
          is_solved: assignment.status === 'solved',
          user_status: assignment.status,
          user_score: assignment.score || 0,
        };
      }
    }

    res.status(200).json({
      problem: {
        ...problem,
        max_score: DIFFICULTY_SCORE[problem.difficulty] || 3,
        ...userState,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 4. POST /api/user/problems/:id/assign ─────────────────────────────────
const assignProblem = async (req, res) => {
  const userId = req.profile.id;
  const problemId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('user_problem_assignments')
      .upsert(
        { user_id: userId, problem_id: problemId, status: 'assigned' },
        { onConflict: 'user_id,problem_id' }
      )
      .select().single();

    if (error) throw error;
    res.status(200).json({ message: 'Problem assigned', assignment: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 5. DELETE /api/user/problems/:id/unassign ─────────────────────────────
const unassignProblem = async (req, res) => {
  const userId = req.profile.id;
  try {
    await supabase.from('user_problem_assignments')
      .delete().eq('user_id', userId).eq('problem_id', req.params.id);
    res.status(200).json({ message: 'Unassigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 6. PATCH /api/user/problems/:id/solve ─────────────────────────────────
const solveProblem = async (req, res) => {
  const userId = req.profile.id;
  const problemId = req.params.id;

  try {
    const { data: problem } = await supabase
      .from('problems').select('difficulty').eq('id', problemId).single();

    const score = DIFFICULTY_SCORE[problem?.difficulty] || 3;

    const { data: existing } = await supabase
      .from('user_problem_assignments')
      .select('status, score').eq('user_id', userId).eq('problem_id', problemId).maybeSingle();

    if (existing?.status === 'solved') {
      return res.status(200).json({ message: 'Already solved', score: existing.score });
    }

    // Upsert assignment as solved
    await supabase.from('user_problem_assignments').upsert({
      user_id: userId,
      problem_id: problemId,
      status: 'solved',
      score,
      solved_at: new Date().toISOString(),
    }, { onConflict: 'user_id,problem_id' });

    // Update user_profiles total score
    const { data: userProfile } = await supabase
      .from('user_profiles').select('score, streak_days, last_active_date').eq('id', userId).single();

    const newTotalScore = (userProfile?.score || 0) + score;
    const today = new Date().toISOString().split('T')[0];
    let newStreak = userProfile?.streak_days || 0;

    if (userProfile?.last_active_date !== today) {
      newStreak = (userProfile?.streak_days || 0) + 1;
    }

    await supabase.from('user_profiles').update({
      score: newTotalScore,
      streak_days: newStreak,
      last_active_date: today,
    }).eq('id', userId);

    res.status(200).json({ message: 'Problem marked solved', score, total_score: newTotalScore, streak_days: newStreak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 7. GET /api/user/problems ─────────────────────────────────────────────
const getUserProblems = async (req, res) => {
  const userId = req.profile.id;
  const { status, difficulty, search } = req.query;

  try {
    let query = supabase
      .from('user_problem_assignments')
      .select('*, problems(*)')
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    // Handle status filtering
    if (status === 'solved') {
      query = query.eq('status', 'solved');
    } else if (status === 'assigned') {
      // In assignments tab, show non-solved (assigned, in_progress, submitted)
      query = query.neq('status', 'solved');
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let problems = (data || [])
      .filter(a => a.problems != null)
      .map(a => ({
        ...a.problems,
        max_score: DIFFICULTY_SCORE[a.problems?.difficulty] || 3,
        user_status: a.status,
        is_assigned: true,
        is_solved: a.status === 'solved',
        user_score: a.score || 0,
        assigned_at: a.assigned_at,
        solved_at: a.solved_at,
      }));

    if (difficulty && difficulty !== 'all')
      problems = problems.filter(p => p.difficulty === difficulty);
    if (search)
      problems = problems.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));

    res.status(200).json({ problems, count: problems.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 8. GET /api/user/stats ────────────────────────────────────────────────
const getUserStats = async (req, res) => {
  const userId = req.profile.id;

  try {
    const { data: profile } = await supabase
      .from('user_profiles').select('score, streak_days').eq('id', userId).single();

    const { data: assignments } = await supabase
      .from('user_problem_assignments')
      .select('status, score, problems(difficulty)')
      .eq('user_id', userId);

    const all = assignments || [];
    const solved = all.filter(a => a.status === 'solved');
    const active = all.filter(a => a.status !== 'solved');

    const breakdown = { easy: 0, medium: 0, hard: 0 };
    solved.forEach(a => { if (a.problems?.difficulty) breakdown[a.problems.difficulty]++; });

    const { count: totalAvailable } = await supabase
      .from('problems').select('*', { count: 'exact', head: true });

    res.status(200).json({
      stats: {
        total_score: profile?.score || 0,
        streak_days: profile?.streak_days || 0,
        active_assignments: active.length,
        completed_tasks: solved.length,
        total_available: totalAvailable || 0,
        solved_breakdown: breakdown,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 9. GET /api/leaderboard ───────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, avatar_url, score, streak_days, role')
      .order('score', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.status(200).json({ leaderboard: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProblems, getDailyProblems, getProblemById,
  assignProblem, unassignProblem, solveProblem,
  getUserProblems, getUserStats, getLeaderboard,
};
