import React, { useState } from 'react';

const FAQS = [
  { q: 'How do I add a family member?', a: 'Tap the "+" circle at the top of this screen. A sheet will slide up where you can add their name, foods they love, foods they won\'t eat, and any allergies. Tap the "+ add" pill next to each section to add items, then hit Save.' },
  { q: 'How do I update a family member\'s likes, dislikes or allergies?', a: 'Tap any family member\'s card or their avatar at the top. Their edit sheet will slide up with all their info pre-filled. Tap any tag to remove it, tap "+ add" to add new ones, then hit Save.' },
  { q: 'How does the weekly meal plan work?', a: 'Go to "this week" and tap "suggest this week\'s dinners." Tablemates will look at your family profiles and your schedule to suggest 7 dinners — busy nights get quick meals, relaxed nights get more involved recipes.' },
  { q: 'How do I swap a meal I don\'t like?', a: 'On any meal card in "this week," tap "swap meal." Tablemates will suggest a different meal for that night without changing any of the others.' },
  { q: 'What are modifications?', a: 'Modifications are per-person tweaks to a meal. For example, if Dad likes spicy food but the kids don\'t, Tablemates will suggest adding hot sauce to his portion. They show up on each meal card and in the recipe modal.' },
  { q: 'How do I refresh modifications after updating profiles?', a: 'If you update a family member\'s profile after generating your week, you\'ll see a yellow banner on "this week." Tap "refresh mods" at the top to update all modifications based on the latest profiles without replanning your whole week.' },
  { q: 'How does the shopping list work?', a: 'Once you\'ve planned all 7 nights, a "generate shopping list" button appears at the bottom of "this week." Tap it and Tablemates will create a full grocery list organized by store section. You can check items off as you shop and share the list to Notes or text.' },
  { q: 'How do I save a week?', a: 'Once your week is planned, tap "Save" at the top of "this week." It gets archived in "past weeks" where you can browse it anytime. Tap any saved week to expand it and see all 7 meals.' },
  { q: 'How do I save a recipe?', a: 'Tap "how to cook" on any meal. A sheet slides up with the cooking steps. Tap "Keep this meal" to save it to your recipes tab. You can favorite recipes by tapping the heart icon.' },
  { q: 'What\'s the difference between "replan whole week" and "refresh mods"?', a: '"Replan whole week" generates 7 brand new meal suggestions. "Refresh mods" keeps all your current meals but updates the per-person modifications based on your current family profiles. Use refresh mods when you\'ve added a new allergy or family member.' },
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

  const openNew = () => {
    setName(''); setLikes([]); setDislikes([]); setAllergies([]);
    setActiveInput(null); setInputVal('');
    setEditingName(true);
    setSheet('new');
  };

  const openEdit = (member) => {
    setName(member.name);
    setLikes([...member.likes]);
    setDislikes([...member.dislikes]);
    setAllergies([...member.allergies]);
    setActiveInput(null); setInputVal('');
    setEditingName(false);
    setSheet(member.id);
  };

  const closeSheet = () => { setSheet(null); setActiveInput(null); };

  const save = () => {
    if (!name.trim()) return;
    if (sheet === 'new') {
      setMembers(prev => [...prev, { id: Date.now(), name, likes, dislikes, allergies }]);
    } else {
      setMembers(prev => prev.map(m => m.id === sheet ? { ...m, name, likes, dislikes, allergies } : m));
    }
    closeSheet();
  };

  const deleteMember = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    closeSheet();
  };

  const removeTag = (index, list, listSetter) => {
    listSetter(list.filter((_, i) => i !== index));
  };

  const commitTag = (list, listSetter) => {
    if (inputVal.trim()) listSetter([...list, inputVal.trim()]);
    setInputVal('');
    setActiveInput(null);
  };

  const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: '6px', cursor: 'pointer', opacity: 0.4 }}>
      <path d="M9.5 2.5L11.5 4.5L4.5 11.5H2.5V9.5L9.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const TagRow = ({ field, items, onRemove, list, listSetter, tagClass }) => (
    <div className="tag-row" style={{ alignItems: 'center' }}>
      {items.map((item, i) => (
        <span key={i} className={'tag ' + tagClass} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onRemove(i)}>
          {item}<span style={{ fontSize: '10px', opacity: 0.5 }}>x</span>
        </span>
      ))}
      {activeInput === field ? (
        <input
          autoFocus
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitTag(list, listSetter);
            if (e.key === 'Escape') { setActiveInput(null); setInputVal(''); }
          }}
          onBlur={() => commitTag(list, listSetter)}
          style={{ border: 'none', borderBottom: '1.5px solid #1D9E75', outline: 'none', fontSize: '12px', padding: '2px 4px', width: '100px', background: 'transparent', fontFamily: 'inherit', color: '#1a1a1a' }}
          placeholder="type + enter"
        />
      ) : (
        <span onClick={() => { setActiveInput(field); setInputVal(''); }} style={{ fontSize: '11px', color: '#aaa', border: '1px dashed #ddd', borderRadius: '20px', padding: '3px 10px', cursor: 'pointer', userSelect: 'none' }}>
          + add
        </span>
      )}
    </div>
  );

  return (
    <div>
      <div className="member-row">
        {members.map(member => (
          <div key={member.id} className="member" onClick={() => openEdit(member)}>
            <div className="avatar">{member.name[0]}</div>
            <div className="member-name">{member.name}</div>
          </div>
        ))}
        <div className="member" onClick={openNew}>
          <div className="avatar add">+</div>
          <div className="member-name">Add</div>
        </div>
      </div>

      {members.map(member => (
        <div key={member.id} className="profile-card" style={{ marginBottom: '0.75rem', cursor: 'pointer' }} onClick={() => openEdit(member)}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div className="profile-name">{member.name}</div>
            <PencilIcon />
          </div>
          <div className="tag-section">
            <div className="tag-label">loves</div>
            <div className="tag-row">
              {member.likes.length > 0 ? member.likes.map(item => <span key={item} className="tag tag-like">{item}</span>) : <span className="tag-none">nothing added yet</span>}
            </div>
          </div>
          <div className="tag-section">
            <div className="tag-label">won't eat</div>
            <div className="tag-row">
              {member.dislikes.length > 0 ? member.dislikes.map(item => <span key={item} className="tag tag-dislike">{item}</span>) : <span className="tag-none">nothing added yet</span>}
            </div>
          </div>
          <div className="tag-section">
            <div className="tag-label">allergies</div>
            <div className="tag-row">
              {member.allergies.length > 0 ? member.allergies.map(item => <span key={item} className="tag tag-allergy">{item}</span>) : <span className="tag-none">none</span>}
            </div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: '2rem' }}>
  <div style={{ background: '#FAEEDA', borderRadius: '12px', padding: '12px 14px', marginBottom: '1rem', fontSize: '12px', color: '#854F0B', lineHeight: '1.6' }}>
    <strong style={{ display: 'block', marginBottom: '4px' }}>A note on food allergies</strong>
    Tablemates meal suggestions and modifications are for planning convenience only and are not medical advice. Always consult a doctor or allergist regarding serious food allergies, intolerances, or dietary restrictions.
  </div>
  <div style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>help & faq</div>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', paddingRight: '12px', lineHeight: '1.4' }}>{faq.q}</div>
              <span style={{ fontSize: '18px', color: '#1D9E75', flexShrink: 0, fontWeight: '300' }}>{openFaq === i ? '-' : '+'}</span>
            </div>
            {openFaq === i && (
              <div style={{ fontSize: '13px', color: '#666', marginTop: '10px', lineHeight: '1.6', borderTop: '0.5px solid #f0f0f0', paddingTop: '10px' }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {sheet && (
        <div className="modal-overlay" onClick={closeSheet}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div style={{ marginBottom: '1.25rem' }}>
              {editingName ? (
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                  style={{ fontSize: '22px', fontWeight: '600', border: 'none', borderBottom: '2px solid #1D9E75', outline: 'none', padding: '4px 0', background: 'transparent', fontFamily: 'inherit', color: '#1a1a1a', width: '100%' }}
                  placeholder="Their name"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditingName(true)}>
                  <span style={{ fontSize: '22px', fontWeight: '600', color: name ? '#1a1a1a' : '#ccc' }}>
                    {name || 'Tap to add name'}
                  </span>
                  <PencilIcon />
                </div>
              )}
            </div>

            <div className="tag-section">
              <div className="tag-label">loves</div>
              <TagRow field="likes" items={likes} onRemove={i => removeTag(i, likes, setLikes)} list={likes} listSetter={setLikes} tagClass="tag-like" />
            </div>
            <div className="tag-section">
              <div className="tag-label">won't eat</div>
              <TagRow field="dislikes" items={dislikes} onRemove={i => removeTag(i, dislikes, setDislikes)} list={dislikes} listSetter={setDislikes} tagClass="tag-dislike" />
            </div>
            <div className="tag-section">
              <div className="tag-label">allergies</div>
              <TagRow field="allergies" items={allergies} onRemove={i => removeTag(i, allergies, setAllergies)} list={allergies} listSetter={setAllergies} tagClass="tag-allergy" />
            </div>

            <div className="modal-actions">
              <button className="modal-keep" onClick={save}>Save</button>
              {sheet !== 'new' && (
                <button className="modal-swap" onClick={() => deleteMember(sheet)} style={{ color: '#e24b4a', borderColor: '#e24b4a' }}>Remove</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profiles;