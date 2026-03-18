import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function PastWeeks({ savedWeeks, setSavedWeeks, onNavigateToRecipe }) {
  const [expanded, setExpanded] = useState(null);

  const deleteWeek = (id) => {
    setSavedWeeks(prev => prev.filter(w => w.id !== id));
  };

  if (!savedWeeks || savedWeeks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📅</div>
        <div className="empty-title">no saved weeks yet</div>
        <div className="empty-sub">plan your week and hit "save week" to build your archive</div>
      </div>
    );
  }

  return (
    <div>
      {savedWeeks.map(week => (
        <div key={week.id} className="past-week-card">
          <div className="past-week-header">
            <div className="past-week-title" onClick={() => setExpanded(expanded === week.id ? null : week.id)}>
              Week of {week.date}
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1D9E75', fontWeight: '400' }}>
                {expanded === week.id ? 'hide' : 'show'}
              </span>
            </div>
            <button onClick={() => deleteWeek(week.id)} style={{ fontSize: '11px', color: '#e24b4a', background: 'none', border: 'none', cursor: 'pointer' }}>
              delete
            </button>
          </div>

          <div className="past-week-preview">
            {DAYS.filter(d => week.meals[d]).slice(0, 3).map(d => week.meals[d].name).join(' · ')} · ...
          </div>

          {expanded === week.id && (
  <div style={{ marginTop: '12px' }}>
    {DAYS.map((day, index) =>
      week.meals[day] ? (
        <div
          key={day}
          onClick={() => onNavigateToRecipe(week.meals[day])}
          style={{
            paddingTop: '14px',
            paddingBottom: '14px',
            borderBottom:
              index < DAYS.length - 1 ? '1px solid #F2B08D' : 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1F2937',
              }}
            >
              {day}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div className="recipe-time">{week.meals[day].time}</div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#E46A2E',
                  fontWeight: '600',
                }}
              >
                view recipe
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '4px',
              lineHeight: '1.4',
            }}
          >
            {week.meals[day].name}
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#6B7280',
              lineHeight: '1.5',
            }}
          >
            {week.meals[day].description}
          </div>

          {week.meals[day].modifications &&
            week.meals[day].modifications.length > 0 &&
            week.meals[day].modifications.some((m) => m.person) && (
              <div className="mods-section" style={{ marginTop: '10px' }}>
                <div className="mods-label">modifications</div>
                {week.meals[day].modifications.map((mod, j) =>
                  mod.person ? (
                    <div key={j} className="mod-row">
                      <div className="mod-avatar">
                        {mod.person ? mod.person[0] : '?'}
                      </div>
                      <div className="mod-text">
                        <strong>{mod.person}</strong> — {mod.note}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
        </div>
      ) : null
    )}
  </div>
)}
      </div>
    ))}
  </div>
);
}

export default PastWeeks;