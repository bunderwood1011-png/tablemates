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
              week of {week.date}
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
              {DAYS.map(day => week.meals[day] ? (
                <div
                  key={day}
                  style={{ padding: '10px 0', borderBottom: '0.5px solid #f7f7f5', cursor: 'pointer' }}
                  onClick={() => onNavigateToRecipe(week.meals[day])}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>{day}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="recipe-time">{week.meals[day].time}</div>
                      <span style={{ fontSize: '11px', color: '#1D9E75' }}>view recipe</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>{week.meals[day].name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{week.meals[day].description}</div>

                  {week.meals[day].modifications && week.meals[day].modifications.length > 0 && week.meals[day].modifications.some(m => m.person) && (
                    <div className="mods-section" style={{ marginTop: '8px' }}>
                      <div className="mods-label">modifications</div>
                      {week.meals[day].modifications.map((mod, j) => mod.person ? (
                        <div key={j} className="mod-row">
                          <div className="mod-avatar">{mod.person ? mod.person[0] : '?'}</div>
                          <div className="mod-text"><strong>{mod.person}</strong> -- {mod.note}</div>
                        </div>
                      ) : null)}
                    </div>
                  )}
                </div>
              ) : null)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PastWeeks;