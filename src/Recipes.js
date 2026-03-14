import React, { useState, useEffect } from 'react';

function Recipes({ recipes, setRecipes, highlightedRecipe, setHighlightedRecipe }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [updatingMods, setUpdatingMods] = useState(null);
  const [expandedMods, setExpandedMods] = useState({});

  useEffect(() => {
    if (highlightedRecipe) {
      setTimeout(() => {
        const match = recipes.find(r => r.name === highlightedRecipe);
        if (match) setExpanded(match.id);
        setHighlightedRecipe(null);
      }, 100);
    }
  }, [highlightedRecipe, recipes, setHighlightedRecipe]);

  const toggleFavorite = (id) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r));
  };

  const deleteRecipe = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const displayed = filter === 'favorites'
    ? recipes.filter(r => r.favorite)
    : recipes;

  if (!recipes || recipes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🍳</div>
        <div className="empty-title">no recipes yet</div>
        <div className="empty-sub">tap "how to cook" on any meal to generate and save a recipe here</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <button className={'action-btn' + (filter === 'all' ? ' swap-btn' : '')} onClick={() => setFilter('all')}>
          all ({recipes.length})
        </button>
        <button className={'action-btn' + (filter === 'favorites' ? ' swap-btn' : '')} onClick={() => setFilter('favorites')}>
          favorites ({recipes.filter(r => r.favorite).length})
        </button>
      </div>

      {displayed.length === 0 && filter === 'favorites' && (
        <div className="empty-state">
          <div className="empty-icon" style={{ fontSize: '32px' }}>♡</div>
          <div className="empty-title">no favorites yet</div>
          <div className="empty-sub">tap the heart on any recipe to save it as a favorite</div>
        </div>
      )}

      {displayed.map(recipe => (
        <div key={recipe.id} className="recipe-card" style={{ border: expanded === recipe.id ? '1.5px solid #1D9E75' : '0.5px solid #e8e8e8' }}>
          <div className="recipe-header">
            <div style={{ flex: 1, paddingRight: '12px' }}>
              <div className="recipe-name">{recipe.name}</div>
              <span className="recipe-time" style={{ marginTop: '6px', display: 'inline-block' }}>{recipe.time}</span>
            </div>
            <button onClick={() => toggleFavorite(recipe.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill={recipe.favorite ? '#1D9E75' : 'none'} xmlns="http://www.w3.org/2000/svg">
                <path d="M11 19s-8-5.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 5.5-8 11-8 11z" stroke={recipe.favorite ? '#1D9E75' : '#ccc'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="recipe-desc">{recipe.description}</div>

          {recipe.modifications && recipe.modifications.length > 0 && recipe.modifications.some(m => m.person) ? (
  <div className="mods-section" style={{ marginBottom: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedMods(prev => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}>
      <div className="mods-label" style={{ marginBottom: 0 }}>modifications ({recipe.modifications.filter(m => m.person).length})</div>
      <span style={{ fontSize: '11px', color: '#1D9E75' }}>{expandedMods[recipe.id] ? 'hide' : 'show'}</span>
    </div>
    {expandedMods[recipe.id] && (
      <div style={{ marginTop: '8px' }}>
        {recipe.modifications.map((mod, j) => mod.person ? (
          <div key={j} className="mod-row">
            <div className="mod-avatar">{mod.person[0]}</div>
            <div className="mod-text"><strong>{mod.person}</strong> -- {mod.note}</div>
          </div>
        ) : null)}
      </div>
    )}
  </div>
) : (
  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', fontStyle: 'italic' }}>
    no modifications saved yet
  </div>
)}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <button className="action-btn" onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)} style={{ flex: 1 }}>
              {expanded === recipe.id ? 'hide steps' : 'show steps'}
            </button>
            <button
              className="action-btn"
              onClick={() => updateMods(recipe)}
              disabled={updatingMods === recipe.id}
              style={{ flex: 1 }}
            >
              {updatingMods === recipe.id ? 'updating...' : 'update mods'}
            </button>
            <button onClick={() => deleteRecipe(recipe.id)} style={{ padding: '8px 14px', fontSize: '12px', color: '#e24b4a', background: 'transparent', border: '0.5px solid #e24b4a', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>
              remove
            </button>
          </div>

          {expanded === recipe.id && recipe.steps && (
            <div className="cook-steps" style={{ marginTop: '12px' }}>
              {recipe.steps.map((step, i) => (
                <div key={i} className="cook-step">
                  <div className="cook-step-num">{i + 1}</div>
                  <div className="cook-step-text">{step}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  async function updateMods(recipe) {
    setUpdatingMods(recipe.id);
    try {
      const familyData = JSON.parse(localStorage.getItem('tm_members') || '[]');
      const familyInfo = familyData.map(m => {
        const allergies = m.allergies.length > 0 ? m.allergies.join(', ') : 'none';
        return m.name + ': likes ' + m.likes.join(', ') + '; dislikes ' + m.dislikes.join(', ') + '; allergies: ' + allergies;
      }).join(', ');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: 'Given this meal: ' + recipe.name + ', and ONLY these specific family members: ' + familyInfo + ', list modifications needed for each person based on their specific dislikes and allergies. Only include modifications for people who actually need them based on their profile. If everyone can eat it as-is return an empty array. Return ONLY valid JSON: {"modifications": [{"person": "Name", "note": "note"}]}' }]
        })
      });
      const data = await response.json();
      const text = data.content[0].text;
      const result = JSON.parse(text.replace(/```json|```/g, '').trim());
      setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, modifications: result.modifications } : r));
    } catch (err) {
      console.error('Could not update mods');
    }
    setUpdatingMods(null);
  }}

export default Recipes;