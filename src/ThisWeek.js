import React, { useState } from 'react';
import { supabase } from './lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const JSON_TEMPLATE =
  '{"meals":{"Monday":{"name":"","time":"","description":"","modifications":[]},"Tuesday":{"name":"","time":"","description":"","modifications":[]},"Wednesday":{"name":"","time":"","description":"","modifications":[]},"Thursday":{"name":"","time":"","description":"","modifications":[]},"Friday":{"name":"","time":"","description":"","modifications":[]},"Saturday":{"name":"","time":"","description":"","modifications":[]},"Sunday":{"name":"","time":"","description":"","modifications":[]}}}';

const parseTime = (value) => {
  if (!value) return null;

  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const parseMealDurationToMinutes = (value) => {
  if (!value || typeof value !== 'string') return 0;

  const lower = value.toLowerCase().trim();

  let total = 0;

  const hourMatch = lower.match(/(\d+)\s*(hr|hrs|hour|hours)/);
  const minuteMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);

  if (hourMatch) {
    total += Number(hourMatch[1]) * 60;
  }

  if (minuteMatch) {
    total += Number(minuteMatch[1]);
  }

  if (!hourMatch && !minuteMatch) {
    const plainNumber = lower.match(/\d+/);
    if (plainNumber) {
      total = Number(plainNumber[0]);
    }
  }

  return Number.isNaN(total) ? 0 : total;
};

const getDayPace = (dayData) => {
  if (!dayData) return 'relaxed';

  if (typeof dayData === 'string') return dayData;

  const items = Array.isArray(dayData.items) ? dayData.items : [];

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
};

function ThisWeek({
  members,
  schedule,
  meals,
  setMeals,
  onSaveWeek,
  onShoppingListReady,
  recipes,
  setRecipes,
  profilesUpdatedAfterMeals,
  onMealsRegenerated
}) {
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [loadingSteps, setLoadingSteps] = useState(null);

  const extractJson = (text) => {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid AI response');
    }

    const cleaned = text.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (firstError) {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);
        return JSON.parse(possibleJson);
      }

      throw firstError;
    }
  };

  const callAI = async (prompt) => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Non-JSON response from /api/ai:', rawText);
      throw new Error('The AI endpoint returned HTML instead of JSON. Check /api/ai.');
    }

    if (!response.ok) {
      throw new Error(data?.error || 'AI request failed');
    }

    return extractJson(data.text);
  };

  const buildFamilyInfo = () => {
    return members
      .map((m) => {
        const likes = Array.isArray(m.likes) && m.likes.length > 0 ? m.likes.join(', ') : 'none';
        const dislikes = Array.isArray(m.dislikes) && m.dislikes.length > 0 ? m.dislikes.join(', ') : 'none';
        const allergies = Array.isArray(m.allergies) && m.allergies.length > 0 ? m.allergies.join(', ') : 'none';

        return `${m.name}: likes ${likes}; dislikes ${dislikes}; allergies: ${allergies}`;
      })
      .join('\n');
  };

  const suggestWeek = async () => {
    setLoading(true);
    setError(null);
    setShoppingList(null);
    onMealsRegenerated();

    try {
      const familyInfo = buildFamilyInfo();
      const scheduleInfo = DAYS.map((d) => `${d}: ${getDayPace(schedule?.[d])}`).join(', ');
      const existingMealNames = Object.values(meals || {})
        .map((meal) => meal?.name)
        .filter(Boolean)
        .join(', ');

      const prompt =
        'You are a family meal planner. Suggest one dinner per night for a week. ' +
        'Busy nights need meals under 20 min, moderate nights under 40 min, relaxed nights can be any length. ' +
        'The meal time must represent TOTAL time including prep and cook time. ' +
        'Likes and dislikes are preferences, not absolute rules. Allergies are strict and must never be included. ' +
        'Do not repeat meals within the same week. ' +
        (existingMealNames ? `Avoid repeating these previously suggested meals if possible: ${existingMealNames}. ` : '') +
        `Family:\n${familyInfo}\n` +
        `Schedule: ${scheduleInfo}. ` +
        'Return ONLY valid JSON matching this template, and fill in every field exactly: ' +
        JSON_TEMPLATE;

      const result = await callAI(prompt);
      setMeals(result.meals || {});
    } catch (err) {
      console.error('suggestWeek error:', err);
      setError(err.message || 'Something went wrong while planning your week.');
    }

    setLoading(false);
  };

  const swapMeal = async (day) => {
    setSwapping(day);
    setModal(null);
    setError(null);

    try {
      const current = meals[day] ? meals[day].name : '';
      const otherMealNames = DAYS.filter((d) => d !== day)
        .map((d) => meals[d]?.name)
        .filter(Boolean)
        .join(', ');

      const familyInfo = buildFamilyInfo();
      const pace = getDayPace(schedule?.[day]);
      const timeLimit =
        pace === 'busy' ? 'under 20 min' : pace === 'moderate' ? 'under 40 min' : 'any length';

      const prompt =
        `Suggest one dinner for ${day} night. ` +
        `Time limit: ${timeLimit}. ` +
        'The meal time must represent TOTAL time including prep and cook time. ' +
        'Likes and dislikes are preferences, not absolute rules. Allergies are strict and must never be included. ' +
        `Family:\n${familyInfo}\n` +
        (current ? `Do NOT suggest this current meal: ${current}. ` : '') +
        (otherMealNames ? `Do NOT repeat these meals already in the week: ${otherMealNames}. ` : '') +
        'Return ONLY valid JSON: {"name":"","time":"","description":"","modifications":[]}';

      const result = await callAI(prompt);
      setMeals((prev) => ({ ...prev, [day]: result }));
    } catch (err) {
      console.error('swapMeal error:', err);
      setError(err.message || 'Swap failed. Please try again.');
    }

    setSwapping(null);
  };

  const refreshAllMods = async () => {
    setSwapping('all_mods');
    setError(null);

    try {
      const familyInfo = buildFamilyInfo();
      const updatedMeals = { ...meals };

      for (const day of DAYS) {
        if (!meals[day]) continue;

        const prompt =
          `Given this meal: ${meals[day].name}, and this family:\n${familyInfo}\n` +
          'List any modifications needed per person. ' +
          'Only include a modification if it is actually needed. ' +
          'If everyone can eat it as-is, return an empty array. ' +
          'Return ONLY valid JSON: {"modifications":[{"person":"Name","note":"note"}]}';

        const result = await callAI(prompt);
        updatedMeals[day] = {
          ...updatedMeals[day],
          modifications: result.modifications || []
        };
      }

      setMeals(updatedMeals);
      onMealsRegenerated();
    } catch (err) {
      console.error('refreshAllMods error:', err);
      setError(err.message || 'Could not refresh modifications. Please try again.');
    }

    setSwapping(null);
  };

  const generateShoppingList = async () => {
    setShoppingLoading(true);
    setError(null);

    try {
      const mealNames = DAYS.map((d) => `${d}: ${meals[d] ? meals[d].name : 'none'}`).join(', ');

      const prompt =
        `Generate a shopping list for these 7 dinners: ${mealNames}. ` +
        'Group the list by store section. ' +
        'Return ONLY valid JSON: ' +
        '{"sections":[{"name":"produce","items":[{"item":"","amount":"","meal":""}]},{"name":"meat and protein","items":[]},{"name":"dairy","items":[]},{"name":"pantry","items":[]}]}';

      const result = await callAI(prompt);
      setShoppingList(result.sections || []);
      onShoppingListReady(result.sections || []);
    } catch (err) {
      console.error('generateShoppingList error:', err);
      setError(err.message || 'Could not generate shopping list. Please try again.');
    }

    setShoppingLoading(false);
  };

  const openRecipeModal = async (day) => {
    setLoadingSteps(day);
    setError(null);

    try {
      const meal = meals[day];
      const familyInfo = buildFamilyInfo();

      const prompt =
        `Give me 6 simple step by step cooking instructions for ${meal.name} for a family. ` +
        `Family info:\n${familyInfo}\n` +
        'Keep each step short and clear, one sentence each. ' +
        'Return ONLY valid JSON: {"steps":["step 1","step 2","step 3","step 4","step 5","step 6"]}';

      const result = await callAI(prompt);

      setModal({
        day,
        meal,
        steps: result.steps || []
      });
    } catch (err) {
      console.error('openRecipeModal error:', err);
      setError(err.message || 'Could not load recipe. Please try again.');
    }

    setLoadingSteps(null);
  };

  const keepMeal = async () => {
    console.log('keepMeal clicked');

    if (!modal) {
      console.log('No modal found');
      return;
    }

    setError(null);

    const totalMinutes = parseMealDurationToMinutes(modal.meal.time);

    const newRecipe = {
      id: Date.now(),
      name: modal.meal.name,
      time: modal.meal.time,
      description: modal.meal.description,
      steps: modal.steps || [],
      modifications: modal.meal.modifications || [],
      favorite: false
    };

    try {
      const { data: existingRecipes, error: existingError } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('name', modal.meal.name);

      console.log('existingRecipes:', existingRecipes);
      console.log('existingError:', existingError);

      if (existingError) {
        throw existingError;
      }

      const alreadyExists = Array.isArray(existingRecipes) && existingRecipes.length > 0;

      if (!alreadyExists) {
        const { data: insertedRecipe, error: insertError } = await supabase
          .from('recipes')
          .insert([
            {
              name: modal.meal.name,
              description: modal.meal.description || '',
              prep_minutes: 0,
              cook_minutes: totalMinutes,
              time_label: modal.meal.time || '',
              steps: modal.steps || [],
              ingredients: [],
              tags: [],
              dietary_flags: [],
              source_type: 'ai'
            }
          ])
          .select();

        console.log('insertedRecipe:', insertedRecipe);
        console.log('insertError:', insertError);

        if (insertError) {
          throw insertError;
        }
      }

      setRecipes((prev) => {
        const existsLocally = prev.some((r) => r.name === modal.meal.name);
        if (existsLocally) return prev;
        return [newRecipe, ...prev];
      });

      setModal(null);
    } catch (err) {
      console.error('keepMeal error:', err);
      setError(err.message || 'Could not save this recipe right now. Please try again.');
    }
  };

  const paceColor = { relaxed: '#1D9E75', moderate: '#BA7517', busy: '#A32D2D' };
  const paceBg = { relaxed: '#E1F5EE', moderate: '#FAEEDA', busy: '#FCEBEB' };

  const hasMods = (day) => {
    return (
      meals[day] &&
      meals[day].modifications &&
      meals[day].modifications.length > 0 &&
      meals[day].modifications.some((m) => m.person)
    );
  };

  return (
    <div>
      {profilesUpdatedAfterMeals && (
        <div
          style={{
            background: '#FAEEDA',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '1rem',
            fontSize: '13px',
            color: '#854F0B',
            lineHeight: '1.5'
          }}
        >
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
            <button
              className="suggest-btn outline-btn"
              onClick={suggestWeek}
              disabled={loading}
              style={{ margin: 0, flex: 1 }}
            >
              {loading ? 'replanning...' : 'replan whole week'}
            </button>

            <button
              onClick={onSaveWeek}
              style={{
                flexShrink: 0,
                padding: '13px 16px',
                background: 'transparent',
                color: '#1D9E75',
                border: '1.5px solid #1D9E75',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Save
            </button>

            <button
              onClick={refreshAllMods}
              disabled={swapping === 'all_mods'}
              style={{
                flexShrink: 0,
                padding: '13px 16px',
                background: 'transparent',
                color: '#888',
                border: '1.5px solid #e0e0e0',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {swapping === 'all_mods' ? 'refreshing...' : 'refresh mods'}
            </button>
          </>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {DAYS.map((day) => {
        const dayPace = getDayPace(schedule?.[day]);

        return (
          <div key={day} className="week-meal-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{day}</div>

              {meals[day] && (
                <span
                  className="pace-badge"
                  style={{
                    background: paceBg[dayPace],
                    color: paceColor[dayPace]
                  }}
                >
                  {dayPace}
                </span>
              )}

              {meals[day] && (
                <div style={{ fontSize: '12px', color: '#aaa', fontWeight: '500' }}>
                  {meals[day].time}
                </div>
              )}
            </div>

            {meals[day] ? (
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    marginBottom: '10px',
                    lineHeight: '1.3'
                  }}
                >
                  {meals[day].name}
                </div>

                {hasMods(day) ? (
                  <div className="mods-section" style={{ marginBottom: '12px' }}>
                    <div className="mods-label">modifications</div>
                    {meals[day].modifications.map((mod, j) =>
                      mod.person ? (
                        <div key={j} className="mod-row">
                          <div className="mod-avatar">{mod.person[0]}</div>
                          <div className="mod-text">
                            <strong>{mod.person}</strong> -- {mod.note}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#1D9E75',
                      background: '#E1F5EE',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      marginBottom: '12px'
                    }}
                  >
                    looks like everyone agrees today, no mods needed!
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="action-btn"
                    onClick={() => openRecipeModal(day)}
                    disabled={loadingSteps === day}
                    style={{ flex: 1 }}
                  >
                    {loadingSteps === day ? 'loading...' : 'how to cook'}
                  </button>

                  <button
                    className="action-btn swap-btn"
                    onClick={() => swapMeal(day)}
                    disabled={swapping === day}
                    style={{ flex: 1 }}
                  >
                    {swapping === day ? 'swapping...' : 'swap meal'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="week-meal-empty">{loading ? 'thinking...' : 'not yet planned'}</div>
            )}
          </div>
        );
      })}

      {Object.keys(meals).length === 7 && !shoppingList && (
        <button
          className="suggest-btn"
          onClick={generateShoppingList}
          disabled={shoppingLoading}
          style={{ marginTop: '1rem' }}
        >
          {shoppingLoading ? 'building your list...' : 'generate shopping list'}
        </button>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">{modal.meal.name}</div>
            <div className="modal-meta">
              {modal.meal.time} · {modal.meal.description}
            </div>

            {modal.meal.modifications &&
              modal.meal.modifications.length > 0 &&
              modal.meal.modifications.some((m) => m.person) && (
                <div className="mods-section" style={{ marginBottom: '1rem' }}>
                  <div className="mods-label">modifications</div>
                  {modal.meal.modifications.map((mod, j) =>
                    mod.person ? (
                      <div key={j} className="mod-row">
                        <div className="mod-avatar">{mod.person[0]}</div>
                        <div className="mod-text">
                          <strong>{mod.person}</strong> -- {mod.note}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

            {modal.steps.map((step, i) => (
              <div key={i} className="cook-step">
                <div className="cook-step-num">{i + 1}</div>
                <div className="cook-step-text">{step}</div>
              </div>
            ))}

            <div className="modal-actions">
              <button className="modal-keep" onClick={keepMeal}>
                Keep this meal
              </button>
              <button className="modal-swap" onClick={() => swapMeal(modal.day)}>
                Swap meal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(247,247,245,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(0,0,0,0.08)'
            }}
          >
            <div
              style={{
                fontSize: '36px',
                animation: 'forkBounce 1s infinite'
              }}
            >
              🍴
            </div>

            <div
              style={{
                marginTop: '12px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              hold on, looking for my favorite fork
            </div>
          </div>

          <style>
            {`
              @keyframes forkBounce {
                0%,100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(0); }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
}

export default ThisWeek;