import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { XIcon, CheckIcon } from './Icons';

const TOPICS = ['General','Arrays & Hashing','Two Pointers','Stack','Binary Search','Sliding Window',
  'Linked List','Trees','Tries','Heap','Graphs','Dynamic Programming','Greedy','Backtracking'];

export default function EditProblemModal({ problem, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '', difficulty: 'easy', description: '', topic_name: 'General',
    tags: '', constraints: '', sample_input: '', sample_output: '', external_url: '', is_daily: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (problem) {
      setForm({
        title: problem.title || '',
        difficulty: problem.difficulty || 'easy',
        description: problem.description || '',
        topic_name: problem.topic_name || 'General',
        tags: Array.isArray(problem.tags) ? problem.tags.join(', ') : (problem.tags || ''),
        constraints: problem.constraints || '',
        sample_input: problem.sample_input || '',
        sample_output: problem.sample_output || '',
        external_url: problem.external_url || '',
        is_daily: problem.is_daily || false,
      });
    }
  }, [problem]);

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title required'); return; }
    setError(''); setSaving(true);
    try {
      await api.put(`/admin/problems/${problem.id}`, form);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-panel" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#e9d5ff', fontWeight: 700 }}>Edit Problem</h3>
          <button className="btn-ghost" style={{ padding: '7px' }} onClick={onClose}><XIcon size={18}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-field">
            <label className="form-label">Title *</label>
            <input className="glass-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Difficulty</label>
              <select className="glass-input" value={form.difficulty} onChange={e => setForm(f => ({...f, difficulty: e.target.value}))}>
                <option value="easy">Easy (+3 pts)</option>
                <option value="medium">Medium (+6 pts)</option>
                <option value="hard">Hard (+10 pts)</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Topic</label>
              <select className="glass-input" value={form.topic_name} onChange={e => setForm(f => ({...f, topic_name: e.target.value}))}>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea className="glass-input" rows={4} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Sample Input</label>
              <textarea className="glass-input" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }} rows={3} value={form.sample_input} onChange={e => setForm(f => ({...f, sample_input: e.target.value}))} />
            </div>
            <div className="form-field">
              <label className="form-label">Sample Output</label>
              <textarea className="glass-input" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }} rows={3} value={form.sample_output} onChange={e => setForm(f => ({...f, sample_output: e.target.value}))} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">External URL</label>
              <input className="glass-input" type="url" value={form.external_url} onChange={e => setForm(f => ({...f, external_url: e.target.value}))} />
            </div>
            <div className="form-field">
              <label className="form-label">Tags</label>
              <input className="glass-input" placeholder="array, hashmap" value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Constraints</label>
            <textarea className="glass-input" rows={2} value={form.constraints} onChange={e => setForm(f => ({...f, constraints: e.target.value}))} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.83rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-orange" onClick={handleSave} disabled={saving}>
              <CheckIcon size={14}/> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
