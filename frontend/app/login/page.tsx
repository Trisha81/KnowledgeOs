'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, Mail, Lock, Zap, ArrowRight, User,
  Building2, Loader2, CheckCircle, AlertCircle, Sparkles,
} from 'lucide-react';
import { loginAPI, registerAPI } from '../../lib/api';
import { useAuth } from '../../components/AuthProvider';

/* ─── Demo credentials banner ───────────────────────────────────── */
const DEMO_CREDS = [
  { label: 'Admin', email: 'admin@knowledgeos.dev', password: 'admin123', role: 'admin', color: '#6366f1' },
  { label: 'Employee', email: 'employee@knowledgeos.dev', password: 'employee123', role: 'employee', color: '#22d3ee' },
];

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register extra fields
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  const handleDemo = (cred: typeof DEMO_CREDS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let res: any;
      if (mode === 'login') {
        res = await loginAPI(email, password);
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        res = await registerAPI(name, email, password, department);
        if (res.warning) setSuccess(res.warning);
      }
      login(res.token, res.user);
      router.push('/');
    } catch (err: any) {
      const msg = err.message?.includes('API Error:')
        ? (() => { try { return JSON.parse(err.message.split(' - ')[1])?.error; } catch { return err.message; } })()
        : err.message;
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-orb orb-3" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-container">
        {/* Left panel — branding */}
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-logo">
              <Zap size={28} />
            </div>
            <span className="auth-brand-name">Knowledge<span>OS</span></span>
          </div>

          <div className="auth-left-content">
            <h1 className="auth-hero-title">
              Enterprise AI<br />Knowledge at<br />
              <span className="auth-hero-gradient">Your Fingertips</span>
            </h1>
            <p className="auth-hero-sub">
              RAG-powered search, intelligent gap analysis, and AI-assisted document management — all in one platform.
            </p>

            <div className="auth-features">
              {[
                { icon: '🔍', title: 'RAG-powered search', desc: 'Find answers across all documents instantly' },
                { icon: '🤖', title: 'AI Knowledge Chat', desc: 'Chat with your enterprise knowledge base' },
                { icon: '📊', title: 'Gap Analysis', desc: 'Discover and fill knowledge gaps proactively' },
                { icon: '🐙', title: 'GitHub Nest', desc: 'Track commits, diffs, and AI project insights' },
              ].map((f) => (
                <div key={f.title} className="auth-feature-item">
                  <span className="auth-feature-icon">{f.icon}</span>
                  <div>
                    <div className="auth-feature-title">{f.title}</div>
                    <div className="auth-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-left-footer">
            <Sparkles size={12} /> KnowledgeOS © 2026 — AI-Powered Knowledge Management
          </div>
        </div>

        {/* Right panel — form */}
        <div className="auth-right">
          <div className="auth-card">
            {/* Mode switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setError(''); }}
                id="tab-login"
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                onClick={() => { setMode('register'); setError(''); }}
                id="tab-register"
              >
                Create Account
              </button>
            </div>

            <div className="auth-card-header">
              <h2 className="auth-card-title">
                {mode === 'login' ? 'Welcome back 👋' : 'Join KnowledgeOS 🚀'}
              </h2>
              <p className="auth-card-sub">
                {mode === 'login'
                  ? 'Sign in to access your enterprise knowledge hub'
                  : 'Create your account to get started'}
              </p>
            </div>

            {/* Demo credentials */}
            {mode === 'login' && (
              <div className="auth-demo-section">
                <div className="auth-demo-label">
                  <span>⚡ Quick demo access</span>
                </div>
                <div className="auth-demo-chips">
                  {DEMO_CREDS.map((c) => (
                    <button
                      key={c.email}
                      className="auth-demo-chip"
                      onClick={() => handleDemo(c)}
                      id={`demo-${c.label.toLowerCase()}`}
                      style={{ borderColor: c.color + '40', color: c.color }}
                    >
                      <span className="auth-demo-role">{c.label}</span>
                      <span className="auth-demo-email">{c.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <div className="auth-alert error" role="alert">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="auth-alert success" role="alert">
                <CheckCircle size={15} />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {mode === 'register' && (
                <>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-name">Full Name</label>
                    <div className="auth-input-wrap">
                      <User size={16} className="auth-input-icon" />
                      <input
                        id="auth-name"
                        type="text"
                        className="auth-input"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-dept">Department <span className="auth-optional">(optional)</span></label>
                    <div className="auth-input-wrap">
                      <Building2 size={16} className="auth-input-icon" />
                      <input
                        id="auth-dept"
                        type="text"
                        className="auth-input"
                        placeholder="Engineering, Product, HR…"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    className="auth-input"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="auth-password">Password</label>
                  {mode === 'login' && (
                    <a href="#" className="auth-forgot" onClick={(e) => e.preventDefault()}>
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="auth-password"
                    type={showPw ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading || !email || !password}
                id="auth-submit-btn"
              >
                {loading ? (
                  <><Loader2 size={18} className="spinner" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                ) : (
                  <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="auth-footer-text">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button className="auth-link-btn" onClick={() => { setMode('register'); setError(''); }}>
                    Create one free
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button className="auth-link-btn" onClick={() => { setMode('login'); setError(''); }}>
                    Sign in instead
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
