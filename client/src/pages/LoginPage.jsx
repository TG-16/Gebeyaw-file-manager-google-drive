import React, { useState } from 'react';
import { Folder, KeyRound, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'var(--color-bg)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          padding: '36px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <Folder size={28} />
          </div>
          <h1 style={{ fontSize: '1.45rem', marginTop: '6px' }}>Personal Archive</h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
            Organized notes, memories, photos, audios and videos
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--color-danger-subtle)',
              color: 'var(--color-danger)',
              fontSize: '0.86rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--color-text-muted)" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="name@filemanager.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={14} color="var(--color-text-muted)" />
              <span>Password</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px' }}
            disabled={loading}
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '16px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            <ShieldCheck size={14} />
            <span>Encrypted credentials & isolated accounts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
