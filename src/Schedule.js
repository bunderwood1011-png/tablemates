import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Schedule() {
  const [schedule, setSchedule] = useState({
    Monday:    { events: [], pace: 'relaxed' },
    Tuesday:   { events: ['Soccer practice 5–7pm'], pace: 'busy' },
    Wednesday: { events: ['Piano lessons 4–5pm'], pace: 'moderate' },
    Thursday:  { events: [], pace: 'relaxed' },
    Friday:    { events: [], pace: 'relaxed' },
    Saturday:  { events: [], pace: 'relaxed' },
    Sunday:    { events: [], pace: 'relaxed' },
  });

  const [newEvent, setNewEvent] = useState('');
  const [activeDay, setActiveDay] = useState(null);

  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const paceLabel = {
    relaxed: 'open evening',
    moderate: 'moderate',
    busy: 'busy night'
  };

  const paceClass = {
    relaxed: 'pace-relaxed',
    moderate: 'pace-moderate',
    busy: 'pace-busy'
  };

  const addEvent = (day) => {
    if (!newEvent.trim()) return;
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        events: [...prev[day].events, newEvent.trim()],
        pace: 'busy'
      }
    }));
    setNewEvent('');
    setActiveDay(null);
  };

  const removeEvent = (day, index) => {
    setSchedule(prev => {
      const updated = prev[day].events.filter((_, i) => i !== index);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          events: updated,
          pace: updated.length === 0 ? 'relaxed' : prev[day].pace
        }
      };
    });
  };

  return (
    <div>
      {DAYS.map(day => (
        <div key={day} className={`day-card ${day === today ? 'today-card' : ''}`}>
          <div className="day-header">
            <div className="day-title">
              {day}
              {day === today && <span className="today-pill">tonight</span>}
            </div>
            <span className={`pace-badge ${paceClass[schedule[day].pace]}`}>
              {paceLabel[schedule[day].pace]}
            </span>
          </div>

          <div className="event-list">
            {schedule[day].events.map((event, i) => (
              <div key={i} className="event-tag">
                {event}
                <span className="remove-x" onClick={() => removeEvent(day, i)}>×</span>
              </div>
            ))}
            {activeDay === day ? (
              <div className="input-row">
                <input
                  className="text-input small"
                  placeholder="e.g. Soccer practice 5–7pm"
                  value={newEvent}
                  onChange={e => setNewEvent(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEvent(day)}
                  autoFocus
                />
                <button className="add-tag-btn" onClick={() => addEvent(day)}>+</button>
              </div>
            ) : (
              <button className="add-event-btn" onClick={() => setActiveDay(day)}>+ add event</button>
            )}
          </div>

          {day === today && schedule[day].pace === 'busy' && (
            <div className="suggestion-hint">
              Suggesting quick meals tonight — 20 min or less
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Schedule;