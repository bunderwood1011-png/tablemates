import React from 'react';

function OnboardingScreen({ onContinue }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f5',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#fff',
          borderRadius: '28px',
          padding: '32px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '34px', color: '#1a1a1a' }}>
            table<span style={{ color: '#1D9E75' }}>mates</span>
          </h1>

          <p style={{ marginTop: '10px', color: '#666', fontSize: '15px' }}>
            dinner, handled.
          </p>
        </div>

        <div
          style={{
            borderRadius: '22px',
            background: '#fcfcfb',
            border: '1px solid #e8ebe8',
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#1D9E75',
              marginBottom: '12px'
            }}
          >
            MEMBERSHIP
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div
              style={{
                border: '1px solid #eef0ee',
                borderRadius: '16px',
                padding: '16px'
              }}
            >
              <div style={{ fontWeight: '700', color: '#1a1a1a' }}>
                Beta Access
              </div>

              <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                Early access to Tablemates while we continue improving the
                experience.
              </div>
            </div>

            <div
              style={{
                border: '2px solid #1D9E75',
                borderRadius: '16px',
                padding: '16px',
                background: '#f6fcf9'
              }}
            >
              <div style={{ fontWeight: '700', color: '#1a1a1a' }}>
                Premium Features
              </div>

              <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                Coming soon: deeper personalization, smarter meal swaps, and
                advanced planning tools.
              </div>
            </div>
          </div>

          <p
            style={{
              marginTop: '14px',
              fontSize: '12px',
              color: '#888',
              textAlign: 'center'
            }}
          >
            Pricing will be introduced once premium features launch.
          </p>
        </div>

        <button
          onClick={onContinue}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: '16px',
            border: 'none',
            background: '#1D9E75',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Continue to login / sign up
        </button>
      </div>
    </div>
  );
}

export default OnboardingScreen;