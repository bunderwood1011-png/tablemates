import React, { useEffect, useState } from 'react';

function Splash({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFading(true), 1800);
    const timer2 = setTimeout(() => onDone(), 2400);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#f7f7f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.6s ease',
      zIndex: 9999
    }}>
      <img
        src="/tablemate_logo.png"
        alt="Tablemates"
        style={{ width: '220px', marginBottom: '16px' }}
      />
      <p style={{ fontSize: '14px', color: '#aaa', fontFamily: 'sans-serif' }}>dinner, handled.</p>
    </div>
  );
}

export default Splash;