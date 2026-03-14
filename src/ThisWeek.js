import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const JSON_TEMPLATE = '{"meals":{"Monday":{"name":"","time":"","description":"","modifications":[]},"Tuesday":{"name":"","time":"","description":"","modifications":[]},"Wednesday":{"name":"","time":"","description":"","modifications":[]},"Thursday":{"name":"","time":"","description":"","modifications":[]},"Friday":{"name":"","time":"","description":"","modifications":[]},"Saturday":{"name":"","time":"","description":"","modifications":[]},"Sunday":{"name":"","time":"","description":"","modifications":[]}}}';

function ThisWeek({ members, schedule, meals, setMeals, onSaveWeek, onShoppingListReady, recipes, setRecipes, profilesUpdatedAfterMeals, onMealsRegenerated }) {
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [loadingSteps, setLoadingSteps] = useState(null);

  const callAI = async (prompt) => {
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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content[0].text;
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  };

  const buildFamilyInfo = () => {
    return members.map(m => {
      const allergies = m.allergies.length > 0 ? m.allergies.join(', ') : 'none';
      return m.name + ': likes ' + m.likes.join(', ') + '; dislikes ' + m.dislikes.join(', ') + '; allergies: ' + allergies;
    }).join('\n');
  };

  const suggestWeek = async () => {
    setLoading(true);
    setError(null);
    setShoppingList(null);
    onMealsRegenerated();
    try {
      const familyInfo = buildFamilyInfo();
      const scheduleInfo = DAYS.map(d => d + ': ' + (schedule[d] || 'relaxed')).join(', ');
      const prompt = 'You are a family meal planner. Suggest one dinner per night for a week. Busy nights need meals under 20 min, moderate under 40 min, relaxed anything. Family: ' + familyInfo + '. Schedule: ' + scheduleInfo + '. Return ONLY valid JSON matching this template, fill in all fields: ' + JSON_TEMPLATE;
      const result = await callAI(prompt);
      setMeals(result.meals);
    } catch (err) {
      setError('Something went wrong. Please try again!');
    }
    setLoading(false);
  };

  const swapMeal = async (day) => {
    setSwapping(day);
    setModal(null);
    try {
      const current = meals[day] ? meals[day].name : '';
      const familyInfo = buildFamilyInfo();
      const pace = schedule[day] || 'relaxed';
      const timeLimit = pace === 'busy' ? 'under 20 min' : pace === 'moderate' ? 'under 40 min' : 'any length';
      const prompt = 'Suggest one dinner for ' + day + ' night. Time limit: ' + timeLimit + '. Family: ' + familyInfo + '. Do NOT suggest: ' + current + '. Return ONLY valid JSON: {"name":"","time":"","description":"","modifications":[]}';
      const result = await callAI(prompt);
      setMeals(prev => ({ ...prev, [day]: result }));
    } catch (err) {
      setError('Swap failed. Please try again!');
    }
    setSwapping(null);
  };

  const refreshAllMods = async () => {
    setSwapping('all_mods');
    try {
      const familyInfo = buildFamilyInfo();
      const updatedMeals = { ...meals };
      for (const day of DAYS) {
        if (!meals[day]) continue;
        const prompt = 'Given this meal: ' + meals[day].name + ', and this family: ' + familyInfo + ', list any modifications needed per person. If everyone can eat it as-is, return an empty array. Return ONLY valid JSON: {"modifications": [{"person": "Name", "note": "note"}]}';
        const result = await callAI(prompt);
        updatedMeals[day] = { ...updatedMeals[day], modifications: result.modifications };
      }
      setMeals(updatedMeals);
      onMealsRegenerated();
    } catch (err) {
      setError('Could not refresh modifications. Please try again!');
    }
    setSwapping(null);
  };

  const generateShoppingList = async () => {
    setShoppingLoading(true);
    setError(null);
    try {
      const mealNames = DAYS.map(d => d + ': ' + (meals[d] ? meals[d].name : 'none')).join(', ');
      const prompt = 'Generate a shopping list for these 7 dinners: ' + mealNames + '. Group by store section. Return ONLY valid JSON: {"sections":[{"name":"produce","items":[{"item":"","amount":"","meal":""}]},{"name":"meat and protein","items":[]},{"name":"dairy","items":[]},{"name":"pantry","items":[]}]}';
      const result = await callAI(prompt);
      setShoppingList(result.sections);
      onShoppingListReady(result.sections);
    } catch (err) {
      setError('Could not generate shopping list. Please try again!');
    }
    setShoppingLoading(false);
  };

  const openRecipeModal = async (day) => {
    setLoadingSteps(day);
    try {
      const meal = meals[day];
      const familyInfo = buildFamilyInfo();
      const prompt = 'Give me 6 simple step by step cooking instructions for ' + meal.name + ' for a family. Family info: ' + familyInfo + '. Keep each step short and clear, one sentence each. Return ONLY valid JSON: {"steps": ["step 1", "step 2", "step 3", "step 4", "step 5", "step 6"]}';
      const result = await callAI(prompt);
      setModal({ day, meal, steps: result.steps });
    } catch (err) {
      setError('Could not load recipe. Please try again!');
    }
    setLoadingSteps(null);
  };

  const keepMeal = () => {
    if (!modal) return;
    const newRecipe = {
      id: Date.now(),
      name: modal.meal.name,
      time: modal.meal.time,
      description: modal.meal.description,
      steps: modal.steps,
      modifications: modal.meal.modifications || [],
      favorite: false
    };
    setRecipes(prev => {
      const exists = prev.find(r => r.name === modal.meal.name);
      if (exists) return prev;
      return [newRecipe, ...prev];
    });
    setModal(null);
  };

  const paceColor = { relaxed: '#1D9E75', moderate: '#BA7517', busy: '#A32D2D' };
  const paceBg = { relaxed: '#E1F5EE', moderate: '#FAEEDA', busy: '#FCEBEB' };

  const hasMods = (day) => {
    return meals[day] && meals[day].modifications && meals[day].modifications.length > 0 && meals[day].modifications.some(m => m.person);
  };

  return (
    <div>
      {profilesUpdatedAfterMeals && (
        <div style={{ background: '#FAEEDA', borderRadius: '12px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: '#854F0B', lineHeight: '1.5' }}>
          Your family profiles have changed. Consider replanning this week so Tablemates uses the latest info!
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.keys(meals).length === 0 ? (
          <button className="suggest-btn" onClick={suggestWeek} disabled={loading} style={{ margin: 0 }}>
            {loading ? 'planning your week...' : "suggest this week's dinners"}
          </button>
        ) : (
          <>
            <button className="suggest-btn outline-btn" onClick={suggestWeek} disabled={loading} style={{ margin: 0, flex: 1 }}>
              {loading ? 'replanning...' : 'replan whole week'}
            </button>
            <button onClick={onSaveWeek} style={{ flexShrink: 0, padding: '13px 16px', background: 'transparent', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: '14px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
              Save
            </button>
            <button onClick={refreshAllMods} disabled={swapping === 'all_mods'} style={{ flexShrink: 0, padding: '13px 16px', background: 'transparent', color: '#888', border: '1.5px solid #e0e0e0', borderRadius: '14px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
              {swapping === 'all_mods' ? 'refreshing...' : 'refresh mods'}
            </button>
          </>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {DAYS.map(day => (
        <div key={day} className="week-meal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{day}</div>
            {meals[day] && (
              <span className="pace-badge" style={{ background: paceBg[schedule[day] || 'relaxed'], color: paceColor[schedule[day] || 'relaxed'] }}>
                {schedule[day] || 'relaxed'}
              </span>
            )}
            {meals[day] && (
              <div style={{ fontSize: '12px', color: '#aaa', fontWeight: '500' }}>{meals[day].time}</div>
            )}
          </div>

          {meals[day] ? (
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '10px', lineHeight: '1.3' }}>
                {meals[day].name}
              </div>

              {hasMods(day) ? (
                <div className="mods-section" style={{ marginBottom: '12px' }}>
                  <div className="mods-label">modifications</div>
                  {meals[day].modifications.map((mod, j) => mod.person ? (
                    <div key={j} className="mod-row">
                      <div className="mod-avatar">{mod.person[0]}</div>
                      <div className="mod-text"><strong>{mod.person}</strong> -- {mod.note}</div>
                    </div>
                  ) : null)}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#1D9E75', background: '#E1F5EE', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
                  looks like everyone agrees today, no mods needed!
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="action-btn" onClick={() => openRecipeModal(day)} disabled={loadingSteps === day} style={{ flex: 1 }}>
                  {loadingSteps === day ? 'loading...' : 'how to cook'}
                </button>
                <button className="action-btn swap-btn" onClick={() => swapMeal(day)} disabled={swapping === day} style={{ flex: 1 }}>
                  {swapping === day ? 'swapping...' : 'swap meal'}
                </button>
              </div>
            </div>
          ) : (
            <div className="week-meal-empty">
              {loading ? 'thinking...' : 'not yet planned'}
            </div>
          )}
        </div>
      ))}

      {Object.keys(meals).length === 7 && !shoppingList && (
        <button className="suggest-btn" onClick={generateShoppingList} disabled={shoppingLoading} style={{ marginTop: '1rem' }}>
          {shoppingLoading ? 'building your list...' : 'generate shopping list'}
        </button>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">{modal.meal.name}</div>
            <div className="modal-meta">{modal.meal.time} · {modal.meal.description}</div>
            {modal.meal.modifications && modal.meal.modifications.length > 0 && modal.meal.modifications.some(m => m.person) && (
              <div className="mods-section" style={{ marginBottom: '1rem' }}>
                <div className="mods-label">modifications</div>
                {modal.meal.modifications.map((mod, j) => mod.person ? (
                  <div key={j} className="mod-row">
                    <div className="mod-avatar">{mod.person[0]}</div>
                    <div className="mod-text"><strong>{mod.person}</strong> -- {mod.note}</div>
                  </div>
                ) : null)}
              </div>
            )}
            {modal.steps.map((step, i) => (
              <div key={i} className="cook-step">
                <div className="cook-step-num">{i + 1}</div>
                <div className="cook-step-text">{step}</div>
              </div>
            ))}
            <div className="modal-actions">
              <button className="modal-keep" onClick={keepMeal}>Keep this meal</button>
              <button className="modal-swap" onClick={() => swapMeal(modal.day)}>Swap meal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThisWeek;