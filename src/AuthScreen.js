import React, { useState } from 'react';
import { supabase } from './lib/supabase';

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        if (!inviteCode.trim()) {
          setError('An invite code is required to create an account.');
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        const { data: redeemed, error: redeemError } = await supabase
          .rpc('redeem_invite_code', { invite_code: inviteCode.trim() });

        if (redeemError || !redeemed) {
          setError('Invalid or already used invite code. Contact us if you think this is a mistake.');
          setLoading(false);
          return;
        }

        setMessage('Account created! Log in to get started.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'white',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '32px', color: '#1a1a1a' }}>
            table<span style={{ color: '#1D9E75' }}>mates</span>
          </h1>
          <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
            dinner, handled.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
              setInviteCode('');
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: mode === 'login' ? '#1D9E75' : '#eef0ee',
              color: mode === 'login' ? 'white' : '#666',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Log in
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setMessage('');
              setInviteCode('');
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: mode === 'signup' ? '#1D9E75' : '#eef0ee',
              color: mode === 'signup' ? 'white' : '#666',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#555' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid #ddd',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#555' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 6 characters"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid #ddd',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {mode === 'signup' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#555' }}>
                Invite code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter your invite code"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: '#FCEBEB',
                color: '#A32D2D',
                fontSize: '13px'
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: '#E1F5EE',
                color: '#1D9E75',
                fontSize: '13px'
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: '#1D9E75',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthScreen;