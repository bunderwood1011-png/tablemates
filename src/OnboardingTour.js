import React, { useState } from 'react';

const slides = [
  {
    emoji: '👋',
    title: 'Welcome to Tablemates',
    body: 'Dinner planning, handled. We build your week around your family — preferences, schedules, and all.',
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Add your family',
    body: 'Head to the Home tab and add each family member. Include their likes, dislikes, and any allergies. The more detail, the better your meals.',
  },
  {
    emoji: '📅',
    title: 'Set your weekly schedule',
    body: 'Mark each night as Busy, Moderate, or Relaxed. Busy nights get quick 30-minute meals — relaxed nights can be something more involved.',
  },
  {
    emoji: '✨',
    title: 'Generate your week',
    body: 'Hit "Generate Week" and we\'ll suggest 7 dinners tailored to your family. If anyone needs a modification — like a dairy-free version — it\'s called out automatically.',
  },
  {
    emoji: '🔄',
    title: 'Swap meals & shop',
    body: 'Don\'t love a meal? Swap it for something new. Once your week looks good, generate a shopping list with one tap.',
  },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#fff',
          borderRadius: '28px',
          padding: '36px 28px 28px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '56px', marginBottom: '20px', lineHeight: 1 }}>
          {slide.emoji}
        </div>

        <div
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '12px',
            lineHeight: 1.3,
          }}
        >
          {slide.title}
        </div>

        <div
          style={{
            fontSize: '15px',
            color: '#666',
            lineHeight: 1.6,
            marginBottom: '32px',
            minHeight: '72px',
          }}
        >
          {slide.body}
        </div>

        {/* Progress dots */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '28px',
          }}
        >
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === step ? '#1D9E75' : '#e0e0e0',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? onDone() : setStep(step + 1))}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: '16px',
            border: 'none',
            background: '#1D9E75',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          {isLast ? 'Get started' : 'Next'}
        </button>

        {!isLast && (
          <button
            onClick={onDone}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
