import React, { useState } from 'react';
import Schedule from './Schedule';

const DINNER_TIME_OPTIONS = [
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
];

function MyHome({ members, setMembers, schedule, setSchedule }) {
  const [sheet, setSheet] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [likes, setLikes] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [showFamily, setShowFamily] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [dinnerSaveStatus, setDinnerSaveStatus] = useState('idle');
  const [isEditingDinner, setIsEditingDinner] = useState(false);

  const openNew = () => {
    setName('');
    setLikes([]);
    setDislikes([]);
    setAllergies([]);
    setActiveInput(null);
    setInputVal('');
    setEditingName(true);
    setSheet('new');
  };

  const openEdit = (member) => {
    setName(member.name);
    setLikes([...(member.likes || [])]);
    setDislikes([...(member.dislikes || [])]);
    setAllergies([...(member.allergies || [])]);
    setActiveInput(null);
    setInputVal('');
    setEditingName(false);
    setSheet(member.id);
  };

  const closeSheet = () => {
    setSheet(null);
    setActiveInput(null);
    setInputVal('');
  };

  const save = () => {
    if (!name.trim()) return;

    if (sheet === 'new') {
      setMembers((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: name.trim(),
          likes,
          dislikes,
          allergies,
        },
      ]);
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === sheet
            ? { ...m, name: name.trim(), likes, dislikes, allergies }
            : m
        )
      );
    }

    closeSheet();
  };

  const deleteMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    closeSheet();
  };

  const removeTag = (index, list, listSetter) => {
    listSetter(list.filter((_, i) => i !== index));
  };

  const commitTag = (list, listSetter) => {
    const trimmed = inputVal.trim();
    if (trimmed) {
      listSetter([...list, trimmed]);
    }
    setInputVal('');
    setActiveInput(null);
  };
      const updateDinnerTime = async (field, value) => {
  const nextSchedule = {
    ...schedule,
    [field]: value,
  };

  setDinnerSaveStatus('saving');

  await setSchedule(nextSchedule);

  setDinnerSaveStatus('saved');

  setTimeout(() => {
    setDinnerSaveStatus('idle');
  }, 2000);
};

  const dinnerTimeError =
    schedule?.dinner_start_time &&
    schedule?.dinner_end_time &&
    schedule.dinner_start_time >= schedule.dinner_end_time
      ? 'Dinner end time must be later than the start time.'
      : '';

  const PencilIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ marginLeft: '6px', cursor: 'pointer', opacity: 0.45 }}
    >
      <path
        d="M9.5 2.5L11.5 4.5L4.5 11.5H2.5V9.5L9.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const SectionLabel = ({ children }) => (
    <div
      style={{
        fontSize: '12px',
        fontWeight: '700',
        color: '#E46A2E',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '10px',
      }}
    >
      {children}
    </div>
  );

  const TagRow = ({ field, items, onRemove, list, listSetter, tagClass }) => (
    <div className="tag-row" style={{ alignItems: 'center' }}>
      {items.map((item, i) => (
        <span
          key={`${field}-${item}-${i}`}
          className={`tag ${tagClass}`}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onClick={() => onRemove(i)}
        >
          {item}
          <span style={{ fontSize: '10px', opacity: 0.5 }}>x</span>
        </span>
      ))}

      {activeInput === field ? (
        <input
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTag(list, listSetter);
            if (e.key === 'Escape') {
              setActiveInput(null);
              setInputVal('');
            }
          }}
          onBlur={() => commitTag(list, listSetter)}
          style={{
            border: 'none',
            borderBottom: '1.5px solid #1D9E75',
            outline: 'none',
            fontSize: '12px',
            padding: '2px 4px',
            width: '110px',
            background: 'transparent',
            fontFamily: 'inherit',
            color: '#1a1a1a',
          }}
          placeholder="type + enter"
        />
      ) : (
        <span
          onClick={() => {
            setActiveInput(field);
            setInputVal('');
          }}
          style={{
            fontSize: '11px',
            color: '#888',
            border: '1px dashed #d8d8d8',
            borderRadius: '20px',
            padding: '4px 10px',
            cursor: 'pointer',
            userSelect: 'none',
            background: '#fff',
          }}
        >
          + add
        </span>
      )}
    </div>
  );

  const shellCard = {
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.035)',
  };
const formatDinnerTime = (value) => {
  if (!value) return '';

  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const displayMinute = String(minutes).padStart(2, '0');

  return `${displayHour}:${displayMinute} ${suffix}`;
};

const hasDinnerWindow =
  schedule?.dinner_start_time && schedule?.dinner_end_time;

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        style={{
          marginBottom: '20px',
          padding: '4px 2px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#FFF1E8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🏡
          </div>

          <div
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1A1A1A',
              letterSpacing: '-0.02em',
            }}
          >
            My Home
          </div>
        </div>

        <div
          style={{
            fontSize: '14px',
            color: '#6B6B6B',
            lineHeight: '1.6',
            maxWidth: '560px',
            paddingLeft: '2px',
          }}
        >
          Set up your household and weekly rhythm so dinner suggestions fit real
          life.
        </div>
      </div>

      <SectionLabel>Household</SectionLabel>

      <div
        style={{
          ...shellCard,
          padding: '18px',
          marginBottom: '24px',
        }}
      >
        <div
          onClick={() => setShowFamily(!showFamily)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: showFamily ? '16px' : 0,
            cursor: 'pointer',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1A1A1A',
                marginBottom: '6px',
              }}
            >
              Family Profiles
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#6F6F6F',
                lineHeight: '1.5',
                maxWidth: '520px',
              }}
            >
              Add the people you cook for and what they love, avoid, or cannot
              eat. Tablemates uses this to make smarter recipe suggestions everyone will enjoy.
            </div>
          </div>

          <button
      type="button"
      style={{
        border: 'none',
        background: '#F1F1F1',
        borderRadius: '999px',
        minWidth: '36px',
        height: '36px',
        padding: '0 12px',
        fontSize: '22px',
        color: '#E46A2E',
        cursor: 'pointer',
        lineHeight: 1,
        flexShrink: 0,
      }}
>
  {showFamily ? '−' : '+'}
</button>
        </div>

        {showFamily && (
  <>
    <div
      className="member-row"
      style={{
        marginBottom: '18px',
      }}
    >
      {members.map((member) => (
        <div
          key={member.id}
          className="member"
          onClick={() => openEdit(member)}
        >
          <div className="avatar">{member.name?.[0] || '?'}</div>
          <div className="member-name">{member.name}</div>
        </div>
      ))}

      <div className="member" onClick={openNew}>
        <div className="avatar add">+</div>
        <div className="member-name">Add</div>
      </div>
    </div>

    {members.length === 0 ? (
      <div
        style={{
          background: '#FFF8F4',
          border: '1px dashed #F2B08D',
          borderRadius: '14px',
          padding: '18px',
          textAlign: 'center',
          color: '#8A5A44',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        No family profiles yet. Add your first person to help
        <span style={{ color: '#E46A2E', fontWeight: '600' }}>
          {' '}
          Tablemates{' '}
        </span>
        make smarter dinner suggestions.
      </div>
    ) : (
      members.map((member) => (
        <div
          key={member.id}
          style={{
            background: '#fff',
            border: '1px solid #ececec',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '14px',
            cursor: 'pointer',
          }}
          onClick={() => openEdit(member)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: '#222',
              }}
            >
              {member.name}
            </div>
            <PencilIcon />
          </div>

          <div
            style={{
              background: '#FAFAFA',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#999',
                marginBottom: '6px',
                textTransform: 'lowercase',
              }}
            >
              loves
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {member.likes?.length > 0 ? (
                member.likes.map((item, i) => (
                  <span
                    key={`like-${member.id}-${item}-${i}`}
                    className="tag tag-like"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="tag-none">nothing added yet</span>
              )}
            </div>
          </div>

          <div
            style={{
              background: '#FAFAFA',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#999',
                marginBottom: '6px',
                textTransform: 'lowercase',
              }}
            >
              won't eat
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {member.dislikes?.length > 0 ? (
                member.dislikes.map((item, i) => (
                  <span
                    key={`dislike-${member.id}-${item}-${i}`}
                    className="tag tag-dislike"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="tag-none">nothing added yet</span>
              )}
            </div>
          </div>

          <div
            style={{
              background: '#FAFAFA',
              borderRadius: '14px',
              padding: '14px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#999',
                marginBottom: '6px',
                textTransform: 'lowercase',
              }}
            >
              allergies
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {member.allergies?.length > 0 ? (
                member.allergies.map((item, i) => (
                  <span
                    key={`allergy-${member.id}-${item}-${i}`}
                    className="tag tag-allergy"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="tag-none">none</span>
              )}
            </div>
          </div>
        </div>
      ))
    )}
  </>
)}
      </div>

      <SectionLabel>Weekly Rhythm</SectionLabel>

<div
  style={{
    ...shellCard,
    padding: '18px',
    marginBottom: '18px',
    background: '#FCFCFC',
  }}
>
  <div
    onClick={() => setShowSchedule(!showSchedule)}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: showSchedule ? '16px' : 0,
      cursor: 'pointer',
    }}
  >
    <div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#1A1A1A',
          marginBottom: '6px',
        }}
      >
        Your Weekly Pace
      </div>

      <div
        style={{
          fontSize: '14px',
          color: '#6F6F6F',
          lineHeight: '1.55',
          maxWidth: '560px',
        }}
      >
        Add practices, games, or events and Tablemates will adjust dinner
        suggestions around your busiest nights.
      </div>
    </div>

    <button
      type="button"
      style={{
        border: 'none',
        background: '#F1F1F1',
        borderRadius: '999px',
        minWidth: '36px',
        height: '36px',
        padding: '0 12px',
        fontSize: '22px',
        color: '#E46A2E',
        cursor: 'pointer',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {showSchedule ? '−' : '+'}
    </button>
  </div>

  {showSchedule && (
  <><div
  style={{
    marginBottom: '16px',
    padding: '16px',
    background: '#FFF8F3',
    border: '1px solid #F6D7C3',
    borderRadius: '16px',
  }}
>
  {!isEditingDinner && hasDinnerWindow ? (
    <button
      type="button"
      onClick={() => setIsEditingDinner(true)}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#E46A2E',
          }}
        >
          Dinner
        </div>

        <div
          style={{
            fontSize: '12px',
            color: '#6B7280',
            fontWeight: '500',
          }}
        >
          Edit
        </div>
      </div>

      <div
        style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#1F2937',
        }}
      >
        {formatDinnerTime(schedule?.dinner_start_time)}–{formatDinnerTime(schedule?.dinner_end_time)}
      </div>

      {!dinnerTimeError && dinnerSaveStatus === 'saved' ? (
        <div
          style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#1D9E75',
            fontWeight: '600',
          }}
        >
          Saved
        </div>
      ) : null}
    </button>
  ) : (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '6px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#6B7280',
          }}
        >
          What time frame do you usually like to eat dinner?
        </div>

        {hasDinnerWindow ? (
          <button
            type="button"
            onClick={() => setIsEditingDinner(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#E46A2E',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Done
          </button>
        ) : null}
      </div>

      <div
        style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          lineHeight: 1.45,
        }}
      >
        We use this to make your meal plan fit your real evenings better.
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#4B5563',
              marginBottom: '6px',
            }}
          >
            Start
          </div>

          <select
            value={schedule?.dinner_start_time || ''}
            onChange={(e) =>
              updateDinnerTime('dinner_start_time', e.target.value)
            }
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              background: '#fff',
              color: '#111827',
            }}
          >
            <option value="">Select time</option>
            {DINNER_TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '160px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#4B5563',
              marginBottom: '6px',
            }}
          >
            End
          </div>

          <select
            value={schedule?.dinner_end_time || ''}
            onChange={(e) =>
              updateDinnerTime('dinner_end_time', e.target.value)
            }
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              background: '#fff',
              color: '#111827',
            }}
          >
            <option value="">Select time</option>
            {DINNER_TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dinnerTimeError ? (
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#B42318',
            fontWeight: '500',
          }}
        >
          {dinnerTimeError}
        </div>
      ) : null}

      {!dinnerTimeError && dinnerSaveStatus === 'saving' ? (
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#6B7280',
            fontWeight: '500',
          }}
        >
          Saving dinner time...
        </div>
      ) : null}

      {!dinnerTimeError && dinnerSaveStatus === 'saved' ? (
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#1D9E75',
            fontWeight: '600',
          }}
        >
          Dinner time saved
        </div>
      ) : null}
    </>
  )}
</div>

<div
  style={{
    marginBottom: '16px',
    padding: '16px',
    background: '#F0FAF6',
    border: '1px solid #B7E4D2',
    borderRadius: '16px',
  }}
>
  <div
    style={{
      fontSize: '13px',
      fontWeight: '600',
      color: '#1D9E75',
      marginBottom: '4px',
    }}
  >
    Planning Day
  </div>
  <div
    style={{
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '12px',
      lineHeight: 1.45,
    }}
  >
    Pick the day you like to plan your meals for the week. We'll remind you when it arrives.
  </div>
  <select
    value={schedule?.planning_day || ''}
    onChange={(e) => updateDinnerTime('planning_day', e.target.value)}
    style={{
      width: '100%',
      padding: '12px',
      borderRadius: '12px',
      border: '1px solid #A7D7C5',
      fontSize: '14px',
      background: '#fff',
      color: '#111827',
    }}
  >
    <option value="">No preference</option>
    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
      <option key={day} value={day}>{day}</option>
    ))}
  </select>
  {schedule?.planning_day && dinnerSaveStatus === 'saved' && (
    <div style={{ marginTop: '8px', fontSize: '12px', color: '#1D9E75', fontWeight: '600' }}>
      Saved
    </div>
  )}
</div>

<Schedule schedule={schedule} setSchedule={setSchedule} />
  </>
)}
</div>

      {sheet && (
        <div className="modal-overlay" onClick={closeSheet}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>

            <div style={{ marginBottom: '1.25rem' }}>
              {editingName ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingName(false);
                  }}
                  style={{
                    fontSize: '22px',
                    fontWeight: '600',
                    border: 'none',
                    borderBottom: '2px solid #1D9E75',
                    outline: 'none',
                    padding: '4px 0',
                    background: 'transparent',
                    fontFamily: 'inherit',
                    color: '#1a1a1a',
                    width: '100%',
                  }}
                  placeholder="Their name"
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingName(true)}
                >
                  <span
                    style={{
                      fontSize: '22px',
                      fontWeight: '600',
                      color: name ? '#1a1a1a' : '#ccc',
                    }}
                  >
                    {name || 'Tap to add name'}
                  </span>
                  <PencilIcon />
                </div>
              )}
            </div>

            <div className="tag-section">
              <div className="tag-label">loves</div>
              <TagRow
                field="likes"
                items={likes}
                onRemove={(i) => removeTag(i, likes, setLikes)}
                list={likes}
                listSetter={setLikes}
                tagClass="tag-like"
              />
            </div>

            <div className="tag-section">
              <div className="tag-label">won't eat</div>
              <TagRow
                field="dislikes"
                items={dislikes}
                onRemove={(i) => removeTag(i, dislikes, setDislikes)}
                list={dislikes}
                listSetter={setDislikes}
                tagClass="tag-dislike"
              />
            </div>

            <div className="tag-section">
              <div className="tag-label">allergies</div>
              <TagRow
                field="allergies"
                items={allergies}
                onRemove={(i) => removeTag(i, allergies, setAllergies)}
                list={allergies}
                listSetter={setAllergies}
                tagClass="tag-allergy"
              />
            </div>

            <div className="modal-actions">
              <button className="modal-keep" onClick={save}>
                Save
              </button>

              {sheet !== 'new' && (
                <button
                  className="modal-swap"
                  onClick={() => deleteMember(sheet)}
                  style={{ color: '#e24b4a', borderColor: '#e24b4a' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyHome;