import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function OnboardingScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase
      .from('waitlist')
      .insert([{ email: email.trim().toLowerCase() }]);

    if (error && error.code === '23505') {
      // Already on the list — treat as success
      setSubmitted(true);
    } else if (error) {
      setError('Something went wrong. Please try again.');
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f5',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#fff',
          borderRadius: '28px',
          padding: '36px 28px 28px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '34px', color: '#1a1a1a' }}>
          table<span style={{ color: '#1D9E75' }}>mates</span>
        </h1>

        <p style={{ marginTop: '10px', color: '#666', fontSize: '15px', marginBottom: '28px' }}>
          dinner, handled.
        </p>

        {submitted ? (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
              You're on the list!
            </div>
            <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
              We'll email you when Tablemates is ready for you.
            </div>
          </div>
        ) : (
          <>
            <div style={{
              background: '#f6fcf9',
              border: '1px solid #d0ede3',
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
                Early access — beta (limited)
              </div>
              <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
                Tablemates is currently in private beta. Sign up below and we'll let you know when we're ready for you.
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid #e0e0e0',
                  fontSize: '15px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />

              {error && (
                <div style={{ color: '#e53e3e', fontSize: '13px', marginBottom: '10px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '16px',
                  border: 'none',
                  background: '#1D9E75',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Signing you up...' : 'Sign up for early access'}
              </button>
            </form>
          </>
        )}

        <button
          onClick={onLogin}
          style={{
            marginTop: '20px',
            background: 'none',
            border: 'none',
            color: '#E46A2E',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Have an access code? Log in or sign up here. 
        </button>
      </div>
    </div>
  );
}

export default OnboardingScreen;
