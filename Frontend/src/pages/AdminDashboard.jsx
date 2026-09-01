import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabase';
import { api } from '../api';
import Sidebar from '../components/Sidebar';
import ProfileMenu from '../components/ProfileMenu';
import EditProblemModal from '../components/EditProblemModal';
import UserActivityModal from '../components/UserActivityModal';
import {
  PlusIcon, UsersIcon, BookOpenIcon, SettingsIcon, BellIcon,
  SearchIcon, EditIcon, TrashIcon, CheckIcon, XIcon, EyeIcon, ExternalLinkIcon, TrophyIcon, FilterIcon
} from '../components/Icons';

const DIFF_COLOR = { easy: '#4ade80', medium: '#fb923c', hard: '#f87171' };
const TOPICS = [
  'all', 'Arrays & Hashing', 'Two Pointers', 'Stack', 'Binary Search', 'Sliding Window',
  'Linked List', 'Trees', 'Tries', 'Heap', 'Graphs', 'Dynamic Programming', 'Greedy', 'Backtracking'
];

const createEmptyProblem = () => ({
  title: '',
  difficulty: 'easy',
  description: '',
  topic_name: 'General',
  tags: '',
  constraints: '',
  sample_input: '',
  sample_output: '',
  external_url: '',
  is_daily: false,
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [metrics, setMetrics] = useState({
    total_users: 0, total_problems: 0, total_solves: 0,
    active_users: 0, daily_problems_count: 0, pending_submissions: 0
  });
  const [users, setUsers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Single Post Form
  const [newProblem, setNewProblem] = useState(createEmptyProblem());
  const [postLoading, setPostLoading] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Bulk Post Form
  const [postMode, setPostMode] = useState('single'); // 'single' | 'bulk' | 'json'
  const [bulkProblems, setBulkProblems] = useState([createEmptyProblem(), createEmptyProblem()]);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');

  // Modals
  const [editingProblem, setEditingProblem] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [viewingUserActivityId, setViewingUserActivityId] = useState(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [problemDiffFilter, setProblemDiffFilter] = useState('all'); // 'all' | 'easy' | 'medium' | 'hard' | 'daily'
  const [problemTopicFilter, setProblemTopicFilter] = useState('all');

  // Settings
  const [adminSettings, setAdminSettings] = useState({ full_name: '', avatar_url: '' });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ─── Session ────────────────────────────────────────────────────
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
            fullName = meData.user.full_name || fullName;
            avatarUrl = meData.user.avatar_url || avatarUrl;
          }
        } catch {
          const { data: p } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (p?.role) {
            userRole = p.role;
            fullName = p.full_name || fullName;
            avatarUrl = p.avatar_url || avatarUrl;
          }
        }

        if (!userRole) userRole = session.user.user_metadata?.role || 'user';
        if (userRole !== 'admin') { navigate('/user-dashboard', { replace: true }); return; }

        const u = { id: session.user.id, email: session.user.email, full_name: fullName, avatar_url: avatarUrl, role: 'admin' };
        setAdminUser(u);
        setAdminSettings({ full_name: u.full_name || '', avatar_url: u.avatar_url || '' });
      } catch {
        navigate('/auth', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  // ─── Fetch ───────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try { const r = await api.get('/admin/stats'); if (r.data.metrics) setMetrics(r.data.metrics); } catch {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try { const r = await api.get('/admin/users'); setUsers(r.data.users || []); } catch {}
  }, []);

  const fetchProblems = useCallback(async () => {
    try { const r = await api.get('/admin/problems'); setProblems(r.data.problems || []); } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await api.get('/admin/notifications');
      setNotifications(r.data.notifications || []);
      setUnreadCount(r.data.unread_count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    fetchMetrics();
    if (activeTab === 'users' || activeTab === 'leaderboard') fetchUsers();
    if (activeTab === 'problems') fetchProblems();
    if (activeTab === 'notifications') fetchNotifications();
    if (activeTab === 'post') fetchMetrics();
  }, [adminUser, activeTab, fetchMetrics, fetchUsers, fetchProblems, fetchNotifications]);

  // Poll notifications every 30s
  useEffect(() => {
    if (!adminUser) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [adminUser, fetchNotifications]);

  const sidebarItems = [
    { key: 'overview',      label: 'Overview',              icon: '📊' },
    { key: 'post',          label: 'Post Problems (Bulk)',  icon: '➕' },
    { key: 'problems',      label: 'Problems & Stats',      icon: '📋' },
    { key: 'users',         label: 'Users & Solves',        icon: '👥' },
    { key: 'leaderboard',   label: 'User Leaderboard',      icon: '🏆' },
    { key: 'notifications', label: 'Notifications',         icon: '🔔', badge: unreadCount > 0 ? unreadCount : null },
    { key: 'settings',      label: 'Settings',              icon: '⚙️' },
  ];

  // ─── Problem Actions ─────────────────────────────────────────────
  const handlePostSingleProblem = async () => {
    if (!newProblem.title.trim()) return;
    setPostLoading(true);
    try {
      await api.post('/admin/problems', newProblem);
      setPostSuccess(true);
      setNewProblem(createEmptyProblem());
      setTimeout(() => setPostSuccess(false), 2500);
      fetchMetrics();
      fetchProblems();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const handlePostBulkProblems = async () => {
    const validProblems = bulkProblems.filter(p => p.title && p.title.trim() !== '');
    if (validProblems.length === 0) {
      alert('Please fill in at least one problem title.');
      return;
    }
    setPostLoading(true);
    try {
      const res = await api.post('/admin/problems/bulk', { problems: validProblems });
      setBulkMessage(`✅ ${res.data.message || 'Problems published successfully!'}`);
      setBulkProblems([createEmptyProblem(), createEmptyProblem()]);
      setTimeout(() => setBulkMessage(''), 3000);
      fetchMetrics();
      fetchProblems();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(bulkJsonText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert('JSON must be an array of problem objects.');
        return;
      }
      setPostLoading(true);
      const res = await api.post('/admin/problems/bulk', { problems: parsed });
      setBulkMessage(`✅ ${res.data.message || 'Imported problems successfully!'}`);
      setBulkJsonText('');
      setTimeout(() => setBulkMessage(''), 3000);
      fetchMetrics();
      fetchProblems();
    } catch (err) {
      alert('Invalid JSON syntax: ' + err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const updateBulkProblemField = (index, field, value) => {
    setBulkProblems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBulkProblemCard = () => {
    setBulkProblems(prev => [...prev, createEmptyProblem()]);
  };

  const removeBulkProblemCard = (index) => {
    setBulkProblems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteProblem = async (id) => {
    if (!confirm('Delete this problem? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/problems/${id}`);
      fetchProblems();
      fetchMetrics();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleDaily = async (problem) => {
    const today = new Date().toISOString().split('T')[0];
    const newIsDaily = !problem.is_daily || problem.daily_date !== today;
    try {
      await api.patch(`/admin/problems/${problem.id}/daily`, { is_daily: newIsDaily, daily_date: today });
      fetchProblems();
      fetchMetrics();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkRead = async (notifId) => {
    try { await api.patch(`/admin/notifications/${notifId}/read`); fetchNotifications(); } catch {}
  };

  const handleMarkAllRead = async () => {
    try { await api.patch('/admin/notifications/read-all'); fetchNotifications(); } catch {}
  };

  const handleViewSubmission = async (submissionId, notifId) => {
    try {
      const r = await api.get(`/admin/submissions/${submissionId}`);
      setSelectedSubmission(r.data.submission);
      handleMarkRead(notifId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  const handleSettingsSave = async () => {
    try {
      const { data } = await api.put('/user/profile', adminSettings);
      if (data?.user) {
        setAdminUser(prev => ({ ...prev, ...data.user }));
        setAdminSettings({
          full_name: data.user.full_name || '',
          avatar_url: data.user.avatar_url || '',
        });
      }
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07030f' }}>
      <div style={{ textAlign: 'center', color: '#a78bca' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
        Loading Admin Panel...
      </div>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];

  // Filtering Problems
  const filteredProblems = problems.filter(p => {
    const matchSearch = !problemSearch || p.title?.toLowerCase().includes(problemSearch.toLowerCase()) || p.description?.toLowerCase().includes(problemSearch.toLowerCase());
    const matchTopic = problemTopicFilter === 'all' || p.topic_name === problemTopicFilter;
    let matchDiff = true;
    if (problemDiffFilter === 'daily') {
      matchDiff = p.is_daily && p.daily_date === today;
    } else if (problemDiffFilter !== 'all') {
      matchDiff = p.difficulty === problemDiffFilter;
    }
    return matchSearch && matchTopic && matchDiff;
  });

  const filteredUsers = users.filter(u =>
    !userSearch || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="dt-layout" style={{ position: 'relative' }}>
      <div className="ambient-glow-wrapper">
        <div className="glow-orb glow-purple-orb" style={{ opacity: 0.14 }} />
        <div className="glow-orb glow-orange-orb" style={{ opacity: 0.11 }} />
      </div>

      <Sidebar items={sidebarItems} activeItem={activeTab} onSelect={setActiveTab} accent="orange" title="Admin Panel" />

      <div className="dt-main" style={{ position: 'relative', zIndex: 1 }}>
        {/* Topbar */}
        <div className="dt-topbar">
          <h2 style={{ background: 'linear-gradient(90deg,#f97316,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {sidebarItems.find(i => i.key === activeTab)?.label}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: unreadCount > 0 ? '#f97316' : '#6b5a87' }}
            >
              <BellIcon size={22} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {adminUser && <ProfileMenu {...adminUser} onLogout={handleLogout} />}
          </div>
        </div>

        <div className="dt-content">

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              <div className="stat-cards-grid">
                {[
                  { label: 'Total Users',     value: metrics.total_users,          icon: '👥', color: '#a855f7' },
                  { label: 'Total Problems',  value: metrics.total_problems,       icon: '📚', color: '#f97316' },
                  { label: 'Total Solves',    value: metrics.total_solves,         icon: '✅', color: '#22c55e' },
                  { label: 'Active Users',    value: metrics.active_users,         icon: '⚡', color: '#06b6d4' },
                  { label: "Today's Daily",   value: metrics.daily_problems_count, icon: '📅', color: '#fbbf24' },
                  { label: 'Pending Reviews', value: metrics.pending_submissions,  icon: '⏳', color: '#f97316' },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ borderColor: `${s.color}30` }}>
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel" style={{ padding: '1.75rem' }}>
                <h4 style={{ color: '#e9d5ff', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Quick Actions</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn-primary btn-orange" onClick={() => { setActiveTab('post'); setPostMode('bulk'); }}>
                    ⚡ Post Multiple Problems (Bulk)
                  </button>
                  <button className="btn-primary" onClick={() => setActiveTab('users')}>
                    <UsersIcon size={15} /> View Users & Solves
                  </button>
                  <button className="btn-ghost" onClick={() => setActiveTab('leaderboard')}>
                    <TrophyIcon size={15} /> Platform Leaderboard
                  </button>
                  <button className="btn-ghost" onClick={() => setActiveTab('notifications')}>
                    <BellIcon size={15} /> Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── POST PROBLEMS (SINGLE & BULK) ────────────────────── */}
          {activeTab === 'post' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Mode Switcher */}
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(168,85,247,0.08)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
                <button
                  onClick={() => setPostMode('single')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                    background: postMode === 'single' ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent',
                    color: postMode === 'single' ? '#fff' : '#a78bca',
                  }}
                >
                  ➕ Single Problem
                </button>
                <button
                  onClick={() => setPostMode('bulk')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                    background: postMode === 'bulk' ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent',
                    color: postMode === 'bulk' ? '#fff' : '#a78bca',
                  }}
                >
                  ⚡ Bulk Multi-Card Form ({bulkProblems.length})
                </button>
                <button
                  onClick={() => setPostMode('json')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                    background: postMode === 'json' ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent',
                    color: postMode === 'json' ? '#fff' : '#a78bca',
                  }}
                >
                  📄 Paste JSON
                </button>
              </div>

              {bulkMessage && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: '0.9rem', fontWeight: 600 }}>
                  {bulkMessage}
                </div>
              )}

              {/* MODE 1: SINGLE PROBLEM */}
              {postMode === 'single' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: 780 }}>
                  <h3 style={{ color: '#f1e8ff', marginBottom: '1.5rem', fontSize: '1.05rem', fontWeight: 700 }}>Post Single Problem</h3>
                  {postSuccess && (
                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckIcon size={16} /> Problem posted successfully!
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-field">
                      <label className="form-label">Problem Title *</label>
                      <input className="glass-input" placeholder="e.g. Valid Palindrome" value={newProblem.title} onChange={e => setNewProblem(p => ({ ...p, title: e.target.value }))} />
                    </div>

                    <div className="form-grid-2">
                      <div className="form-field">
                        <label className="form-label">Difficulty</label>
                        <select className="glass-input" value={newProblem.difficulty} onChange={e => setNewProblem(p => ({ ...p, difficulty: e.target.value }))}>
                          <option value="easy">Easy (+3 pts)</option>
                          <option value="medium">Medium (+6 pts)</option>
                          <option value="hard">Hard (+10 pts)</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Topic</label>
                        <select className="glass-input" value={newProblem.topic_name} onChange={e => setNewProblem(p => ({ ...p, topic_name: e.target.value }))}>
                          {TOPICS.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Description</label>
                      <textarea className="glass-input" placeholder="Problem statement..." rows={4} value={newProblem.description} onChange={e => setNewProblem(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="form-grid-2">
                      <div className="form-field">
                        <label className="form-label">Sample Input</label>
                        <textarea className="glass-input" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} rows={3} value={newProblem.sample_input} onChange={e => setNewProblem(p => ({ ...p, sample_input: e.target.value }))} />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Sample Output</label>
                        <textarea className="glass-input" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} rows={3} value={newProblem.sample_output} onChange={e => setNewProblem(p => ({ ...p, sample_output: e.target.value }))} />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-field">
                        <label className="form-label">External URL (LeetCode / Codeforces)</label>
                        <input className="glass-input" type="url" placeholder="https://..." value={newProblem.external_url} onChange={e => setNewProblem(p => ({ ...p, external_url: e.target.value }))} />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Tags (comma-separated)</label>
                        <input className="glass-input" placeholder="string, two-pointer" value={newProblem.tags} onChange={e => setNewProblem(p => ({ ...p, tags: e.target.value }))} />
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Constraints</label>
                      <textarea className="glass-input" rows={2} placeholder="e.g. 1 <= s.length <= 2 * 10^5" value={newProblem.constraints} onChange={e => setNewProblem(p => ({ ...p, constraints: e.target.value }))} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
                      <input type="checkbox" id="is_daily_single" checked={newProblem.is_daily} onChange={e => setNewProblem(p => ({ ...p, is_daily: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#f97316', cursor: 'pointer' }} />
                      <label htmlFor="is_daily_single" style={{ cursor: 'pointer', color: '#fed7aa', fontWeight: 600, fontSize: '0.88rem' }}>
                        📅 Mark as Today's Daily Problem
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                      <button className="btn-ghost" onClick={() => setNewProblem(createEmptyProblem())}>Clear</button>
                      <button className="btn-primary btn-orange" onClick={handlePostSingleProblem} disabled={postLoading || !newProblem.title.trim()} style={{ minWidth: 140 }}>
                        <PlusIcon size={15} /> {postLoading ? 'Posting...' : 'Post Problem'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: BULK MULTI-CARD FORM */}
              {postMode === 'bulk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a78bca', fontSize: '0.9rem' }}>
                      Fill in multiple problem cards below and publish them all together in one batch.
                    </span>
                    <button className="btn-primary" onClick={addBulkProblemCard} style={{ fontSize: '0.84rem' }}>
                      <PlusIcon size={14} /> Add Another Problem Card
                    </button>
                  </div>

                  {bulkProblems.map((prob, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '1.75rem', position: 'relative', borderLeft: '4px solid #f97316' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(168,85,247,0.12)', paddingBottom: '0.75rem' }}>
                        <h4 style={{ color: '#fed7aa', fontWeight: 800, fontSize: '1rem' }}>Problem #{idx + 1}</h4>
                        {bulkProblems.length > 1 && (
                          <button onClick={() => removeBulkProblemCard(idx)} className="btn-danger" style={{ padding: '4px 10px', fontSize: '0.76rem' }}>
                            <TrashIcon size={13} /> Remove Card
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div className="form-field">
                          <label className="form-label">Title *</label>
                          <input
                            className="glass-input"
                            placeholder="e.g. Invert Binary Tree"
                            value={prob.title}
                            onChange={e => updateBulkProblemField(idx, 'title', e.target.value)}
                          />
                        </div>

                        <div className="form-grid-2">
                          <div className="form-field">
                            <label className="form-label">Difficulty</label>
                            <select className="glass-input" value={prob.difficulty} onChange={e => updateBulkProblemField(idx, 'difficulty', e.target.value)}>
                              <option value="easy">Easy (+3 pts)</option>
                              <option value="medium">Medium (+6 pts)</option>
                              <option value="hard">Hard (+10 pts)</option>
                            </select>
                          </div>
                          <div className="form-field">
                            <label className="form-label">Topic</label>
                            <select className="glass-input" value={prob.topic_name} onChange={e => updateBulkProblemField(idx, 'topic_name', e.target.value)}>
                              {TOPICS.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="form-field">
                          <label className="form-label">Description</label>
                          <textarea className="glass-input" rows={3} placeholder="Problem statement..." value={prob.description} onChange={e => updateBulkProblemField(idx, 'description', e.target.value)} />
                        </div>

                        <div className="form-grid-2">
                          <div className="form-field">
                            <label className="form-label">Sample Input</label>
                            <input className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="root = [4,2,7,1,3,6,9]" value={prob.sample_input} onChange={e => updateBulkProblemField(idx, 'sample_input', e.target.value)} />
                          </div>
                          <div className="form-field">
                            <label className="form-label">Sample Output</label>
                            <input className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="[4,7,2,9,6,3,1]" value={prob.sample_output} onChange={e => updateBulkProblemField(idx, 'sample_output', e.target.value)} />
                          </div>
                        </div>

                        <div className="form-grid-2">
                          <div className="form-field">
                            <label className="form-label">External Link</label>
                            <input className="glass-input" type="url" placeholder="https://..." value={prob.external_url} onChange={e => updateBulkProblemField(idx, 'external_url', e.target.value)} />
                          </div>
                          <div className="form-field">
                            <label className="form-label">Tags</label>
                            <input className="glass-input" placeholder="tree, dfs, recursion" value={prob.tags} onChange={e => updateBulkProblemField(idx, 'tags', e.target.value)} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id={`daily_${idx}`}
                            checked={prob.is_daily}
                            onChange={e => updateBulkProblemField(idx, 'is_daily', e.target.checked)}
                            style={{ accentColor: '#f97316', cursor: 'pointer' }}
                          />
                          <label htmlFor={`daily_${idx}`} style={{ color: '#fed7aa', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                            📅 Set as Today's Daily Problem
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
                    <button className="btn-ghost" onClick={addBulkProblemCard}>
                      <PlusIcon size={14} /> Add Another Problem
                    </button>
                    <button className="btn-primary btn-orange" onClick={handlePostBulkProblems} disabled={postLoading} style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
                      🚀 {postLoading ? 'Publishing Batch...' : `Publish All (${bulkProblems.filter(p => p.title.trim()).length}) Problems`}
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 3: JSON PASTE */}
              {postMode === 'json' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: 800 }}>
                  <h3 style={{ color: '#f1e8ff', marginBottom: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>Paste Problems JSON</h3>
                  <p style={{ color: '#a78bca', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    Paste a JSON array containing problem objects.
                  </p>

                  <textarea
                    className="glass-input"
                    rows={10}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}
                    placeholder="Paste JSON array here..."
                    value={bulkJsonText}
                    onChange={e => setBulkJsonText(e.target.value)}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button className="btn-primary btn-orange" onClick={handleImportJson} disabled={postLoading || !bulkJsonText.trim()}>
                      🚀 {postLoading ? 'Importing...' : 'Validate & Import Problems'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── PROBLEMS LIST & FILTERS ───────────────────────────── */}
          {activeTab === 'problems' && (
            <>
              {/* Search & New Button */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <SearchIcon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c3aed' }} />
                  <input
                    className="glass-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search problems by name..."
                    value={problemSearch}
                    onChange={e => setProblemSearch(e.target.value)}
                  />
                </div>

                {/* Topic Filter */}
                <select
                  className="glass-input"
                  style={{ width: 'auto', minWidth: 160 }}
                  value={problemTopicFilter}
                  onChange={e => setProblemTopicFilter(e.target.value)}
                >
                  <option value="all">All Topics</option>
                  {TOPICS.filter(t => t !== 'all').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <button className="btn-primary btn-orange" onClick={() => { setActiveTab('post'); setPostMode('single'); }} style={{ flexShrink: 0 }}>
                  <PlusIcon size={15} /> New Problem
                </button>
              </div>

              {/* Difficulty & Daily Filter Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { key: 'all', label: 'All Problems' },
                  { key: 'easy', label: '🟢 Easy' },
                  { key: 'medium', label: '🟠 Medium' },
                  { key: 'hard', label: '🔴 Hard' },
                  { key: 'daily', label: '📅 Today\'s Daily' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setProblemDiffFilter(f.key)}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                      border: problemDiffFilter === f.key ? '1px solid #f97316' : '1px solid rgba(168,85,247,0.2)',
                      background: problemDiffFilter === f.key ? 'rgba(249,115,22,0.2)' : 'transparent',
                      color: problemDiffFilter === f.key ? '#fed7aa' : '#a78bca',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
                <span style={{ fontSize: '0.78rem', color: '#6b5a87', marginLeft: 'auto' }}>
                  Showing <strong>{filteredProblems.length}</strong> problems
                </span>
              </div>

              {/* Problems Table with Solved Count */}
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="dt-table">
                  <thead>
                    <tr>
                      <th>Problem Title</th>
                      <th>Difficulty</th>
                      <th>Topic</th>
                      <th>Members Solved</th>
                      <th>Daily Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProblems.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#6b5a87' }}>No problems found matching your filters.</td></tr>
                    ) : filteredProblems.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#f1e8ff', fontSize: '0.88rem' }}>{p.title}</div>
                          {p.external_url && (
                            <a href={p.external_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ExternalLinkIcon size={10} /> Link
                            </a>
                          )}
                        </td>
                        <td><span className={`badge badge-${p.difficulty}`}>{p.difficulty}</span></td>
                        <td style={{ color: '#a78bca', fontSize: '0.83rem' }}>{p.topic_name}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 9px', borderRadius: '12px',
                            background: p.solved_count > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(107,90,135,0.12)',
                            color: p.solved_count > 0 ? '#4ade80' : '#6b5a87',
                            fontSize: '0.78rem', fontWeight: 600,
                          }}>
                            👥 {p.solved_count || 0} Solved
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleDaily(p)}
                            style={{
                              padding: '4px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                              background: (p.is_daily && p.daily_date === today) ? 'rgba(249,115,22,0.2)' : 'rgba(107,90,135,0.15)',
                              color: (p.is_daily && p.daily_date === today) ? '#fb923c' : '#6b5a87',
                            }}
                          >
                            {(p.is_daily && p.daily_date === today) ? '📅 Daily (Active)' : 'Set Daily'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-ghost" style={{ padding: '5px 9px' }} onClick={() => setEditingProblem(p)}><EditIcon size={14} /></button>
                            <button className="btn-danger" style={{ padding: '5px 9px' }} onClick={() => handleDeleteProblem(p.id)}><TrashIcon size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── USERS & SOLVED STATS ─────────────────────────────── */}
          {activeTab === 'users' && (
            <>
              <div style={{ position: 'relative' }}>
                <SearchIcon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c3aed' }} />
                <input className="glass-input" style={{ paddingLeft: 36 }} placeholder="Search users by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>

              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="dt-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Total Score</th>
                      <th>Problems Solved</th>
                      <th>In Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b5a87' }}>No users found</td></tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                                {(u.full_name || u.email || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f1e8ff' }}>{u.full_name || 'Anonymous'}</div>
                              <div style={{ fontSize: '0.74rem', color: '#6b5a87' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-easy'}`}>{u.role}</span></td>
                        <td style={{ fontWeight: 700, color: '#a855f7' }}>{u.score || 0} pts</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#4ade80' }}>{u.solved_count || 0} Solved</span>
                            {u.solved_count > 0 && (
                              <span style={{ fontSize: '0.72rem', color: '#a78bca' }}>
                                ({u.easy_solved || 0}E · {u.medium_solved || 0}M · {u.hard_solved || 0}H)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: '#fb923c', fontWeight: 600 }}>{u.assigned_count || 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setViewingUserActivityId(u.id)}
                              className="btn-primary"
                              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                            >
                              <EyeIcon size={12} /> View Solves
                            </button>
                            {u.id !== adminUser?.id && (
                              <button
                                onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                className="btn-ghost"
                                style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                              >
                                {u.role === 'admin' ? '→ User' : '→ Admin'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ADMIN GLOBAL LEADERBOARD ─────────────────────────── */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: '#a78bca', fontSize: '0.88rem' }}>
                  🏆 Full Platform Leaderboard — User rankings based on verified problem solves & scores
                </span>
              </div>

              {users.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🏆</div>No users found.</div>
              ) : users.map((u, i) => (
                <div key={u.id} className={`leaderboard-row top-${i < 3 ? i + 1 : ''}`}>
                  <div className="lb-rank" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#6b5a87' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>

                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="lb-avatar" />
                  ) : (
                    <div className="lb-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#a855f7,#f97316)', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                      {(u.full_name || u.email || 'U')[0].toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lb-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{u.full_name || u.email}</span>
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-easy'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        {u.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#a78bca', marginTop: '2px', display: 'flex', gap: '10px' }}>
                      <span>✅ <strong>{u.solved_count || 0}</strong> solved</span>
                      {u.streak_days > 0 && <span style={{ color: '#fb923c' }}>🔥 {u.streak_days}d streak</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="lb-score">{u.score || 0} pts</span>
                    <button
                      onClick={() => setViewingUserActivityId(u.id)}
                      className="btn-ghost"
                      style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                    >
                      Portfolio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#a78bca', fontSize: '0.85rem' }}>
                  {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                </span>
                {unreadCount > 0 && (
                  <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={handleMarkAllRead}>
                    <CheckIcon size={13} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🔔</div>No notifications yet</div>
                ) : notifications.map(n => (
                  <div key={n.id}
                    style={{
                      padding: '1rem 1.25rem', borderRadius: '12px',
                      background: n.is_read ? 'var(--bg-card)' : 'rgba(249,115,22,0.06)',
                      border: `1px solid ${n.is_read ? 'var(--border-glass)' : 'rgba(249,115,22,0.25)'}`,
                      display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s',
                    }}
                  >
                    {n.user_profiles?.avatar_url ? (
                      <img src={n.user_profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(n.user_profiles?.full_name || 'U')[0].toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', color: n.is_read ? '#a78bca' : '#f1e8ff', lineHeight: 1.5 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b5a87', marginTop: '3px' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {n.submission_id && (
                        <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={() => handleViewSubmission(n.submission_id, n.id)}>
                          <EyeIcon size={13} /> View Code
                        </button>
                      )}
                      {!n.is_read && (
                        <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={() => handleMarkRead(n.id)}>
                          <CheckIcon size={13} /> Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: 500 }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#f1e8ff', fontSize: '1.05rem', fontWeight: 700 }}>Admin Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-field">
                  <label className="form-label">Full Name</label>
                  <input className="glass-input" value={adminSettings.full_name} onChange={e => setAdminSettings(s => ({ ...s, full_name: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Avatar URL</label>
                  <input className="glass-input" type="url" value={adminSettings.avatar_url} onChange={e => setAdminSettings(s => ({ ...s, avatar_url: e.target.value }))} />
                </div>
                <button className="btn-primary btn-orange" style={{ alignSelf: 'flex-start' }} onClick={handleSettingsSave}>
                  {settingsSaved ? '✅ Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit Problem Modal */}
      {editingProblem && (
        <EditProblemModal
          problem={editingProblem}
          onClose={() => setEditingProblem(null)}
          onSaved={() => { setEditingProblem(null); fetchProblems(); }}
        />
      )}

      {/* User Activity & Solved Drilldown Modal */}
      {viewingUserActivityId && (
        <UserActivityModal
          userId={viewingUserActivityId}
          onClose={() => setViewingUserActivityId(null)}
        />
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ color: '#f1e8ff', fontWeight: 700 }}>Submission Details</h3>
                <div style={{ fontSize: '0.8rem', color: '#a78bca', marginTop: '2px' }}>
                  {selectedSubmission.user_profiles?.full_name} · {selectedSubmission.problems?.title}
                </div>
              </div>
              <button className="btn-ghost" style={{ padding: '7px' }} onClick={() => setSelectedSubmission(null)}><XIcon size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className={`badge badge-${selectedSubmission.problems?.difficulty}`}>{selectedSubmission.problems?.difficulty}</span>
                <span className={`badge ${selectedSubmission.status === 'accepted' ? 'badge-solved' : selectedSubmission.status === 'rejected' ? 'badge-hard' : 'badge-pending'}`}>{selectedSubmission.status}</span>
                <span style={{ fontSize: '0.8rem', color: '#a78bca' }}>Lang: {selectedSubmission.language}</span>
              </div>

              {selectedSubmission.proof_url && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#4ade80', marginBottom: '6px', fontWeight: 600 }}>📎 Proof URL</div>
                  <a href={selectedSubmission.proof_url} target="_blank" rel="noreferrer" style={{ color: '#22c55e', fontSize: '0.88rem', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ExternalLinkIcon size={13} /> {selectedSubmission.proof_url}
                  </a>
                </div>
              )}

              {selectedSubmission.code && (
                <div className="form-field">
                  <label className="form-label">Submitted Code</label>
                  <pre style={{ background: '#0a0a18', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#c084fc', overflow: 'auto', maxHeight: '280px', whiteSpace: 'pre-wrap' }}>
                    {selectedSubmission.code}
                  </pre>
                </div>
              )}

              <div style={{ fontSize: '0.8rem', color: '#6b5a87' }}>
                Submitted {new Date(selectedSubmission.submitted_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
