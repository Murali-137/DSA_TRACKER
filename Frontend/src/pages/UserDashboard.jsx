import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabase';
import { api } from '../api';
import Sidebar from '../components/Sidebar';
import ProfileMenu from '../components/ProfileMenu';
import CodeEditor from '../components/CodeEditor';
import ProblemDetailModal from '../components/ProblemDetailModal';
import {
  CalendarIcon, PinIcon, CheckCircleIcon, TrophyIcon, SettingsIcon, BookOpenIcon,
  SearchIcon, FlameIcon, ExternalLinkIcon, CodeIcon, CheckIcon, XIcon, EyeIcon, FilterIcon
} from '../components/Icons';

const SIDEBAR_ITEMS = [
  { key: 'all',         label: 'All Problems',      icon: <BookOpenIcon size={17} /> },
  { key: 'daily',       label: "Today's Daily",     icon: <CalendarIcon size={17} /> },
  { key: 'assigned',    label: 'My Assignments',    icon: <PinIcon size={17} /> },
  { key: 'solved',      label: 'Solved Problems',   icon: <CheckCircleIcon size={17} /> },
  { key: 'leaderboard', label: 'Leaderboard',       icon: <TrophyIcon size={17} /> },
  { key: 'settings',    label: 'Settings',          icon: <SettingsIcon size={17} /> },
];

const DIFF_SCORE = { easy: 3, medium: 6, hard: 10 };
const DIFF_COLOR = { easy: '#4ade80', medium: '#fb923c', hard: '#f87171' };
const TOPICS = [
  'all', 'Arrays & Hashing', 'Two Pointers', 'Stack', 'Binary Search', 'Sliding Window',
  'Linked List', 'Trees', 'Tries', 'Heap', 'Graphs', 'Dynamic Programming', 'Greedy', 'Backtracking', 'General'
];

const MONTHS = [
  { val: '0', label: 'January' },
  { val: '1', label: 'February' },
  { val: '2', label: 'March' },
  { val: '3', label: 'April' },
  { val: '4', label: 'May' },
  { val: '5', label: 'June' },
  { val: '6', label: 'July' },
  { val: '7', label: 'August' },
  { val: '8', label: 'September' },
  { val: '9', label: 'October' },
  { val: '10', label: 'November' },
  { val: '11', label: 'December' },
];

const YEARS = ['2025', '2024'];

function ProblemCard({ problem, onAssign, onUnassign, onOpenEditor, onViewDetails, busy }) {
  const isSolved = problem.is_solved || problem.user_status === 'solved';
  const isAssigned = problem.is_assigned || !!problem.user_status;

  return (
    <div className={`problem-card ${isSolved ? 'solved' : ''}`} style={{ opacity: busy ? 0.7 : 1 }}>
      {/* Clickable Problem Info */}
      <div
        onClick={() => onViewDetails(problem)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isSolved ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.12)',
          border: `1px solid ${isSolved ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.25)'}`,
          fontSize: '1.15rem',
        }}>
          {isSolved ? '✅' : '🧩'}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.96rem', color: '#f1e8ff' }}>{problem.title}</span>
            <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
            {isSolved && (
              <span className="score-chip">
                ⭐ {problem.user_score || DIFF_SCORE[problem.difficulty] || 3} / {problem.max_score || DIFF_SCORE[problem.difficulty]} pts
              </span>
            )}
            {problem.is_daily && (
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '8px', background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
                📅 Daily
              </span>
            )}
          </div>

          {problem.topic_name && (
            <div style={{ fontSize: '0.78rem', color: '#a855f7', marginTop: '3px', fontWeight: 500 }}>
              📂 {problem.topic_name}
            </div>
          )}

          {problem.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
              {problem.tags.slice(0, 4).map(tag => (
                <span key={tag} style={{
                  fontSize: '0.7rem',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  background: 'rgba(168,85,247,0.1)',
                  color: '#c084fc',
                  border: '1px solid rgba(168,85,247,0.2)'
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
        <button
          className="btn-ghost"
          style={{ padding: '6px 11px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onClick={() => onViewDetails(problem)}
          title="View Problem Description"
        >
          <EyeIcon size={14} /> Details
        </button>

        {problem.external_url && (
          <a
            href={problem.external_url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.78rem', textDecoration: 'none' }}
            title="Open LeetCode / External Link"
          >
            <ExternalLinkIcon size={13} />
          </a>
        )}

        {!isSolved && (
          <>
            {!isAssigned ? (
              <button
                className="btn-ghost"
                style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' }}
                onClick={() => onAssign(problem)}
                disabled={busy}
              >
                + Assign
              </button>
            ) : (
              <>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => onUnassign(problem)}
                  disabled={busy}
                >
                  <XIcon size={13} /> Unassign
                </button>

                <button
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                  onClick={() => onOpenEditor(problem)}
                  disabled={busy}
                >
                  <CodeIcon size={13} /> Solve
                </button>
              </>
            )}
          </>
          
        )}

        {isSolved && (
          <button
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' }}
            onClick={() => onOpenEditor(problem)}
          >
            <CodeIcon size={13} /> Code
          </button>
        )}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [problems, setProblems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [stats, setStats] = useState({
    total_score: 0,
    streak_days: 0,
    active_assignments: 0,
    completed_tasks: 0,
    solved_breakdown: { easy: 0, medium: 0, hard: 0 }
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [busyId, setBusyId] = useState(null);

  // ─── Extended Filters State ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState('all');       // 'all' | 'easy' | 'medium' | 'hard'
  const [assignFilter, setAssignFilter] = useState('all');   // 'all' | 'assigned' | 'unassigned'
  const [solveFilter, setSolveFilter] = useState('all');     // 'all' | 'solved' | 'unsolved'
  const [topicFilter, setTopicFilter] = useState('all');     // 'all' | topic_name
  const [timeFilter, setTimeFilter] = useState('all');       // 'all' | 'today' | 'last_7_days' | 'last_10_days' | 'last_month' | 'this_year' | 'custom_month' | 'custom_year'
  const [selectedMonth, setSelectedMonth] = useState('7');   // '0'..'11'
  const [selectedYear, setSelectedYear] = useState('2026');

  const [detailProblem, setDetailProblem] = useState(null);
  const [codeEditorProblem, setCodeEditorProblem] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ full_name: '', avatar_url: '' });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ─── Session init ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { navigate('/auth', { replace: true }); return; }

        let userRole = null;
        let fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
        let avatarUrl = session.user.user_metadata?.avatar_url;

        try {
          const { data: meData } = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/me`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
          );
          if (meData?.user) {
            userRole = meData.user.role;
            if (meData.user.full_name) fullName = meData.user.full_name;
            if (meData.user.avatar_url) avatarUrl = meData.user.avatar_url;
          }
        } catch {
          const { data: p } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (p?.role) {
            userRole = p.role;
            if (p.full_name) fullName = p.full_name;
            if (p.avatar_url) avatarUrl = p.avatar_url;
          }
        }

        if (!userRole) userRole = session.user.user_metadata?.role || 'user';

        const u = {
          id: session.user.id,
          email: session.user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: userRole,
        };
        setUser(u);
        setSettingsForm({ full_name: u.full_name || '', avatar_url: u.avatar_url || '' });
      } catch {
        navigate('/auth', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  // ─── Fetch data ────────────────────────────────────────────────
  const fetchProblems = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      let res;
      if (activeTab === 'all') {
        res = await api.get('/problems');
        setProblems(res.data.problems || []);
      } else if (activeTab === 'daily') {
        res = await api.get('/problems/daily');
        setProblems(res.data.all_daily || []);
      } else if (activeTab === 'assigned') {
        res = await api.get('/user/problems', { params: { status: 'assigned' } });
        setProblems(res.data.problems || []);
      } else if (activeTab === 'solved') {
        res = await api.get('/user/problems', { params: { status: 'solved' } });
        setProblems(res.data.problems || []);
      }
    } catch (err) {
      console.warn('Fetch problems error:', err.message);
    } finally {
      setDataLoading(false);
    }
  }, [user, activeTab]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/user/stats');
      if (res.data.stats) setStats(res.data.stats);
    } catch {}
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get('/leaderboard');
      setLeaderboard(res.data.leaderboard || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (user && activeTab !== 'settings') {
      if (activeTab === 'leaderboard') {
        fetchLeaderboard();
      } else {
        fetchProblems();
      }
      fetchStats();
    }
  }, [user, activeTab, fetchProblems, fetchStats, fetchLeaderboard]);

  // ─── Reset All Filters ─────────────────────────────────────────
  const resetFilters = () => {
    setSearchQuery('');
    setDiffFilter('all');
    setAssignFilter('all');
    setSolveFilter('all');
    setTopicFilter('all');
    setTimeFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || diffFilter !== 'all' || assignFilter !== 'all' || solveFilter !== 'all' || topicFilter !== 'all' || timeFilter !== 'all';

  // ─── Actions ───────────────────────────────────────────────────
  const withBusy = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
      await fetchProblems();
      await fetchStats();
      if (detailProblem && detailProblem.id === id) {
        const { data: updated } = await api.get(`/problems/${id}`);
        if (updated?.problem) setDetailProblem(updated.problem);
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = p => withBusy(p.id, () => api.post(`/user/problems/${p.id}/assign`));
  const handleUnassign = p => withBusy(p.id, () => api.delete(`/user/problems/${p.id}/unassign`));
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  const handleSettingsSave = async () => {
    try {
      const { data } = await api.put('/user/profile', settingsForm);
      if (data?.user) {
        setUser(prev => ({ ...prev, ...data.user }));
        setSettingsForm({
          full_name: data.user.full_name || '',
          avatar_url: data.user.avatar_url || '',
        });
      }
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // ─── Multi-Criteria Filtering Logic ────────────────────────────
  const filtered = problems.filter(p => {
    // 1. Search Query (Title, Description, Tags)
    const matchSearch = !searchQuery ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    // 2. Difficulty
    const matchDiff = diffFilter === 'all' || p.difficulty === diffFilter;

    // 3. Topic
    const matchTopic = topicFilter === 'all' || p.topic_name === topicFilter;

    // 4. Assignment Status (Assigned vs Unassigned)
    let matchAssign = true;
    if (assignFilter === 'assigned') matchAssign = !!p.is_assigned;
    else if (assignFilter === 'unassigned') matchAssign = !p.is_assigned;

    // 5. Solve Status (Solved vs Unsolved)
    let matchSolve = true;
    if (solveFilter === 'solved') matchSolve = !!p.is_solved;
    else if (solveFilter === 'unsolved') matchSolve = !p.is_solved;

    // 6. Timeframe / Date Filter
    let matchTime = true;
    if (timeFilter !== 'all') {
      const probDate = new Date(p.daily_date || p.created_at);
      if (!isNaN(probDate.getTime())) {
        const now = new Date();
        const diffTime = now.getTime() - probDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (timeFilter === 'today') {
          matchTime = probDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
        } else if (timeFilter === 'last_7_days') {
          matchTime = diffDays >= 0 && diffDays <= 7;
        } else if (timeFilter === 'last_10_days') {
          matchTime = diffDays >= 0 && diffDays <= 10;
        } else if (timeFilter === 'last_month') {
          matchTime = diffDays >= 0 && diffDays <= 30;
        } else if (timeFilter === 'this_year') {
          matchTime = probDate.getFullYear() === now.getFullYear();
        } else if (timeFilter === 'custom_month') {
          matchTime = probDate.getMonth() === parseInt(selectedMonth, 10);
        } else if (timeFilter === 'custom_year') {
          matchTime = probDate.getFullYear() === parseInt(selectedYear, 10);
        }
      }
    }

    return matchSearch && matchDiff && matchTopic && matchAssign && matchSolve && matchTime;
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07030f' }}>
      <div style={{ textAlign: 'center', color: '#a78bca' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
        Loading your dashboard...
      </div>
    </div>
  );

  return (
    <div className="dt-layout" style={{ position: 'relative' }}>
      {/* Ambient Glow */}
      <div className="ambient-glow-wrapper">
        <div className="glow-orb glow-purple-orb" />
        <div className="glow-orb glow-orange-orb" />
        <div className="glow-orb glow-green-orb" />
      </div>

      <Sidebar items={SIDEBAR_ITEMS} activeItem={activeTab} onSelect={setActiveTab} accent="purple" />

      <div className="dt-main" style={{ position: 'relative', zIndex: 1 }}>
        {/* Topbar */}
        <div className="dt-topbar">
          <h2>{SIDEBAR_ITEMS.find(i => i.key === activeTab)?.label}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {stats.streak_days > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '20px',
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)',
                fontSize: '0.82rem', color: '#fb923c', fontWeight: 600,
              }}>
                <FlameIcon size={15} /> {stats.streak_days}d streak
              </div>
            )}
            {user && (
              <ProfileMenu {...user} score={stats.total_score} onLogout={handleLogout} />
            )}
          </div>
        </div>

        <div className="dt-content">
          {/* Stats Cards Row */}
          {activeTab !== 'settings' && activeTab !== 'leaderboard' && (
            <div className="stat-cards-grid">
              {[
                { label: 'Total Score', value: stats.total_score, icon: '⭐', color: '#a855f7' },
                { label: 'Problems Solved', value: stats.completed_tasks, icon: '✅', color: '#22c55e' },
                { label: 'In Progress', value: stats.active_assignments, icon: '📌', color: '#f97316' },
                { label: 'Current Streak', value: `${stats.streak_days}d`, icon: '🔥', color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── ADVANCED MULTI-FILTER SUITE ─────────────────────────── */}
          {['all', 'daily', 'assigned', 'solved'].includes(activeTab) && (
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Row 1: Search Bar + Filter Status + Reset Button */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <SearchIcon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c3aed' }} />
                  <input
                    className="glass-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search by title, description, tags..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#a78bca' }}>
                    Showing <strong>{filtered.length}</strong> of {problems.length} problems
                  </span>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                      <XIcon size={12} /> Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Difficulty Pills + Topic Dropdown */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Difficulty */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase', marginRight: '2px' }}>Difficulty:</span>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'easy', label: '🟢 Easy' },
                    { key: 'medium', label: '🟠 Medium' },
                    { key: 'hard', label: '🔴 Hard' },
                  ].map(d => (
                    <button
                      key={d.key}
                      onClick={() => setDiffFilter(d.key)}
                      style={{
                        padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                        border: diffFilter === d.key ? `1px solid ${DIFF_COLOR[d.key] || '#a855f7'}` : '1px solid rgba(168,85,247,0.2)',
                        background: diffFilter === d.key ? `${DIFF_COLOR[d.key] || '#a855f7'}25` : 'transparent',
                        color: diffFilter === d.key ? (DIFF_COLOR[d.key] || '#e9d5ff') : '#a78bca',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Topic Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Topic:</span>
                  <select
                    className="glass-input"
                    style={{ width: 'auto', minWidth: 150, padding: '7px 12px', fontSize: '0.82rem' }}
                    value={topicFilter}
                    onChange={e => setTopicFilter(e.target.value)}
                  >
                    <option value="all">All Topics</option>
                    {TOPICS.filter(t => t !== 'all').map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Assignment Status + Solve Status + Timeframe Range */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(168,85,247,0.1)', paddingTop: '0.75rem' }}>

                {/* Assignment Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Assignment:</span>
                  <select
                    className="glass-input"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                    value={assignFilter}
                    onChange={e => setAssignFilter(e.target.value)}
                  >
                    <option value="all">All (Assigned & Unassigned)</option>
                    <option value="assigned">📌 Assigned Only</option>
                    <option value="unassigned">⚪ Unassigned Only</option>
                  </select>
                </div>

                {/* Solve Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Solve Status:</span>
                  <select
                    className="glass-input"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                    value={solveFilter}
                    onChange={e => setSolveFilter(e.target.value)}
                  >
                    <option value="all">All (Solved & Unsolved)</option>
                    <option value="solved">✅ Solved Only</option>
                    <option value="unsolved">⏳ Unsolved Only</option>
                  </select>
                </div>

                {/* Time Range Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Timeframe:</span>
                  <select
                    className="glass-input"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                    value={timeFilter}
                    onChange={e => setTimeFilter(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">📅 Today</option>
                    <option value="last_7_days">⚡ Last Week</option>
                    <option value="last_10_days">🗓️ Last 10 Days</option>
                    <option value="last_month">🗓️ Last 30 Days</option>
                    <option value="this_year">📆 Current Year</option>
                    <option value="custom_month">📆 Month...</option>
                    <option value="custom_year">📆 Year...</option>
                  </select>

                  {/* Dynamic Sub-filter: Month Picker */}
                  {timeFilter === 'custom_month' && (
                    <select
                      className="glass-input"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                    >
                      {MONTHS.map(m => (
                        <option key={m.val} value={m.val}>{m.label}</option>
                      ))}
                    </select>
                  )}

                  {/* Dynamic Sub-filter: Year Picker */}
                  {timeFilter === 'custom_year' && (
                    <select
                      className="glass-input"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                    >
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* Problem List */}
          {['all', 'daily', 'assigned', 'solved'].includes(activeTab) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dataLoading ? (
                <div className="empty-state">
                  <div className="empty-icon">⏳</div>
                  Loading problems...
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">{activeTab === 'all' ? '📚' : activeTab === 'daily' ? '📅' : activeTab === 'solved' ? '🏆' : '📌'}</div>
                  {hasActiveFilters ? (
                    <div>
                      <div>No problems match your current combination of filters.</div>
                      <button onClick={resetFilters} className="btn-primary" style={{ marginTop: '1rem', fontSize: '0.84rem' }}>
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    activeTab === 'all' ? 'No problems found in library.' :
                    activeTab === 'daily' ? 'No daily problems posted for today yet. Explore "All Problems" to start practicing!' :
                    activeTab === 'solved' ? 'No solved problems yet. Assign a problem and submit your code!' :
                    'No active assignments. Browse "All Problems" or "Today\'s Daily" to assign one!'
                  )}
                </div>
              ) : filtered.map(p => (
                <ProblemCard
                  key={p.id}
                  problem={p}
                  busy={busyId === p.id}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                  onOpenEditor={setCodeEditorProblem}
                  onViewDetails={setDetailProblem}
                />
              ))}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.88rem', color: '#a78bca', marginBottom: '4px' }}>
                🏆 Global Leaderboard — Rank based on problem solves & scores
              </div>

              {leaderboard.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏆</div>
                  No scores recorded yet. Be the first to solve a problem!
                </div>
              ) : leaderboard.map((u, i) => (
                <div key={u.id} className={`leaderboard-row top-${i < 3 ? i + 1 : ''}`}>
                  <div className="lb-rank" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#6b5a87' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>

                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="lb-avatar" />
                  ) : (
                    <div className="lb-avatar" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg,#a855f7,#f97316)',
                      fontSize: '0.8rem', fontWeight: 700, color: '#fff'
                    }}>
                      {(u.full_name || u.email || 'U')[0].toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lb-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{u.full_name || u.email?.split('@')[0] || 'Anonymous'}</span>
                      {u.role === 'admin' && (
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Admin</span>
                      )}
                      {u.id === user?.id && (
                        <span className="badge badge-easy" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>You</span>
                      )}
                    </div>
                    {u.streak_days > 0 && (
                      <div style={{ fontSize: '0.74rem', color: '#fb923c', marginTop: '2px' }}>
                        🔥 {u.streak_days} days streak
                      </div>
                    )}
                  </div>

                  <span className="lb-score">{u.score || 0} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: 520 }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#f1e8ff', fontSize: '1.05rem', fontWeight: 700 }}>
                Profile Settings
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-field">
                  <label className="form-label">Full Name</label>
                  <input
                    className="glass-input"
                    value={settingsForm.full_name}
                    onChange={e => setSettingsForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Avatar Image URL</label>
                  <input
                    className="glass-input"
                    type="url"
                    value={settingsForm.avatar_url}
                    onChange={e => setSettingsForm(f => ({ ...f, avatar_url: e.target.value }))}
                    placeholder="https://example.com/avatar.png"
                  />
                </div>

                <div style={{ fontSize: '0.78rem', color: '#6b5a87' }}>
                  Email: <strong style={{ color: '#a78bca' }}>{user.email}</strong> (managed by Supabase)
                </div>

                <button
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', minWidth: 140 }}
                  onClick={handleSettingsSave}
                >
                  {settingsSaved ? '✅ Saved Successfully!' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Problem Detail Modal */}
      {detailProblem && (
        <ProblemDetailModal
          problem={detailProblem}
          onClose={() => setDetailProblem(null)}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onOpenEditor={(p) => {
            setDetailProblem(null);
            setCodeEditorProblem(p);
          }}
          busy={busyId === detailProblem?.id}
        />
      )}

      {/* Monaco Code Editor Modal */}
      {codeEditorProblem && (
        <CodeEditor
          problem={codeEditorProblem}
          onClose={() => setCodeEditorProblem(null)}
          onSubmitted={() => {
            fetchProblems();
            fetchStats();
            fetchLeaderboard();
          }}
        />
      )}
    </div>
  );
}
