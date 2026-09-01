import React, { useState } from 'react';
import { XIcon, ExternalLinkIcon, CodeIcon, CheckIcon } from './Icons';

const DIFF_SCORE = { easy: 3, medium: 6, hard: 10 };

export default function ProblemDetailModal({ problem, onClose, onAssign, onUnassign, onOpenEditor, busy }) {
  if (!problem) return null;

  const [copiedSection, setCopiedSection] = useState('');
  const isSolved = problem.is_solved || problem.user_status === 'solved';
  const isAssigned = problem.is_assigned || !!problem.user_status;
  const maxScore = problem.max_score || DIFF_SCORE[problem.difficulty] || 3;

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(''), 2000);
  };

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '4vh' }}>
      <div className="modal-panel wide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(168,85,247,0.15)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1e8ff' }}>{problem.title}</h2>
              {isSolved && (
                <span className="badge badge-solved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckIcon size={13} /> Solved ({problem.user_score || maxScore} pts)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: '#a78bca', flexWrap: 'wrap' }}>
              {problem.topic_name && <span>📂 <strong>{problem.topic_name}</strong></span>}
              <span>⭐ Max Score: <strong style={{ color: '#a855f7' }}>{maxScore} pts</strong></span>
              {problem.is_daily && <span style={{ color: '#fb923c' }}>📅 Daily Problem</span>}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '8px',
              color: '#a78bca',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {problem.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '0.75rem',
                padding: '2px 9px',
                borderRadius: '12px',
                background: 'rgba(168,85,247,0.12)',
                color: '#c084fc',
                border: '1px solid rgba(168,85,247,0.25)',
                fontWeight: 500,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Problem Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a855f7', fontWeight: 700 }}>
            Description
          </h4>
          <div style={{
            color: '#e9d5ff',
            fontSize: '0.94rem',
            lineHeight: 1.65,
            whiteSpace: 'pre-line',
            background: 'rgba(14, 8, 32, 0.6)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(168,85,247,0.15)',
          }}>
            {problem.description || 'No description provided for this problem.'}
          </div>
        </div>

        {/* Sample Input & Output */}
        {(problem.sample_input || problem.sample_output) && (
          <div className="form-grid-2">
            {problem.sample_input && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Sample Input</span>
                  <button
                    onClick={() => copyToClipboard(problem.sample_input, 'input')}
                    style={{ background: 'transparent', border: 'none', color: copiedSection === 'input' ? '#4ade80' : '#7c3aed', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {copiedSection === 'input' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre style={{
                  background: '#090518',
                  border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.84rem',
                  color: '#fed7aa',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                }}>
                  {problem.sample_input}
                </pre>
              </div>
            )}

            {problem.sample_output && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Sample Output</span>
                  <button
                    onClick={() => copyToClipboard(problem.sample_output, 'output')}
                    style={{ background: 'transparent', border: 'none', color: copiedSection === 'output' ? '#4ade80' : '#7c3aed', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {copiedSection === 'output' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre style={{
                  background: '#090518',
                  border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.84rem',
                  color: '#bbf7d0',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                }}>
                  {problem.sample_output}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Constraints */}
        {problem.constraints && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bca', textTransform: 'uppercase' }}>Constraints</span>
            <div style={{
              background: 'rgba(14, 8, 32, 0.4)',
              border: '1px solid rgba(168,85,247,0.12)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#c084fc',
              whiteSpace: 'pre-line',
            }}>
              {problem.constraints}
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(168,85,247,0.15)',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div>
            {problem.external_url && (
              <a
                href={problem.external_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLinkIcon size={14} /> Open Problem Link
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isAssigned ? (
              <button
                className="btn-primary btn-orange"
                onClick={() => onAssign(problem)}
                disabled={busy}
              >
                + Assign to Me
              </button>
            ) : (
              <>
                <button
                  className="btn-ghost"
                  onClick={() => onUnassign(problem)}
                  disabled={busy}
                >
                  <XIcon size={14} /> Unassign
                </button>

                <button
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenEditor(problem);
                  }}
                  disabled={busy}
                  style={{ minWidth: 150 }}
                >
                  <CodeIcon size={15} /> {isSolved ? 'Re-submit Code' : 'Submit Code'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
