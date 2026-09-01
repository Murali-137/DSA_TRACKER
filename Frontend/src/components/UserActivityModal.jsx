import React, { useState, useEffect } from 'react';
import { XIcon, ExternalLinkIcon, CheckIcon, EyeIcon } from './Icons';
import { api } from '../api';

export default function UserActivityModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const fetchActivity = async () => {
      try {
        const res = await api.get(`/admin/users/${userId}/activity`);
        setData(res.data);
      } catch (err) {
        alert(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '4vh' }}>
      <div className="modal-panel wide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(168,85,247,0.15)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1e8ff' }}>User Activity & Problem Solves</h3>
            <div style={{ fontSize: '0.8rem', color: '#a78bca', marginTop: '3px' }}>
              Detailed breakdown of assigned and solved problems
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 10px' }}><XIcon size={18} /></button>
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div>Loading user portfolio...</div>
        ) : !data ? (
          <div className="empty-state">No data available</div>
        ) : (
          <>
            {/* User Info Bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem', borderRadius: '14px',
              background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
              flexWrap: 'wrap', gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {data.user.avatar_url ? (
                  <img src={data.user.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {(data.user.full_name || data.user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1e8ff' }}>{data.user.full_name || 'Anonymous'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#a78bca' }}>{data.user.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: '10px', background: 'rgba(168,85,247,0.15)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc' }}>{data.user.score || 0} pts</div>
                  <div style={{ fontSize: '0.7rem', color: '#a78bca' }}>Total Score</div>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.12)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>{data.solved_count}</div>
                  <div style={{ fontSize: '0.7rem', color: '#86efac' }}>Solved</div>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: '10px', background: 'rgba(249,115,22,0.12)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fb923c' }}>{data.active_count}</div>
                  <div style={{ fontSize: '0.7rem', color: '#fed7aa' }}>In Progress</div>
                </div>
              </div>
            </div>

            {/* Assignments & Solved Problems Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#e9d5ff', fontWeight: 700 }}>
                Problem Portfolio ({data.assignments?.length || 0})
              </h4>

              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="dt-table">
                  <thead>
                    <tr>
                      <th>Problem Title</th>
                      <th>Difficulty</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Solved / Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.assignments || data.assignments.length === 0) ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#6b5a87' }}>No assignments or solves recorded yet.</td></tr>
                    ) : data.assignments.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#f1e8ff', fontSize: '0.88rem' }}>{a.problems?.title || 'Unknown Problem'}</div>
                          {a.problems?.topic_name && <div style={{ fontSize: '0.72rem', color: '#a855f7' }}>📂 {a.problems.topic_name}</div>}
                        </td>
                        <td>
                          <span className={`badge badge-${a.problems?.difficulty || 'easy'}`}>{a.problems?.difficulty || 'easy'}</span>
                        </td>
                        <td>
                          <span className={`badge ${a.status === 'solved' ? 'badge-solved' : a.status === 'submitted' ? 'badge-purple' : 'badge-pending'}`}>
                            {a.status === 'solved' ? '✅ Solved' : a.status === 'submitted' ? '⏳ Submitted' : '📌 Assigned'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: a.score > 0 ? '#4ade80' : '#6b5a87' }}>
                          {a.score > 0 ? `+${a.score} pts` : '—'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#a78bca' }}>
                          {a.solved_at ? new Date(a.solved_at).toLocaleString() : a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submissions History */}
            {data.submissions && data.submissions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#e9d5ff', fontWeight: 700 }}>
                  Recent Code Submissions ({data.submissions.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {data.submissions.map(s => (
                    <div key={s.id} style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(14, 8, 32, 0.7)', border: '1px solid rgba(168,85,247,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#f1e8ff' }}>{s.problems?.title}</div>
                        <div style={{ fontSize: '0.74rem', color: '#a78bca', marginTop: '2px' }}>
                          Lang: <strong style={{ color: '#c084fc' }}>{s.language}</strong> · Submitted {new Date(s.submitted_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {s.proof_url && (
                          <a href={s.proof_url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '5px 9px', fontSize: '0.75rem', textDecoration: 'none' }}>
                            <ExternalLinkIcon size={12} /> Proof
                          </a>
                        )}
                        <button className="btn-ghost" style={{ padding: '5px 9px', fontSize: '0.75rem' }} onClick={() => setSelectedSub(s)}>
                          <EyeIcon size={13} /> View Code
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Code Inspector Submodal */}
      {selectedSub && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-panel" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: '#f1e8ff', fontWeight: 700 }}>Solution Code: {selectedSub.problems?.title}</h4>
              <button className="btn-ghost" style={{ padding: '5px' }} onClick={() => setSelectedSub(null)}><XIcon size={16} /></button>
            </div>
            <pre style={{ background: '#090518', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#c084fc', overflow: 'auto', maxHeight: '350px', whiteSpace: 'pre-wrap' }}>
              {selectedSub.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
