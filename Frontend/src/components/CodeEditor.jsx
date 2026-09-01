import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../api';

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'python',     label: 'Python',     monacoLang: 'python'     },
  { value: 'cpp',        label: 'C++',        monacoLang: 'cpp'        },
  { value: 'java',       label: 'Java',       monacoLang: 'java'       },
  { value: 'typescript', label: 'TypeScript', monacoLang: 'typescript' },
  { value: 'go',         label: 'Go',         monacoLang: 'go'         },
];

const STARTERS = {
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var solution = function(input) {
    // Write your solution here
    
};`,
  python: `class Solution:
    def solution(self, input):
        # Write your solution here
        pass`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Write your solution here
    
};`,
  java: `class Solution {
    public static void main(String[] args) {
        // Write your solution here
    }
}`,
  typescript: `function solution(input: any): any {
    // Write your solution here
}`,
  go: `package main

import "fmt"

func solution(input interface{}) interface{} {
    // Write your solution here
    return nil
}`,
};

const DIFF_COLOR = { easy: '#4ade80', medium: '#fb923c', hard: '#f87171' };
const DIFF_BG    = { easy: 'rgba(74,222,128,0.12)', medium: 'rgba(251,146,60,0.12)', hard: 'rgba(248,113,113,0.12)' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderDescription(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    // Bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} style={{ margin: '4px 0', lineHeight: 1.7 }}>
        {parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j}>{p.slice(2, -2)}</strong>
            : <span key={j}>{p}</span>
        )}
      </p>
    );
  });
}

function ScoreStars({ score }) {
  const filled = Math.round(score);
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ fontSize: '0.85rem', opacity: i < filled ? 1 : 0.2 }}>★</span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CodeEditor({ problem, onClose, onSubmitted }) {
  const [activeLeftTab, setActiveLeftTab] = useState('description');
  const [language, setLanguage]   = useState('python');
  const [code, setCode]           = useState(STARTERS['python']);
  const [proofUrl, setProofUrl]   = useState('');

  // Submission flow states
  const [phase, setPhase] = useState('idle'); // idle | submitting | analyzing | done | error
  const [submissionId, setSubmissionId] = useState(null);
  const [result, setResult] = useState(null);  // { score, feedback }
  const [errorMsg, setErrorMsg] = useState('');
  const [pastSubmissions, setPastSubmissions] = useState([]);

  const editorRef = useRef(null);

  // Fetch past submissions for this problem
  useEffect(() => {
    api.get('/user/submissions', { params: { problem_id: problem.id } })
      .then(r => setPastSubmissions(r.data.submissions || []))
      .catch(() => {});
  }, [problem.id]);

  const handleLangChange = (lang) => {
    setLanguage(lang);
    setCode(STARTERS[lang] || '// Write your code here');
  };

  const handleResetCode = () => {
    if (confirm('Reset code to starter template?')) setCode(STARTERS[language] || '');
  };

  const handleSubmit = async () => {
    if (!code.trim() || code.trim() === (STARTERS[language] || '').trim()) {
      setErrorMsg('Please write your solution before submitting.');
      return;
    }
    setErrorMsg('');
    setPhase('submitting');

    try {
      // Step 1: Save submission
      const { data: subData } = await api.post('/user/submissions', {
        problem_id: problem.id,
        code,
        language,
        proof_url: proofUrl,
      });
      const sid = subData.submission?.id;
      setSubmissionId(sid);

      // Step 2: Send to agent for analysis
      setPhase('analyzing');
      const { data: analysisData } = await api.post(`/user/submissions/${sid}/analyze`, {});

      setResult({
        score: analysisData.score,
        qualityScore: analysisData.quality_score,
        maxScore: analysisData.max_score,
        feedback: analysisData.feedback,
        scoreUpdated: analysisData.score_updated,
        scoreDelta: analysisData.score_delta,   // actual pts added this time
        oldScore: analysisData.old_score,
      });
      setPhase('done');
      onSubmitted?.();

      // Refresh past submissions
      api.get('/user/submissions', { params: { problem_id: problem.id } })
        .then(r => setPastSubmissions(r.data.submissions || []))
        .catch(() => {});

    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Submission failed.');
      setPhase('error');
    }
  };

  // Use quality_score (0-10) for color/label thresholds
  const qs = result?.qualityScore ?? result?.score ?? 0;

  const scoreColor = result
    ? qs >= 8 ? '#4ade80' : qs >= 5 ? '#fb923c' : '#f87171'
    : '#a855f7';

  const scoreBg = result
    ? qs >= 8 ? 'rgba(34,197,94,0.08)' : qs >= 5 ? 'rgba(249,115,22,0.08)' : 'rgba(239,68,68,0.08)'
    : 'rgba(168,85,247,0.08)';

  const scoreLabel = result
    ? qs >= 9 ? '🏆 Excellent!' : qs >= 7 ? '✅ Accepted' : qs >= 5 ? '⚠️ Could Be Better' : '❌ Needs Work'
    : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#0d1117',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ─── Top Navbar ─────────────────────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0,
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', gap: 12,
      }}>
        {/* Left: Logo + Problem Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 6,
            background: 'linear-gradient(135deg,rgba(168,85,247,0.25),rgba(249,115,22,0.15))',
            border: '1px solid rgba(168,85,247,0.3)',
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7' }}>DSA</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fb923c' }}>Tracker</span>
          </div>
          <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>›</span>
          <span style={{
            color: '#e6edf3', fontWeight: 600, fontSize: '0.88rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320,
          }}>
            {problem.title}
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
            background: DIFF_BG[problem.difficulty],
            color: DIFF_COLOR[problem.difficulty],
            border: `1px solid ${DIFF_COLOR[problem.difficulty]}40`,
            textTransform: 'capitalize', flexShrink: 0,
          }}>
            {problem.difficulty}
          </span>
        </div>

        {/* Center: Phase indicator */}
        {phase === 'analyzing' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 6,
            background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
            color: '#c084fc', fontSize: '0.82rem', fontWeight: 600,
            animation: 'pulse 1.5s infinite',
          }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
            AI Agent is analyzing your code...
          </div>
        )}

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {problem.external_url && (
            <a
              href={problem.external_url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                background: 'transparent', border: '1px solid #30363d', color: '#8b949e',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              🔗 Problem Link
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 600,
              background: 'transparent', border: '1px solid #30363d', color: '#8b949e',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✕ Close
          </button>
          {phase === 'idle' || phase === 'error' ? (
            <button
              onClick={handleSubmit}
              style={{
                padding: '7px 20px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 700,
                background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 12px rgba(168,85,247,0.4)',
              }}
            >
              🚀 Submit
            </button>
          ) : phase === 'submitting' || phase === 'analyzing' ? (
            <button disabled style={{
              padding: '7px 20px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 700,
              background: '#21262d', border: '1px solid #30363d', color: '#6e7681',
              cursor: 'not-allowed', fontFamily: 'inherit',
            }}>
              ⏳ {phase === 'submitting' ? 'Saving...' : 'Analyzing...'}
            </button>
          ) : (
            <button
              onClick={() => { setPhase('idle'); setResult(null); setErrorMsg(''); }}
              style={{
                padding: '7px 20px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 700,
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ↩ Try Again
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Split Pane ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT PANEL: Problem Description ─────────────────────────────── */}
        <div style={{
          width: '42%', minWidth: 320, maxWidth: 560,
          background: '#0d1117',
          borderRight: '1px solid #21262d',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Left Tab Bar */}
          <div style={{
            display: 'flex', borderBottom: '1px solid #21262d',
            background: '#161b22', flexShrink: 0,
          }}>
            {[
              { key: 'description', label: '📋 Description' },
              { key: 'submissions', label: `📤 Submissions${pastSubmissions.length > 0 ? ` (${pastSubmissions.length})` : ''}` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveLeftTab(t.key)}
                style={{
                  padding: '11px 18px', background: 'transparent', border: 'none',
                  fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  color: activeLeftTab === t.key ? '#e6edf3' : '#6e7681',
                  borderBottom: activeLeftTab === t.key ? '2px solid #a855f7' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Left Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

            {/* Description Tab */}
            {activeLeftTab === 'description' && (
              <div style={{ color: '#c9d1d9', fontSize: '0.88rem', lineHeight: 1.7 }}>
                {/* Title */}
                <h2 style={{ color: '#e6edf3', fontWeight: 700, fontSize: '1.15rem', marginBottom: 12 }}>
                  {problem.title}
                </h2>

                {/* Meta badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700,
                    background: DIFF_BG[problem.difficulty], color: DIFF_COLOR[problem.difficulty],
                    border: `1px solid ${DIFF_COLOR[problem.difficulty]}40`, textTransform: 'capitalize',
                  }}>
                    {problem.difficulty}
                  </span>
                  {problem.topic_name && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                      background: 'rgba(168,85,247,0.1)', color: '#c084fc',
                      border: '1px solid rgba(168,85,247,0.25)',
                    }}>
                      📂 {problem.topic_name}
                    </span>
                  )}
                  {problem.is_daily && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                      background: 'rgba(249,115,22,0.1)', color: '#fb923c',
                      border: '1px solid rgba(249,115,22,0.25)',
                    }}>
                      📅 Daily Problem
                    </span>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: 22 }}>
                  {renderDescription(problem.description)}
                </div>

                {/* Examples */}
                {(problem.sample_input || problem.sample_output) && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 10, fontSize: '0.9rem' }}>
                      Example:
                    </div>
                    <div style={{
                      background: '#161b22', borderRadius: 8,
                      border: '1px solid #21262d', overflow: 'hidden',
                    }}>
                      {problem.sample_input && (
                        <div style={{ padding: '10px 14px', borderBottom: problem.sample_output ? '1px solid #21262d' : 'none' }}>
                          <span style={{ color: '#7d8590', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Input
                          </span>
                          <pre style={{ margin: '6px 0 0', color: '#e6edf3', fontSize: '0.84rem', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap' }}>
                            {problem.sample_input}
                          </pre>
                        </div>
                      )}
                      {problem.sample_output && (
                        <div style={{ padding: '10px 14px' }}>
                          <span style={{ color: '#7d8590', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Output
                          </span>
                          <pre style={{ margin: '6px 0 0', color: '#4ade80', fontSize: '0.84rem', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap' }}>
                            {problem.sample_output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 10, fontSize: '0.9rem' }}>
                      Constraints:
                    </div>
                    <div style={{
                      background: '#161b22', borderRadius: 8, padding: '12px 14px',
                      border: '1px solid #21262d',
                    }}>
                      <pre style={{ margin: 0, color: '#c9d1d9', fontSize: '0.82rem', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                        {problem.constraints}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {problem.tags?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 8, fontSize: '0.9rem' }}>
                      Topics:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {problem.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                          background: 'rgba(168,85,247,0.08)', color: '#a855f7',
                          border: '1px solid rgba(168,85,247,0.2)',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proof URL field */}
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #21262d' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#7d8590', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔗 Proof URL (optional)
                  </label>
                  <input
                    type="url"
                    value={proofUrl}
                    onChange={e => setProofUrl(e.target.value)}
                    placeholder="https://github.com/... or LinkedIn post..."
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 6, fontSize: '0.82rem',
                      background: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: '0.72rem', color: '#6e7681', marginTop: 5 }}>
                    Submit your LinkedIn post, GitHub link, or any proof of solving
                  </p>
                </div>
              </div>
            )}

            {/* Submissions Tab */}
            {activeLeftTab === 'submissions' && (
              <div>
                <div style={{ fontWeight: 700, color: '#e6edf3', fontSize: '0.9rem', marginBottom: 14 }}>
                  Your Submission History
                </div>
                {pastSubmissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6e7681', fontSize: '0.84rem' }}>
                    No submissions yet for this problem.
                  </div>
                ) : pastSubmissions.map((sub, i) => (
                  <div key={sub.id} style={{
                    background: '#161b22', borderRadius: 8, padding: '12px 14px',
                    border: `1px solid ${sub.status === 'accepted' ? 'rgba(34,197,94,0.3)' : '#21262d'}`,
                    marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: sub.status === 'accepted' ? '#4ade80' : sub.status === 'pending' ? '#fb923c' : '#f87171',
                        textTransform: 'uppercase',
                      }}>
                        {sub.status === 'accepted' ? '✅ Accepted' : sub.status === 'pending' ? '⏳ Pending' : '❌ ' + sub.status}
                      </span>
                      {sub.score != null && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a855f7' }}>
                          {sub.score}/10 pts
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6e7681', marginBottom: 4 }}>
                      {sub.language?.toUpperCase()} · {new Date(sub.submitted_at).toLocaleString()}
                    </div>
                    {sub.agent_feedback && (
                      <div style={{ fontSize: '0.78rem', color: '#8b949e', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
                        "{sub.agent_feedback}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Code Editor ─────────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: '#0d1117', overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Code Toolbar */}
          <div style={{
            height: 46, flexShrink: 0,
            background: '#161b22', borderBottom: '1px solid #21262d',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Language:
              </span>
              <select
                value={language}
                onChange={e => handleLangChange(e.target.value)}
                style={{
                  background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
                  borderRadius: 6, padding: '5px 10px', fontSize: '0.8rem',
                  fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={handleResetCode}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                  background: 'transparent', border: '1px solid #30363d', color: '#8b949e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ↺ Reset
              </button>
              <span style={{ fontSize: '0.72rem', color: '#6e7681' }}>
                {code.split('\n').length} lines
              </span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <Editor
              height="100%"
              language={LANGUAGES.find(l => l.value === language)?.monacoLang || 'python'}
              value={code}
              onChange={v => setCode(v || '')}
              theme="vs-dark"
              onMount={editor => { editorRef.current = editor; }}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                padding: { top: 14, bottom: 14 },
                tabSize: 4,
                automaticLayout: true,
              }}
            />
          </div>

          {/* ── Bottom Result Panel ────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0,
            background: '#161b22',
            borderTop: '1px solid #21262d',
            transition: 'all 0.3s ease',
          }}>
            {/* Tab bar for bottom panel */}
            <div style={{ display: 'flex', borderBottom: '1px solid #21262d' }}>
              <div style={{
                padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600,
                color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {phase === 'done' ? '🤖 AI Evaluation Result' : '🧪 Test Result'}
              </div>
            </div>

            {/* Bottom Panel Content */}
            <div style={{ padding: '14px 18px', minHeight: 80 }}>

              {/* Idle state */}
              {(phase === 'idle') && (
                <div style={{ color: '#6e7681', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Write your solution and click</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontSize: '0.78rem', fontWeight: 600 }}>🚀 Submit</span>
                  <span>to get AI-powered evaluation</span>
                </div>
              )}

              {/* Error */}
              {(phase === 'error') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f87171', fontSize: '0.84rem' }}>
                  <span style={{ fontSize: '1rem' }}>❌</span>
                  {errorMsg}
                </div>
              )}

              {/* Loading */}
              {(phase === 'submitting' || phase === 'analyzing') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#c084fc', fontSize: '0.84rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {phase === 'submitting' ? '💾' : '🤖'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {phase === 'submitting' ? 'Saving your solution...' : 'AI Agent is evaluating your code...'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: 3 }}>
                      {phase === 'analyzing' ? 'Using Groq LLM to analyze correctness, time & space complexity' : 'Please wait'}
                    </div>
                  </div>
                  <div style={{
                    marginLeft: 'auto',
                    width: 28, height: 28, borderRadius: '50%',
                    border: '3px solid rgba(168,85,247,0.2)',
                    borderTop: '3px solid #a855f7',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              )}

              {/* Result */}
              {phase === 'done' && result && (
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Score Block */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '12px 20px', borderRadius: 10,
                    background: scoreBg,
                    border: `1px solid ${scoreColor}40`,
                    minWidth: 130, flexShrink: 0, gap: 4,
                  }}>
                    {/* Earned / Max points */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                        {result.score}
                      </span>
                      <span style={{ fontSize: '1rem', color: '#6e7681', fontWeight: 600 }}>
                        /{result.maxScore ?? result.score}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6e7681', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      pts earned
                    </div>
                    {/* Quality stars (based on 0-10 quality) */}
                    <div style={{ marginTop: 4 }}>
                      <ScoreStars score={qs} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6e7681' }}>
                      Quality: {qs}/10
                    </div>
                    <div style={{ marginTop: 4, fontSize: '0.72rem', fontWeight: 700, color: scoreColor }}>
                      {scoreLabel}
                    </div>
                  </div>

                  {/* Feedback */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e6edf3' }}>
                        🤖 Agent Feedback
                      </span>
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(168,85,247,0.12)', color: '#a855f7', fontWeight: 600,
                      }}>
                        Groq AI
                      </span>
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(251,146,60,0.1)', color: '#fb923c', fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <p style={{
                      margin: 0, fontSize: '0.84rem', color: '#c9d1d9',
                      lineHeight: 1.65, fontStyle: 'italic',
                    }}>
                      "{result.feedback}"
                    </p>
                    <div style={{
                      marginTop: 10, fontSize: '0.74rem', color: '#6e7681',
                      display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
                    }}>
                      {result.scoreUpdated && result.scoreDelta > 0 ? (
                        result.oldScore > 0 ? (
                          // Improved on a previously solved problem
                          <span>
                            📈 Score improved! <strong style={{ color: scoreColor }}>+{result.scoreDelta}</strong> pts added
                            <span style={{ color: '#555' }}> (was {result.oldScore} → now {result.score})</span>
                          </span>
                        ) : (
                          // First time solving this problem
                          <span>
                            ⭐ <strong style={{ color: scoreColor }}>+{result.scoreDelta}</strong> / {result.maxScore ?? result.score} pts added to your profile
                          </span>
                        )
                      ) : (
                        // No points added — same or lower score on resubmit
                        <span style={{ color: '#f97316' }}>
                          ⚠ Score not improved — your best score of <strong>{result.oldScore ?? result.score}</strong> pts is kept. No points deducted.
                        </span>
                      )}
                      <span style={{ color: '#4d4d4d' }}>·</span>
                      <span>Max for {problem.difficulty}: <strong style={{ color: '#a855f7' }}>{result.maxScore ?? result.score} pts</strong></span>
                    </div>
                  </div>

                  {/* Done button */}
                  <button
                    onClick={() => { onClose(); }}
                    style={{
                      alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 6,
                      background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none',
                      color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >
                    ✓ Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spinner CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
