import React, { useEffect, useState } from 'react';

function Splash({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFading(true), 1800);
    const timer2 = setTimeout(() => onDone(), 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f7f7f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <img
          src="/tablemate_logo.png"
          alt="Tablemates"
          style={{
            width: '220px',
            display: 'block',
          }}
        />

        <div
          style={{
            fontSize: '15px',
            color: '#777',
            fontFamily: 'sans-serif',
            marginTop: '-6px', // pulls it snug under logo
            lineHeight: 1.2,
          }}
        >
          Dinner, handled.
        </div>
      </div>
    </div>
  );
}

export default Splash;