import React, { useState } from 'react';
import { XIcon, ExternalLinkIcon, CheckCircleIcon, PinIcon, SendIcon } from './Icons';

export default function ProblemModal({ problem, onClose, onAssign, onUnassign, onStatusChange }) {
  if (!problem) return null;

  const [proofLink, setProofLink] = useState(problem.proof_link || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProof = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onStatusChange(problem.id, problem.status || 'assigned', proofLink);
    setIsSaving(false);
  };

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return <span className="badge badge-easy">Easy</span>;
      case 'medium':
        return <span className="badge badge-medium">Medium</span>;
      case 'hard':
        return <span className="badge badge-hard">Hard</span>;
      default:
        return <span className="badge badge-blue">{diff}</span>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        >
          <XIcon size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {getDifficultyBadge(problem.difficulty)}
          {problem.is_daily && (
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              🔥 Daily Challenge
            </span>
          )}
          {problem.topic_name && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              📁 {problem.topic_name}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem', color: '#fff' }}>
          {problem.title}
        </h2>

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {problem.tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: '0.78rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-muted)',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          color: '#e2e8f0',
          fontSize: '0.95rem',
          lineHeight: '1.7',
          marginBottom: '1.5rem',
          whiteSpace: 'pre-line'
        }}>
          {problem.description}
        </div>

        {/* Sample Input / Output */}
        {(problem.sample_input || problem.sample_output) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {problem.sample_input && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>Sample Input</div>
                <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#93c5fd', overflowX: 'auto' }}>
                  {problem.sample_input}
                </pre>
              </div>
            )}
            {problem.sample_output && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>Expected Output</div>
                <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#34d399', overflowX: 'auto' }}>
                  {problem.sample_output}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Constraints */}
        {problem.constraints && (
          <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>Constraints: </span>
            <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
              {problem.constraints}
            </code>
          </div>
        )}

        {/* Proof / Submission Form */}
        <form onSubmit={handleSaveProof} style={{
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.5rem'
        }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
            Proof Link / Solution URL (GitHub, LeetCode, or Notes)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              className="glass-input"
              placeholder="https://github.com/your-username/dsa-repo/..."
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
              style={{ fontSize: '0.88rem' }}
            />
            <button
              type="submit"
              disabled={isSaving}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <SendIcon size={14} />
              {isSaving ? 'Saving...' : 'Save Link'}
            </button>
          </div>
        </form>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            {problem.external_url && (
              <a
                href={problem.external_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ fontSize: '0.88rem' }}
              >
                Solve on LeetCode <ExternalLinkIcon size={14} />
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {problem.is_assigned ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const newStatus = problem.is_solved ? 'assigned' : 'completed';
                    onStatusChange(problem.id, newStatus, proofLink);
                  }}
                  className={problem.is_solved ? "btn-secondary" : "btn-primary btn-success"}
                  style={{ fontSize: '0.88rem' }}
                >
                  <CheckCircleIcon size={16} />
                  {problem.is_solved ? 'Mark as Incomplete' : 'Mark as Solved'}
                </button>
                <button
                  type="button"
                  onClick={() => onUnassign(problem.id)}
                  className="btn-secondary"
                  style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '0.88rem' }}
                >
                  Unassign Problem
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onAssign(problem.id)}
                className="btn-primary"
                style={{ fontSize: '0.88rem' }}
              >
                <PinIcon size={16} />
                Assign to My Tasks
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

