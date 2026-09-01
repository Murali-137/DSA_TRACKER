import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { api } from '../api';
import { LogoIcon, GoogleIcon, ArrowRightIcon } from '../components/Icons';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectByRole = (r) => {
    navigate(r === 'admin' ? '/admin-dashboard' : '/user-dashboard', { replace: true });
  };

  const resolveRoleAndRedirect = async (user, sessionToken) => {
    let role = user.user_metadata?.role || null;

    // 1. Direct Supabase query (instant)
    try {
      const { data: p } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (p?.role) role = p.role;
    } catch (err) {
      console.warn('Profile role fetch notice:', err);
    }

    // 2. Sync with backend API
    if (!role) {
      try {
        const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
        const res = await api.post('/signup', {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        }, { headers });
        if (res.data?.user?.role) role = res.data.user.role;
      } catch (err) {
        console.warn('Signup sync notice:', err);
      }
    }

    redirectByRole(role || 'user');
  };

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await resolveRoleAndRedirect(session.user, session.access_token);
    };
    checkSession();
  }, []); // eslint-disable-line

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (err) throw err;
        if (data.user) {
          const token = data.session?.access_token;
          await resolveRoleAndRedirect(data.user, token);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user) {
          const token = data.session?.access_token;
          await resolveRoleAndRedirect(data.user, token);
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncAndRedirect(session.user);
      }
    };
    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
      handleOAuthCallback();
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07030f', padding: '1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient Glow Orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '15%', width: 600, height: 600, borderRadius: '50%', filter: 'blur(120px)', opacity: 0.16, background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 500, height: 500, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.13, background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
      </div>

      {/* ← Back to Home */}
      <div style={{ position: 'fixed', top: 18, left: 22, zIndex: 10 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 10,
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.22)',
            color: '#c084fc', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.18)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.22)'; }}
        >
          ← Back to Home
        </button>
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440,
        background: 'linear-gradient(135deg, rgba(20,8,50,0.95) 0%, rgba(10,5,25,0.98) 100%)',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: '24px', padding: '2.5rem',
        boxShadow: '0 32px 100px rgba(0,0,0,0.8), 0 0 60px rgba(168,85,247,0.12)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <LogoIcon size={44} />
          <h1 style={{
            marginTop: '0.75rem', fontSize: '1.6rem', fontWeight: 800,
            background: 'linear-gradient(90deg, #a855f7, #f97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            DSA_Tracker
          </h1>
          <p style={{ color: '#a78bca', fontSize: '0.85rem', marginTop: '4px' }}>
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to start tracking problems.'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', background: 'rgba(168,85,247,0.08)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem' }}>
          {['login', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: mode === m ? 'rgba(168,85,247,0.3)' : 'transparent',
                color: mode === m ? '#e9d5ff' : '#a78bca',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Auth Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'signup' && (
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input
                className="glass-input"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label">Email Address</label>
            <input
              className="glass-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              className="glass-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.83rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '4px', width: '100%', padding: '13px' }}
            disabled={loading}
          >
            {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            {!loading && <ArrowRightIcon size={15} />}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.25rem 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(168,85,247,0.15)' }} />
          <span style={{ color: '#6b5a87', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(168,85,247,0.15)' }} />
        </div>

        {/* Google OAuth Button */}
        <button
          className="auth-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
        >
          <GoogleIcon size={20} />
          <span>Continue with Google</span>
        </button>

        <p style={{ textAlign: 'center', color: '#6b5a87', fontSize: '0.74rem', marginTop: '1.5rem' }}>
          By continuing, you agree to our Terms of Service & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
