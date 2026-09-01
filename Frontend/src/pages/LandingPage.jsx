import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { api } from '../api';
import {
  LogoIcon,
  CodeIcon,
  CheckCircleIcon,
  ShieldIcon,
  FlameIcon,
  SparklesIcon,
  ArrowRightIcon,
  GoogleIcon,
  UsersIcon,
  LayersIcon,
  XIcon,
  SendIcon,
  ExternalLinkIcon
} from '../components/Icons';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'contribute' | 'about' | 'contact' | null
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });

  // ── Auto-redirect if already logged in ────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return; // Not logged in — stay on landing page

        // Fetch role from backend to decide where to route
        try {
          const res = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const role = res.data?.user?.role;
          if (role === 'admin') {
            navigate('/admin-dashboard', { replace: true });
          } else {
            navigate('/user-dashboard', { replace: true });
          }
        } catch {
          // Fallback to reading from Supabase directly
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile?.role === 'admin') {
            navigate('/admin-dashboard', { replace: true });
          } else {
            navigate('/user-dashboard', { replace: true });
          }
        }
      } catch {
        // Silently ignore — stay on landing page
      }
    };
    checkSession();
  }, [navigate]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setActiveModal(null);
      setContactForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
    }, 2000);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#090d16', color: '#f8fafc', overflow: 'hidden' }}>
      {/* Ambient Multi-Color Gradient Mesh Background (Blue, Green, Red) */}
      <div className="ambient-glow-wrapper">
        <div className="glow-orb glow-blue" />
        <div className="glow-orb glow-green" />
        <div className="glow-orb glow-red" />
      </div>

      {/* Top Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Left: App Name and Glowing Badge */}
          <div
            onClick={() => { setActiveModal(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <LogoIcon size={36} />
            <span style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px' }} className="grad-text-tricolor">
              DSA_Tracker
            </span>
          </div>

          {/* Right: Navigation Links & Get Started */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button
              onClick={() => { setActiveModal(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#f8fafc'}
            >
              Home
            </button>

            <button
              onClick={() => setActiveModal('contribute')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#34d399'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Contribute
            </button>

            <button
              onClick={() => setActiveModal('about')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              About
            </button>

            <button
              onClick={() => setActiveModal('contact')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Contact Us
            </button>

            <button
              onClick={() => navigate('/signUp')}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.9rem', borderRadius: '24px' }}
            >
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '4.5rem 2rem 5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto' }}>
          {/* Top Pill Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 18px',
            borderRadius: '30px',
            fontSize: '0.85rem',
            color: '#93c5fd',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)'
          }}>
            <SparklesIcon size={16} color="#60a5fa" />
            <span>Next-Gen Enterprise DSA & Interview Mastery</span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-1.5px',
            marginBottom: '1.5rem'
          }}>
            Conquer Daily DSA with <br />
            <span className="grad-text-tricolor"> Consistency</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: 'var(--text-muted)',
            lineHeight: '1.65',
            marginBottom: '2.75rem'
          }}>
            A high-velocity platform designed for software engineers. Solve daily curated algorithmic challenges (Easy, Medium, Hard), track your personal assignments, and maintain relentless consistency.
          </p>

          {/* Primary CTA Button */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/signUp')}
              className="btn-primary"
              style={{
                padding: '16px 40px',
                fontSize: '1.1rem',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
                cursor: 'pointer'
              }}
            >
              <span>Get Started</span>
              <ArrowRightIcon size={20} />
            </button>

            <button
              onClick={() => setActiveModal('about')}
              className="btn-secondary"
              style={{ padding: '16px 32px', fontSize: '1.05rem', borderRadius: '30px' }}
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Glossy Tri-Color Flashcards Section */}
        <section style={{ marginTop: '5.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
              Engineered for Coding Interview Success
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              Everything you need to master problem-solving patterns and crack top tech interviews.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.75rem',
          }}>
            {/* Card 1: Electric Blue */}
            <div className="glass-panel glossy-card-blue glass-panel-hover" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <CodeIcon size={26} color="#60a5fa" />
              </div>
              <div className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>Daily Engine</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>
                Curated Daily Challenges
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                Handpicked daily trio (Easy, Medium, Hard) refreshed every 24 hours to hone your algorithmic intuition without decision fatigue.
              </p>
            </div>

            {/* Card 2: Neon Emerald Green */}
            <div className="glass-panel glossy-card-green glass-panel-hover" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <CheckCircleIcon size={26} color="#34d399" />
              </div>
              <div className="badge badge-easy" style={{ marginBottom: '0.75rem' }}>Active Tracker</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>
                Self-Paced Assignment
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                Assign challenges into your personal queue, update execution states (Started, Completed), and attach your GitHub / LeetCode solution proof links.
              </p>
            </div>

            {/* Card 3: Vibrant Crimson Red */}
            <div className="glass-panel glossy-card-red glass-panel-hover" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <ShieldIcon size={26} color="#f87171" />
              </div>
              <div className="badge badge-hard" style={{ marginBottom: '0.75rem' }}>Admin Command</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>
                Admin Command Center
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                Admins broadcast daily sets, track student solve rates, manage registered users, and organize curated interview sheets with complete CRUD tools.
              </p>
            </div>

            {/* Card 4: Multi-gradient Analytics */}
            <div className="glass-panel glass-panel-hover" style={{
              padding: '2rem',
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)'
            }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <FlameIcon size={26} color="#c084fc" />
              </div>
              <div className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '0.75rem' }}>
                Consistency
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>
                Streaks & Mastery Ratios
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                Stay accountable with daily problem tracking, categorized difficulty breakdowns, and persistent habit building designed for engineers.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(9, 13, 22, 0.95)',
        padding: '3rem 2rem 2rem'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoIcon size={28} />
            <span style={{ fontWeight: '700', fontSize: '1.1rem' }} className="grad-text-tricolor">
              DSA_Tracker
            </span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>
            © {new Date().getFullYear()} DSA Tracker. Crafted with Enterprise Glossy Precision.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button onClick={() => setActiveModal('about')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.88rem' }}>
              About
            </button>
            <button onClick={() => setActiveModal('contribute')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.88rem' }}>
              Contribute
            </button>
            <button onClick={() => setActiveModal('contact')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.88rem' }}>
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Contribute Modal */}
      {activeModal === 'contribute' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel glossy-card-green" style={{ width: '100%', maxWidth: '600px', padding: '2.25rem', position: 'relative' }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XIcon size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <span className="badge badge-easy">Open Ecosystem</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>
              Contribute to DSA Tracker
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              DSA Tracker thrives on quality problem curation and community engagement. You can contribute in multiple ways:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#e2e8f0', fontSize: '0.92rem' }}>
                <CheckCircleIcon size={18} color="#34d399" />
                <span><strong>Curate Problem Sets:</strong> Propose high-yield algorithmic challenges for inclusion in our daily sets.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#e2e8f0', fontSize: '0.92rem' }}>
                <CheckCircleIcon size={18} color="#34d399" />
                <span><strong>Submit Solution Templates:</strong> Share optimized clean solutions in Python, C++, Java, or JavaScript.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#e2e8f0', fontSize: '0.92rem' }}>
                <CheckCircleIcon size={18} color="#34d399" />
                <span><strong>Interview Sheets:</strong> Suggest topic-wise roadmaps (Dynamic Programming, Graph Theory, Sliding Window).</span>
              </li>
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setActiveModal(null)} style={{
                padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                ← Close
              </button>
              <button onClick={() => { setActiveModal(null); navigate('/signUp'); }} className="btn-primary btn-success">
                Join as Contributor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {activeModal === 'about' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel glossy-card-blue" style={{ width: '100%', maxWidth: '640px', padding: '2.25rem', position: 'relative' }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XIcon size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <span className="badge badge-blue">Our Mission</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>
              About DSA Tracker
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              DSA Tracker was built to solve the single greatest obstacle in coding interview preparation: <strong>consistency</strong>.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.75rem' }}>
              Instead of browsing through thousands of disconnected questions, students receive daily targeted problems, track their progress through self-assigned queues, and verify their solutions with external proof links while administrators monitor cohort velocity.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#60a5fa' }}>100%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Focused Daily Learning</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#34d399' }}>Instant</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Self-Paced Tracking</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setActiveModal(null)} style={{
                padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                ← Close
              </button>
              <button onClick={() => { setActiveModal(null); navigate('/signUp'); }} className="btn-primary">
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {activeModal === 'contact' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel glossy-card-red" style={{ width: '100%', maxWidth: '580px', padding: '2.25rem', position: 'relative' }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XIcon size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <span className="badge badge-hard">Get in Touch</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
              Contact DSA Tracker Team
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
              Have suggestions, problem requests, or institutional inquiries? Send us a message.
            </p>

            {contactSubmitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircleIcon size={48} color="#34d399" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginTop: '1rem' }}>
                  Message Sent Successfully!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Thank you for reaching out. We will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Your Name</label>
                  <input
                    className="glass-input"
                    required
                    placeholder="Enter your name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    className="glass-input"
                    required
                    placeholder="you@example.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Subject</label>
                  <select
                    className="glass-input"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Problem Suggestion">Problem Set Suggestion</option>
                    <option value="Bug Report">Platform Feedback / Bug Report</option>
                    <option value="College Partnership">College / University Partnership</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Message</label>
                  <textarea
                    rows={4}
                    className="glass-input"
                    required
                    placeholder="Tell us how we can help..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setActiveModal(null)} style={{
                    padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                  >
                    ← Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-danger">
                    <SendIcon size={16} /> Send Message
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}