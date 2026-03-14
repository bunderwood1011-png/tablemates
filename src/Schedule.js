import React from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const OPTIONS = ['busy', 'moderate', 'relaxed'];

const optionStyles = {
  busy: {
    background: '#FCEBEB',
    color: '#A32D2D',
    border: '1px solid #F5C9C9'
  },
  moderate: {
    background: '#FAEEDA',
    color: '#BA7517',
    border: '1px solid #F1D6A8'
  },
  relaxed: {
    background: '#E1F5EE',
    color: '#1D9E75',
    border: '1px solid #BFE7D8'
  }
};

function Schedule({ schedule, setSchedule }) {
  const updateDay = (day, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: value
    }));
  };

  return (
    <div>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid #ececec'
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: '#1a1a1a' }}>
          your weekly pace
        </div>
        <div style={{ fontSize: '13px', color: '#777', lineHeight: '1.5' }}>
          set how hectic each night feels so Tablemates can plan meals that actually match real life.
        </div>
      </div>

      {DAYS.map((day) => (
        <div
          key={day}
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid #ececec'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '12px'
            }}
          >
            {day}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {OPTIONS.map((option) => {
              const isActive = (schedule?.[day] || 'relaxed') === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateDay(day, option)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    fontWeight: '600',
                    textTransform: 'lowercase',
                    transition: 'all 0.15s ease',
                    ...(isActive
                      ? optionStyles[option]
                      : {
                          background: '#f6f6f6',
                          color: '#777',
                          border: '1px solid #e3e3e3'
                        })
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Schedule;