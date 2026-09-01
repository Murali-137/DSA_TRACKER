const supabase = require('../db');

// POST /api/user/submissions
const createSubmission = async (req, res) => {
  const userId = req.profile.id;
  const { problem_id, code, language = 'javascript', proof_url } = req.body;

  if (!problem_id) return res.status(400).json({ error: 'problem_id required' });

  try {
    const { data: submission, error } = await supabase
      .from('submissions')
      .insert([{ user_id: userId, problem_id, code, language, proof_url, status: 'pending' }])
      .select().single();
    if (error) throw error;

    // Check existing assignment so we don't wipe 'solved' status or existing score
    const { data: existingAssign } = await supabase
      .from('user_problem_assignments')
      .select('status, score')
      .eq('user_id', userId)
      .eq('problem_id', problem_id)
      .maybeSingle();

    if (!existingAssign) {
      await supabase.from('user_problem_assignments').insert([{
        user_id: userId,
        problem_id,
        status: 'submitted',
      }]);
    } else if (existingAssign.status !== 'solved') {
      await supabase.from('user_problem_assignments').update({
        status: 'submitted',
      }).eq('user_id', userId).eq('problem_id', problem_id);
    }
    // If it was already 'solved', keep it 'solved' and preserve the score!

    const { data: problem } = await supabase.from('problems').select('title, difficulty').eq('id', problem_id).single();
    const { data: user } = await supabase.from('user_profiles').select('full_name, email').eq('id', userId).single();

    const { data: admins } = await supabase.from('user_profiles').select('id').eq('role', 'admin');
    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        admin_id: admin.id,
        user_id: userId,
        problem_id,
        submission_id: submission.id,
        type: 'submission',
        message: `${user?.full_name || user?.email || 'A user'} submitted a solution for "${problem?.title || 'a problem'}" (${problem?.difficulty || ''})`,
        is_read: false,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.status(201).json({ message: 'Submission received', submission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/user/submissions
const getUserSubmissions = async (req, res) => {
  const userId = req.profile.id;
  const { problem_id } = req.query;
  try {
    let query = supabase
      .from('submissions')
      .select('*, problems(title, difficulty)')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    if (problem_id) query = query.eq('problem_id', problem_id);
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ submissions: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/notifications
const getAdminNotifications = async (req, res) => {
  const adminId = req.profile.id;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, user_profiles!notifications_user_id_fkey(full_name, email, avatar_url), problems(title, difficulty)')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const unreadCount = (data || []).filter(n => !n.is_read).length;
    res.status(200).json({ notifications: data || [], unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id);
    res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('admin_id', req.profile.id);
    res.status(200).json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/submissions/:id
const getSubmissionDetail = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, user_profiles!submissions_user_id_fkey(full_name, email, avatar_url), problems(title, difficulty, topic_name)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Submission not found' });
    res.status(200).json({ submission: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/submissions/:id/score
const scoreSubmission = async (req, res) => {
  const { score, status = 'accepted', feedback } = req.body;
  try {
    const { data: sub } = await supabase.from('submissions').select('user_id, problem_id, score').eq('id', req.params.id).single();
    await supabase.from('submissions').update({ score, status, agent_feedback: feedback }).eq('id', req.params.id);
    if (status === 'accepted') {
      await supabase.from('user_problem_assignments').update({
        score, status: 'solved', solved_at: new Date().toISOString(),
      }).eq('user_id', sub.user_id).eq('problem_id', sub.problem_id);
      
      // Recalculate true total score for the user
      const { data: allSolved } = await supabase
        .from('user_problem_assignments')
        .select('score')
        .eq('user_id', sub.user_id)
        .eq('status', 'solved');
      const trueTotal = (allSolved || []).reduce((acc, a) => acc + (Number(a.score) || 0), 0);
      await supabase.from('user_profiles').update({ score: trueTotal }).eq('id', sub.user_id);
    }
    res.status(200).json({ message: 'Score updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ─── POST /api/user/submissions/:id/analyze ────────────────────────────────
// Calls Python LangGraph/Groq agent to evaluate the submission
const analyzeSubmission = async (req, res) => {
  const userId = req.profile.id;
  const submissionId = req.params.id;

  // Max points per difficulty level
  const DIFF_MAX = { easy: 3, medium: 6, hard: 10 };

  try {
    // 1. Fetch submission + problem details
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .select('*, problems(title, description, difficulty, sample_input, sample_output, constraints)')
      .eq('id', submissionId)
      .eq('user_id', userId)
      .single();

    if (subErr || !sub) return res.status(404).json({ error: 'Submission not found' });

    const problem = sub.problems;
    const difficulty = (problem?.difficulty || 'medium').toLowerCase();
    const maxPoints = DIFF_MAX[difficulty] || 6;

    // If this exact submission was already evaluated, return cached result
    if (sub.status === 'accepted') {
      return res.status(200).json({
        score: sub.score,
        quality_score: sub.score,
        max_score: maxPoints,
        feedback: sub.agent_feedback || 'Already evaluated.',
        already_scored: true,
        score_updated: false,
      });
    }

    // 2. Get existing assignment record BEFORE running agent
    //    to know if this problem was already solved and what score was previously achieved
    const { data: existingAssign } = await supabase
      .from('user_problem_assignments')
      .select('status, score')
      .eq('user_id', userId)
      .eq('problem_id', sub.problem_id)
      .maybeSingle();

    const alreadySolved = existingAssign?.status === 'solved';
    const oldScore = (alreadySolved && typeof existingAssign?.score === 'number') ? Number(existingAssign.score) : 0;

    // 3. Call Python agent — returns quality score 0-10
    let qualityScore = 0;
    let agentFeedback = 'Code evaluated.';

    try {
      const agentUrl = (process.env.AGENT_API_URL || 'http://localhost:5001').replace(/\/$/, '');
      const agentRes = await fetch(`${agentUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sub.code,
          language: sub.language || 'python',
          problem_title: problem?.title || 'Unknown Problem',
          problem_description: problem?.description || '',
          difficulty,
          sample_input: problem?.sample_input || '',
          sample_output: problem?.sample_output || '',
          constraints: problem?.constraints || '',
        }),
      });

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        qualityScore = Number(agentData.score) || 0;
        agentFeedback = agentData.feedback;
      }
    } catch (agentErr) {
      console.warn('[Agent Unavailable] Falling back:', agentErr.message);
      qualityScore = 6;
      agentFeedback = 'Solution received! Agent evaluation unavailable — default score assigned.';
    }

    // 4. Scale quality (0-10) → actual earned points based on difficulty
    const finalScore = Math.round((qualityScore / 10) * maxPoints);

    // 5. Update this submission record
    await supabase.from('submissions').update({
      score: finalScore,
      agent_feedback: agentFeedback,
      status: 'accepted',
    }).eq('id', submissionId);

    // 6. ── Score Update Logic ─────────────────────────────────────────────────
    //
    //   Case A — First solve (never solved before):
    //     → Mark assignment as solved with finalScore
    //     → Add finalScore to profile
    //
    //   Case B — Re-submission, new score BETTER than old score:
    //     → Update assignment with finalScore
    //     → Add difference (finalScore - oldScore) to profile
    //
    //   Case C — Re-submission, new score SAME or WORSE:
    //     → Keep existing best assignment score
    //     → DO NOT add any points to profile
    //
    // ────────────────────────────────────────────────────────────────────────────

    let scoreUpdated = false;
    let scoreDelta = 0;

    if (!alreadySolved) {
      // Case A: First solve
      scoreDelta = finalScore;
      scoreUpdated = true;

      await supabase.from('user_problem_assignments').upsert({
        user_id: userId,
        problem_id: sub.problem_id,
        status: 'solved',
        score: finalScore,
        solved_at: new Date().toISOString(),
      }, { onConflict: 'user_id,problem_id' });

    } else if (finalScore > oldScore) {
      // Case B: Improved score on resubmission
      scoreDelta = finalScore - oldScore;
      scoreUpdated = true;

      await supabase.from('user_problem_assignments').update({
        score: finalScore,
        solved_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('problem_id', sub.problem_id);

    } else {
      // Case C: Same or lower score — retain best score
      scoreDelta = 0;
      scoreUpdated = false;
    }

    // 7. Accurately recalculate total score from user's solved assignments
    const { data: allSolved } = await supabase
      .from('user_problem_assignments')
      .select('score')
      .eq('user_id', userId)
      .eq('status', 'solved');

    const trueTotalScore = (allSolved || []).reduce((acc, a) => acc + (Number(a.score) || 0), 0);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('streak_days, last_active_date')
      .eq('id', userId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    let newStreak = profile?.streak_days || 0;
    if (scoreUpdated && profile?.last_active_date !== today) {
      newStreak += 1;
    }

    await supabase.from('user_profiles').update({
      score: trueTotalScore,
      streak_days: newStreak,
      last_active_date: today,
    }).eq('id', userId);

    res.status(200).json({
      score: finalScore,
      quality_score: qualityScore,
      max_score: maxPoints,
      feedback: agentFeedback,
      already_scored: false,
      score_updated: scoreUpdated,
      score_delta: scoreDelta,   // points added to total this round
      old_score: oldScore,
      total_score: trueTotalScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createSubmission,
  getUserSubmissions,
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSubmissionDetail,
  scoreSubmission,
  analyzeSubmission,
};
