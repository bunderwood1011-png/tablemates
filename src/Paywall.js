import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Paywall({ user, daysLeftInTrial }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startCheckout = async (plan) => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const PRO_PRICE_ID = process.env.REACT_APP_STRIPE_PRO_PRICE_ID;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f7f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        {/* Logo / wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a1a', letterSpacing: '-0.02em' }}>
            tablemates
          </div>
          <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>dinner, handled.</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          marginBottom: '16px',
        }}>
          {daysLeftInTrial > 0 ? (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#E46A2E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Your free trial ends in {daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'}
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', lineHeight: '1.3' }}>
                Keep dinner stress-free
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#E46A2E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Start your free trial
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', lineHeight: '1.3' }}>
                7 days free, then $6.99/mo
              </div>
            </div>
          )}

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              'AI-powered weekly meal plans',
              'Built around your family\'s tastes & allergies',
              'Smart grocery list generation',
              'Meal swaps that learn your preferences',
              'Recipe import from any website',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#333' }}>
                <span style={{ color: '#1D9E75', fontWeight: '700', flexShrink: 0 }}>✓</span>
                {f}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <button
            onClick={() => startCheckout('pro')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: loading ? '#ccc' : '#1D9E75',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              cursor: loading ? 'default' : 'pointer',
              marginBottom: '10px',
            }}
          >
            {loading ? 'Redirecting...' : daysLeftInTrial > 0 ? 'Subscribe — $6.99/mo' : 'Start free trial'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '12px', color: '#999', lineHeight: '1.6' }}>
            Cancel anytime. No hidden fees.
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ fontSize: '13px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
