import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const FAQS = [
  { q: 'How do I add a family member?', a: 'Tap the "+" circle in Family Profiles. A sheet will slide up where you can add their name, foods they love, foods they won\'t eat, and any allergies. Tap the "+ add" pill next to each section to add items, then hit Save.' },
  { q: 'How do I update a family member\'s likes, dislikes or allergies?', a: 'Tap any family member card or avatar in Family Profiles. Their edit sheet will slide up with all their info pre-filled. Tap any tag to remove it, tap "+ add" to add new ones, then hit Save.' },
  { q: 'How does the weekly meal plan work?', a: 'Go to "this week" and tap "suggest this week\'s dinners." Tablemates will look at your family profiles and your schedule to suggest 7 dinners. Busy nights get quicker meals and relaxed nights can get more involved recipes.' },
  { q: 'How do I swap a meal I don\'t like?', a: 'On any meal card in "this week," tap "swap meal." Tablemates will suggest a different meal for that night without changing the rest of the week.' },
  { q: 'What are modifications?', a: 'Modifications are per-person tweaks to a meal. For example, if one adult likes spicy food but the kids don\'t, Tablemates may suggest adding hot sauce to one portion. They show up on meal cards and in the recipe modal.' },
  { q: 'How do I refresh modifications after updating profiles?', a: 'If you update a family member\'s profile after generating your week, you may see a banner in "this week." Tap "refresh mods" to update all modifications based on the latest profiles without replanning your whole week.' },
  { q: 'How does the shopping list work?', a: 'Once you\'ve planned all 7 nights, a "generate shopping list" button appears at the bottom of "this week." Tap it and Tablemates will create a grocery list organized by section. You can check items off as you shop and share the list.' },
  { q: 'How do I save a week?', a: 'Once your week is planned, tap "Save" at the top of "this week." It gets archived in "past weeks" so you can revisit it anytime.' },
  { q: 'How do I save a recipe?', a: 'Tap "how to cook" on any meal. A sheet slides up with the cooking steps. Tap "Keep this meal" to save it to your recipes tab. You can also favorite recipes with the heart icon.' },
  { q: 'What\'s the difference between "replan whole week" and "refresh mods"?', a: '"Replan whole week" generates 7 brand new meal suggestions. "Refresh mods" keeps your current meals but updates per-person modifications based on your current family profiles.' },
];

function Profiles({ members, setMembers }) {
  const [sheet, setSheet] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [likes, setLikes] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const [showFamily, setShowFamily] = useState(false);
  const [view, setView] = useState('profile');

  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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

    const handleFeedbackSubmit = async () => {
  if (!feedback.trim()) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('No user found:', userError);
    alert('Could not find logged-in user');
    return;
  }

  const { error } = await supabase.from('feedback').insert([
    {
      user_id: user.id,
      message: feedback.trim(),
    },
  ]);

  console.log('insert error:', error);

  if (!error) {
    setFeedbackSubmitted(true);
    setFeedback('');
  } else {
    alert('Feedback did not save. Check console.');
  }
};

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

  const ChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6L15 12L9 18"
        stroke="#9A9A9A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
            color: '#aaa',
            border: '1px dashed #ddd',
            borderRadius: '20px',
            padding: '3px 10px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          + add
        </span>
      )}
    </div>
  );

  const cardStyle = {
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: '12px',
  };

  const cardTitleStyle = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#222',
  };

  const cardSubtitleStyle = {
    fontSize: '13px',
    color: '#777',
    marginTop: '4px',
    lineHeight: '1.4',
  };

  const expandedStyle = {
    background: '#fafafa',
    border: '1px solid #e8e8e8',
    borderRadius: '16px',
    padding: '16px',
    marginTop: '-2px',
    marginBottom: '12px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#1D9E75',
    fontSize: '14px',
    marginBottom: '16px',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '600',
  };

  return (
    <div>
      {view === 'profile' && (
        <div style={{ marginTop: '16px' }}>
          <div onClick={() => setShowFamily(!showFamily)} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>Family Profiles</div>
              <div style={cardSubtitleStyle}>
                Manage your household and preferences
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '20px',
                  color: '#9A9A9A',
                  marginRight: '2px',
                  lineHeight: 1,
                }}
              >
                {showFamily ? '−' : ''}
              </span>
              {!showFamily && <ChevronRight />}
            </div>
          </div>

          {showFamily && (
            <div style={expandedStyle}>
              <div className="member-row">
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
                    background: 'white',
                    border: '1px dashed #ddd',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'center',
                    color: '#777',
                    fontSize: '14px',
                  }}
                >
                  No family profiles yet. Tap <strong>Add</strong> to get started.
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="profile-card"
                    style={{ marginBottom: '0.75rem', cursor: 'pointer' }}
                    onClick={() => openEdit(member)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <div className="profile-name">{member.name}</div>
                      <PencilIcon />
                    </div>

                    <div className="tag-section">
                      <div className="tag-label">loves</div>
                      <div className="tag-row">
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

                    <div className="tag-section">
                      <div className="tag-label">won't eat</div>
                      <div className="tag-row">
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

                    <div className="tag-section">
                      <div className="tag-label">allergies</div>
                      <div className="tag-row">
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
            </div>
          )}

          <div onClick={() => setView('feedback')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>Feedback</div>
              <div style={cardSubtitleStyle}>
                Report a bug or share an idea
              </div>
            </div>
            <ChevronRight />
          </div>

          <div onClick={() => setView('faq')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>FAQ / Help</div>
              <div style={cardSubtitleStyle}>
                Get answers and learn how Tablemates works
              </div>
            </div>
            <ChevronRight />
          </div>
        </div>
      )}

      {view === 'feedback' && (
        <div style={{ marginTop: '16px' }}>
          <button onClick={() => setView('profile')} style={backButtonStyle}>
            ‹ Back
          </button>

          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e8e8e8',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>
              Feedback
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.6',
                marginBottom: '14px',
              }}
            >
              This app is still in beta. If something breaks or you have an idea,
              please tell me. I’m building this for busy families like mine.
            </p>

            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (feedbackSubmitted) setFeedbackSubmitted(false);
              }}
              placeholder="Tell me what's working, what's not, or what you'd love to see."
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #ddd',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <button
  onClick={handleFeedbackSubmit}
  disabled={feedbackSubmitted}
  style={{
    marginTop: '14px',
    background: '#1D9E75',
    color: 'white',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '12px',
    cursor: feedbackSubmitted ? 'default' : 'pointer',
    fontWeight: '600',
    opacity: feedbackSubmitted ? 0.7 : 1,
  }}
>
  {feedbackSubmitted ? 'Submitted ✓' : 'Submit Feedback'}
</button>

{feedbackSubmitted && (
  <div
    style={{
      marginTop: '12px',
      fontSize: '13px',
      color: '#1D9E75',
      fontWeight: '600',
    }}
  >
    Thanks for the feedback!
  </div>
)}
          </div>
        </div>
      )}

      {view === 'faq' && (
        <div style={{ marginTop: '16px' }}>
          <button onClick={() => setView('profile')} style={backButtonStyle}>
            ‹ Back
          </button>

          <div
            style={{
              background: '#FAEEDA',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '1rem',
              fontSize: '12px',
              color: '#854F0B',
              lineHeight: '1.6',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>
              A note on food allergies
            </strong>
            Tablemates meal suggestions and modifications are for planning
            convenience only and are not medical advice. Always consult a doctor
            or allergist regarding serious food allergies, intolerances, or
            dietary restrictions.
          </div>

          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '1rem',
            }}
          >
            help & faq
          </div>

          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '0.5rem',
                cursor: 'pointer',
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    paddingRight: '12px',
                    lineHeight: '1.4',
                  }}
                >
                  {faq.q}
                </div>
                <span
                  style={{
                    fontSize: '18px',
                    color: '#1D9E75',
                    flexShrink: 0,
                    fontWeight: '300',
                  }}
                >
                  {openFaq === i ? '−' : '+'}
                </span>
              </div>

              {openFaq === i && (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    marginTop: '10px',
                    lineHeight: '1.6',
                    borderTop: '0.5px solid #f0f0f0',
                    paddingTop: '10px',
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
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

export default Profiles;