import React from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const paceStyles = {
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

const emptyDay = {
  items: []
};

function formatTime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTime(value) {
  if (!value) return null;

  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function normalizeHour(hour, meridiem) {
  let h = Number(hour);
  if (Number.isNaN(h)) return null;

  if (meridiem) {
    const m = meridiem.toLowerCase();
    if (m === 'pm' && h < 12) h += 12;
    if (m === 'am' && h === 12) h = 0;
  }

  return h;
}

function parseActivityText(text) {
  if (!text || typeof text !== 'string') {
    return { title: '', start: '', end: '' };
  }

  const trimmed = text.trim();

  const match = trimmed.match(
    /^(.*?)(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)$/i
  );

  if (!match) {
    return {
      title: trimmed,
      start: '',
      end: ''
    };
  }

  const [, rawTitle, startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem] = match;

  let startH = normalizeHour(startHour, startMeridiem);
  let endH = normalizeHour(endHour, endMeridiem);

  const startM = Number(startMinute || 0);
  const endM = Number(endMinute || 0);

  // Assume afternoon/evening for common family schedule entries like "4-7"
  if (!startMeridiem && startH !== null && startH >= 1 && startH <= 8) {
    startH += 12;
  }

  if (!endMeridiem && endH !== null && endH >= 1 && endH <= 8) {
    endH += 12;
  }

  return {
    title: rawTitle.trim(),
    start: startH !== null ? formatTime(startH * 60 + startM) : '',
    end: endH !== null ? formatTime(endH * 60 + endM) : ''
  };
}

function buildActivityText(item) {
  if (!item) return '';

  if (item.rawText) return item.rawText;

  if (item.title && item.start && item.end) {
    return `${item.title} ${item.start} - ${item.end}`;
  }

  return item.title || '';
}

function calculatePace(items = []) {
  if (!items.length) return 'relaxed';

  let totalMinutes = 0;
  let longEventCount = 0;

  for (const item of items) {
    const start = parseTime(item.start);
    const end = parseTime(item.end);

    if (start !== null && end !== null && end > start) {
      const duration = end - start;
      totalMinutes += duration;

      if (duration >= 120) {
        longEventCount += 1;
      }
    } else {
      totalMinutes += 45;
    }
  }

  if (totalMinutes >= 180 || items.length >= 3 || longEventCount >= 2) {
    return 'busy';
  }

  if (totalMinutes >= 60 || items.length >= 2) {
    return 'moderate';
  }

  return 'relaxed';
}

function normalizeSchedule(schedule) {
  const normalized = {};

  DAYS.forEach((day) => {
    const existing = schedule?.[day];

    if (existing && typeof existing === 'object' && Array.isArray(existing.items)) {
      normalized[day] = {
        items: existing.items.map((item) => ({
          rawText: item.rawText || '',
          title: item.title || '',
          start: item.start || '',
          end: item.end || ''
        }))
      };
    } else {
      normalized[day] = { ...emptyDay };
    }
  });

  return normalized;
}

function Schedule({ schedule, setSchedule }) {
  const normalizedSchedule = normalizeSchedule(schedule);

  const updateDayItems = (day, items) => {
    setSchedule((prev) => {
      const normalizedPrev = normalizeSchedule(prev);

      return {
        ...normalizedPrev,
        [day]: {
          ...normalizedPrev[day],
          items
        }
      };
    });
  };

  const addActivity = (day) => {
    const items = normalizedSchedule[day]?.items || [];

    updateDayItems(day, [
      ...items,
      {
        rawText: '',
        title: '',
        start: '',
        end: ''
      }
    ]);
  };

  const removeActivity = (day, index) => {
    const items = normalizedSchedule[day]?.items || [];
    updateDayItems(
      day,
      items.filter((_, i) => i !== index)
    );
  };

  const updateActivityFields = (day, index, updates) => {
    const items = normalizedSchedule[day]?.items || [];

    const nextItems = items.map((item, i) =>
      i === index
        ? {
            ...item,
            ...updates
          }
        : item
    );

    updateDayItems(day, nextItems);
  };

  const updateActivityText = (day, index, value) => {
    const parsed = parseActivityText(value);

    updateActivityFields(day, index, {
      rawText: value,
      title: parsed.title,
      start: parsed.start,
      end: parsed.end
    });
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
        <div
          style={{
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#1a1a1a'
          }}
        >
          your weekly pace
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#777',
            lineHeight: '1.5'
          }}
        >
          add what you have going on each night and Tablemates will figure out whether it’s busy, moderate, or relaxed.
        </div>
      </div>

      {DAYS.map((day) => {
        const items = normalizedSchedule[day]?.items || [];
        const pace = calculatePace(items);

        return (
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#1a1a1a'
                }}
              >
                {day}
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'lowercase',
                  ...paceStyles[pace]
                }}
              >
                {pace}
              </div>
            </div>

            {items.length === 0 ? (
              <div
                style={{
                  fontSize: '13px',
                  color: '#888',
                  marginBottom: '12px'
                }}
              >
                Nothing scheduled yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                {items.map((item, index) => (
                  <div
                    key={`${day}-${index}`}
                    style={{
                      border: '1px solid #ececec',
                      borderRadius: '14px',
                      padding: '12px',
                      background: '#fcfcfc'
                    }}
                  >
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Ex. Gymnastics 4-7"
                        value={buildActivityText(item)}
                        onChange={(e) => updateActivityText(day, index, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid #ddd',
                          fontSize: '13px',
                          fontFamily: 'inherit'
                        }}
                      />

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr auto',
                          gap: '8px'
                        }}
                      >
                        <input
                          type="time"
                          value={item.start || ''}
                          onChange={(e) =>
                            updateActivityFields(day, index, {
                              start: e.target.value,
                              rawText: ''
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                            fontSize: '13px',
                            fontFamily: 'inherit'
                          }}
                        />

                        <input
                          type="time"
                          value={item.end || ''}
                          onChange={(e) =>
                            updateActivityFields(day, index, {
                              end: e.target.value,
                              rawText: ''
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                            fontSize: '13px',
                            fontFamily: 'inherit'
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => removeActivity(day, index)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #e3e3e3',
                            background: '#f8f8f8',
                            color: '#666',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => addActivity(day)}
              style={{
                padding: '10px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: '600',
                background: '#f6f6f6',
                color: '#444',
                border: '1px solid #e3e3e3'
              }}
            >
              + Add activity
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Schedule;