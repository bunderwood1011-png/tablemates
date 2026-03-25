import { useState, useEffect } from 'react';
import PastWeeks from './PastWeeks';
import { supabase } from './supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Recipes({
  user,
  recipes,
  setRecipes,
  highlightedRecipe,
  setHighlightedRecipe,
  meals,
  setMeals,
  savedWeeks,
  setSavedWeeks
}) {
  const [expanded, setExpanded] = useState(null);
  const [expandedMods, setExpandedMods] = useState({});
  const [showIngredients, setShowIngredients] = useState({});
  const [recipeToPlan, setRecipeToPlan] = useState(null);
  const [view, setView] = useState('all'); // 'all' | 'favorites' | 'past'

  // Add recipe form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPrepTime, setFormPrepTime] = useState('');
  const [formCookTime, setFormCookTime] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIngredients, setFormIngredients] = useState([]);
  const [formIngredientInput, setFormIngredientInput] = useState('');
  const [formSteps, setFormSteps] = useState([]);
  const [formStepInput, setFormStepInput] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlParsing, setUrlParsing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const totalMinutes = (parseInt(formPrepTime) || 0) + (parseInt(formCookTime) || 0);

  const addIngredient = () => {
    const val = formIngredientInput.trim();
    if (!val) return;
    setFormIngredients((prev) => [...prev, val]);
    setFormIngredientInput('');
  };

  const addStep = () => {
    const val = formStepInput.trim();
    if (!val) return;
    setFormSteps((prev) => [...prev, val]);
    setFormStepInput('');
  };

  const resetForm = () => {
    setFormName('');
    setFormPrepTime('');
    setFormCookTime('');
    setFormDescription('');
    setFormIngredients([]);
    setFormIngredientInput('');
    setFormSteps([]);
    setFormStepInput('');
    setFormError('');
    setUrlInput('');
    setEditingRecipe(null);
    setShowAddForm(false);
  };

  const handleParseUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlParsing(true);
    setFormError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Could not parse that URL.');
        setUrlParsing(false);
        return;
      }

      if (data.name) setFormName(data.name);
      if (data.description) setFormDescription(data.description);
      if (data.prep_minutes) setFormPrepTime(String(data.prep_minutes));
      if (data.cook_minutes) setFormCookTime(String(data.cook_minutes));
      if (Array.isArray(data.ingredients) && data.ingredients.length) setFormIngredients(data.ingredients);
      if (Array.isArray(data.steps) && data.steps.length) setFormSteps(data.steps);
    } catch {
      setFormError('Something went wrong. Try again or add the recipe manually.');
    }

    setUrlParsing(false);
  };

  const handleSaveRecipe = async () => {
    if (!formName.trim()) { setFormError('Meal name is required.'); return; }
    if (totalMinutes === 0) { setFormError('Please enter a prep and/or cook time.'); return; }

    setFormSaving(true);
    setFormError('');

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        name: formName.trim(),
        description: formDescription.trim() || null,
        prep_minutes: parseInt(formPrepTime) || 0,
        cook_minutes: parseInt(formCookTime) || 0,
        time_label: `${totalMinutes} min`,
        ingredients: formIngredients,
        steps: formSteps,
        source_type: 'user',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      setFormError(`Could not save recipe: ${error.message}`);
      setFormSaving(false);
      return;
    }

    await supabase.from('user_recipes').insert({
      user_id: user.id,
      recipe_id: recipe.id,
      favorite: false,
    });

    setRecipes((prev) => [{ ...recipe, favorite: false }, ...prev]);
    setFormSaving(false);
    resetForm();
  };

  useEffect(() => {
  if (!highlightedRecipe) return;

  const timer = setTimeout(() => {
    const match = recipes.find((r) => {
      if (highlightedRecipe.id && r.id === highlightedRecipe.id) return true;
      return r.name === highlightedRecipe.name;
    });

    if (match) {
      setExpanded(match.id);

      setTimeout(() => {
        const el = document.getElementById(`recipe-${match.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    setHighlightedRecipe(null);
  }, 100);

  return () => clearTimeout(timer);
}, [highlightedRecipe, recipes, setHighlightedRecipe]);


  const toggleFavorite = (id) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
    );
  };

  const deleteRecipe = async (id) => {
    setConfirmDeleteId(null);
    const recipe = recipes.find((r) => r.id === id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));

    await supabase.from('user_recipes').delete().eq('recipe_id', id).eq('user_id', user.id);

    if (recipe?.source_type === 'user') {
      await supabase.from('recipes').delete().eq('id', id);
    }
  };

  const openEditRecipe = (recipe) => {
    setFormName(recipe.name || '');
    setFormPrepTime(recipe.prep_minutes ? String(recipe.prep_minutes) : '');
    setFormCookTime(recipe.cook_minutes ? String(recipe.cook_minutes) : '');
    setFormDescription(recipe.description || '');
    setFormIngredients(Array.isArray(recipe.ingredients) ? recipe.ingredients : []);
    setFormSteps(Array.isArray(recipe.steps) ? recipe.steps : []);
    setFormError('');
    setUrlInput('');
    setEditingRecipe(recipe);
    setShowAddForm(true);
  };

  const handleUpdateRecipe = async () => {
    if (!formName.trim()) { setFormError('Meal name is required.'); return; }
    if (totalMinutes === 0) { setFormError('Please enter a prep and/or cook time.'); return; }

    setFormSaving(true);
    setFormError('');

    const { error } = await supabase
      .from('recipes')
      .update({
        name: formName.trim(),
        description: formDescription.trim() || null,
        prep_minutes: parseInt(formPrepTime) || 0,
        cook_minutes: parseInt(formCookTime) || 0,
        time_label: `${totalMinutes} min`,
        ingredients: formIngredients,
        steps: formSteps,
      })
      .eq('id', editingRecipe.id);

    if (error) {
      setFormError(`Could not update recipe: ${error.message}`);
      setFormSaving(false);
      return;
    }

    setRecipes((prev) => prev.map((r) =>
      r.id === editingRecipe.id
        ? { ...r, name: formName.trim(), description: formDescription.trim() || null, prep_minutes: parseInt(formPrepTime) || 0, cook_minutes: parseInt(formCookTime) || 0, time_label: `${totalMinutes} min`, ingredients: formIngredients, steps: formSteps }
        : r
    ));

    setFormSaving(false);
    setEditingRecipe(null);
    resetForm();
  };

  const openPlanChooser = (recipe) => {
    setRecipeToPlan(recipe);
  };

const addRecipeToSpecificDay = async (recipe, day) => {
  try {
    const updatedMeals = {
      ...meals,
      [day]: {
        name: recipe.name || '',
        time: recipe.time || recipe.time_label || '',
        description: recipe.description || '',
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        modifications: Array.isArray(recipe.modifications) ? recipe.modifications : [],
        skipped: false,
        plannedElsewhere: false
      }
    };

    await setMeals(updatedMeals);
    setRecipeToPlan(null);
  } catch (err) {
    console.error('Could not add recipe to this week', err);
  }
};

  const displayed =
    view === 'favorites' ? recipes.filter((r) => r.favorite) : recipes;

return (
  <div>
    <div
      style={{
        maxWidth: '520px',
        margin: '0 auto 18px',
      }}
    >
     <div
  style={{
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  }}
>
        <button
          onClick={() => setView('all')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 16px',
            borderRadius: '14px',
            border: view === 'all' ? '1px solid #8FD8BF' : '1px solid #E8E8E8',
            background: view === 'all' ? '#F3FBF7' : 'white',
            color: view === 'all' ? '#1D9E75' : '#555',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          all
        </button>

        <button
          onClick={() => setView('favorites')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 16px',
            borderRadius: '14px',
            border: view === 'favorites' ? '1px solid #8FD8BF' : '1px solid #E8E8E8',
            background: view === 'favorites' ? '#F3FBF7' : 'white',
            color: view === 'favorites' ? '#1D9E75' : '#555',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          favorites
        </button>

        <button
          onClick={() => setView('past')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 16px',
            borderRadius: '14px',
            border: view === 'past' ? '1px solid #F2B08D' : '1px solid #E8E8E8',
            background: view === 'past' ? '#FFF8F4' : 'white',
            color: view === 'past' ? '#E46A2E' : '#555',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          past weeks
        </button>
      </div>

      <button
        onClick={() => setShowAddForm(true)}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '11px',
          borderRadius: '14px',
          border: '1.5px dashed #1D9E75',
          background: 'transparent',
          color: '#1D9E75',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        + add a recipe
      </button>
    </div>

    {(!recipes || recipes.length === 0) && view !== 'past' && (
      <div className="empty-state">
        <div className="empty-icon">🍳</div>
        <div className="empty-title">no recipes yet</div>
        <div className="empty-sub">
          tap "how to cook" on any meal, or add your own above
        </div>
      </div>
    )}

    {view === 'past' ? (
      <PastWeeks
        savedWeeks={savedWeeks}
        setSavedWeeks={setSavedWeeks}
        onNavigateToRecipe={(meal) => {
          setHighlightedRecipe(meal);
          setView('all');
        }}
      />
    ) : (
      <>
        {displayed.length === 0 && view === 'favorites' && (
          <div className="empty-state">
            <div className="empty-icon" style={{ fontSize: '32px' }}>
              ♡
            </div>
            <div className="empty-title">no favorites yet</div>
            <div className="empty-sub">
              tap the heart on any recipe to save it as a favorite
            </div>
          </div>
        )}

        {displayed.map((recipe) => {
          const hasRecipeMods =
            Array.isArray(recipe.modifications) &&
            recipe.modifications.length > 0 &&
            recipe.modifications.some((m) => m.person);

          const isExpanded = expanded === recipe.id;
          const ingredientsOpen = !!showIngredients[recipe.id];

          return (
            <div
              key={recipe.id}
              id={`recipe-${recipe.id}`}
              className="week-meal-card"
              style={{
                border: isExpanded ? '1.5px solid #1D9E75' : '0.5px solid #e8e8e8',
                borderRadius: '22px',
                padding: '18px',
                marginBottom: '16px',
                background: '#fff'
              }}
>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      marginBottom: '6px',
                      lineHeight: '1.3'
                    }}
                  >
                    {recipe.name}
                  </div>

                  {recipe.description && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        lineHeight: '1.45',
                        marginBottom: '8px'
                      }}
                    >
                      {recipe.description}
                    </div>
                  )}

                  {(recipe.time || recipe.time_label) && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#E46A2E',
                        fontWeight: '600'
                      }}
                    >
                      ⏱ {recipe.time || recipe.time_label}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleFavorite(recipe.id)}
                  aria-label={recipe.favorite ? 'Remove favorite' : 'Add favorite'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    flexShrink: 0
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill={recipe.favorite ? '#E46A2E' : 'none'}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 19s-8-5.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 5.5-8 11-8 11z"
                      stroke={recipe.favorite ? '#E46A2E' : '#ccc'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  marginTop: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  className="action-btn"
                  onClick={() => setExpanded(isExpanded ? null : recipe.id)}
                  style={{ flex: 1 }}
                >
                  {isExpanded ? 'hide recipe' : 'view recipe'}
                </button>

                <button
                  onClick={() => openPlanChooser(recipe)}
                  style={{
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#1D9E75',
                    background: 'transparent',
                    border: '1px solid #1D9E75',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: '500'
                  }}
                >
                  use this week
                </button>

                {recipe.source_type === 'user' && (
                  <button
                    onClick={() => openEditRecipe(recipe)}
                    style={{
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#E46A2E',
                      background: 'transparent',
                      border: '1px solid #E46A2E',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: '500'
                    }}
                  >
                    edit
                  </button>
                )}

                {confirmDeleteId === recipe.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => deleteRecipe(recipe.id)}
                      style={{ padding: '10px 12px', fontSize: '12px', color: 'white', background: '#e24b4a', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
                    >
                      yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ padding: '10px 12px', fontSize: '12px', color: '#666', background: 'transparent', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(recipe.id)}
                    style={{
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#e24b4a',
                      background: 'transparent',
                      border: '1px solid #e24b4a',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: '500'
                    }}
                  >
                    remove
                  </button>
                )}
              </div>

              {isExpanded && (
                <div style={{ marginTop: '16px' }}>
                  {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                    <div
                      style={{
                        background: '#F6F8F7',
                        border: '1px solid #E8EFEA',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        marginBottom: '14px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setShowIngredients((prev) => ({
                            ...prev,
                            [recipe.id]: !prev[recipe.id]
                          }))
                        }
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1F2937',
                          fontFamily: 'inherit'
                        }}
                      >
                        <span>Ingredients ({recipe.ingredients.length})</span>
                        <span
                          style={{
                            fontSize: '20px',
                            color: '#E46A2E',
                            fontWeight: '600',
                            lineHeight: 1
                          }}
                        >
                          {ingredientsOpen ? '−' : '+'}
                        </span>
                      </button>

                      {ingredientsOpen && (
                        <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                          {recipe.ingredients.map((item, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                fontSize: '16px',
                                lineHeight: 1.45,
                                color: '#374151'
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '999px',
                                  background: '#1D9E75',
                                  marginTop: '8px',
                                  flexShrink: 0
                                }}
                              />
                              <div>{item}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {hasRecipeMods && (
                    <div className="mods-section" style={{ marginBottom: '14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() =>
                          setExpandedMods((prev) => ({
                            ...prev,
                            [recipe.id]: !prev[recipe.id]
                          }))
                        }
                      >
                        <div className="mods-label" style={{ marginBottom: 0 }}>
                          modifications ({recipe.modifications.filter((m) => m.person).length})
                        </div>

                        <span style={{ fontSize: '11px', color: '#1D9E75' }}>
                          {expandedMods[recipe.id] ? 'hide' : 'show'}
                        </span>
                      </div>

                      {expandedMods[recipe.id] && (
                        <div style={{ marginTop: '8px' }}>
                          {recipe.modifications.map((mod, j) =>
                            mod.person ? (
                              <div key={j} className="mod-row">
                                <div className="mod-avatar">{mod.person[0]}</div>
                                <div className="mod-text">
                                  <strong>{mod.person}</strong> — {mod.note}
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {Array.isArray(recipe.steps) && recipe.steps.length > 0 && (
                    <>
                      <h3
                        style={{
                          margin: '0 0 14px 0',
                          fontSize: '20px',
                          color: '#1F2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ color: '#E46A2E' }}>🍳</span>
                        How to cook
                      </h3>

                      <div className="cook-steps">
                        {recipe.steps.map((step, i) => (
                          <div key={i} className="cook-step">
                            <div className="cook-step-num">{i + 1}</div>
                            <div className="cook-step-text">{step}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </>
    )}

    {showAddForm && (
      <div className="modal-overlay" onClick={resetForm}>
        <div
          className="modal-sheet"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div className="modal-handle" />
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', marginBottom: '18px' }}>
            {editingRecipe ? 'Edit recipe' : 'Add a recipe'}
          </div>

          {/* URL import — hidden in edit mode */}
          {!editingRecipe && <div style={{ marginBottom: '20px', padding: '14px', background: '#f6fcf9', borderRadius: '14px', border: '1px solid #d0ede3' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1D9E75', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Import from a link
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                placeholder="Paste a recipe URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleParseUrl())}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #b8e8d4', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}
              />
              <button
                type="button"
                onClick={handleParseUrl}
                disabled={urlParsing || !urlInput.trim()}
                style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: urlParsing || !urlInput.trim() ? '#ccc' : '#1D9E75', color: 'white', fontWeight: '600', fontSize: '13px', cursor: urlParsing || !urlInput.trim() ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {urlParsing ? 'Parsing…' : 'Import'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              Works on most recipe sites. Review fields before saving.
            </div>
          </div>}

          {/* Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Meal name *
            </label>
            <input
              type="text"
              placeholder="e.g. Pancakes for dinner"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={{ width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Prep + Cook time */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Time *
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Prep (min)</div>
                <input
                  type="number"
                  min="0"
                  placeholder="10"
                  value={formPrepTime}
                  onChange={(e) => setFormPrepTime(e.target.value)}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Cook (min)</div>
                <input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={formCookTime}
                  onChange={(e) => setFormCookTime(e.target.value)}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              {totalMinutes > 0 && (
                <div style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '600', whiteSpace: 'nowrap', paddingTop: '18px' }}>
                  = {totalMinutes} min total
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Kids love this, great for busy nights"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={{ width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ingredients
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="e.g. 2 cups flour"
                value={formIngredientInput}
                onChange={(e) => setFormIngredientInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                style={{ flex: 1, padding: '11px 13px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={addIngredient}
                style={{ padding: '11px 16px', borderRadius: '12px', border: 'none', background: '#1D9E75', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + add
              </button>
            </div>
            {formIngredients.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formIngredients.map((ing, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0faf5', border: '1px solid #b8e8d4', borderRadius: '20px', padding: '4px 10px', fontSize: '13px', color: '#1D9E75' }}>
                    {ing}
                    <button onClick={() => setFormIngredients((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: '14px', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Steps */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Steps
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder={`Step ${formSteps.length + 1}…`}
                value={formStepInput}
                onChange={(e) => setFormStepInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                style={{ flex: 1, padding: '11px 13px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={addStep}
                style={{ padding: '11px 16px', borderRadius: '12px', border: 'none', background: '#1D9E75', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + add
              </button>
            </div>
            {formSteps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {formSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#f9f9f9', borderRadius: '10px', padding: '8px 10px' }}>
                    <div style={{ background: '#E46A2E', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: '13px', color: '#444', paddingTop: '2px' }}>{step}</div>
                    <button onClick={() => setFormSteps((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && (
            <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: '#FCEBEB', color: '#A32D2D', fontSize: '13px' }}>
              {formError}
            </div>
          )}

          <button
            onClick={editingRecipe ? handleUpdateRecipe : handleSaveRecipe}
            disabled={formSaving}
            style={{ width: '100%', padding: '13px', borderRadius: '14px', border: 'none', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '700', cursor: formSaving ? 'default' : 'pointer', opacity: formSaving ? 0.7 : 1, marginBottom: '10px' }}
          >
            {formSaving ? 'Saving…' : editingRecipe ? 'Update recipe' : 'Save recipe'}
          </button>
          <button
            onClick={resetForm}
            style={{ width: '100%', padding: '11px', borderRadius: '14px', border: 'none', background: 'transparent', color: '#999', fontSize: '14px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {recipeToPlan && (
      <div className="modal-overlay" onClick={() => setRecipeToPlan(null)}>
        <div
          className="modal-sheet"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '460px' }}
        >
          <div className="modal-handle"></div>

          <div
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1F2937',
              marginBottom: '10px'
            }}
          >
            Use this this week
          </div>

          <div
            style={{
              fontSize: '15px',
              lineHeight: 1.5,
              color: '#6B7280',
              marginBottom: '18px'
            }}
          >
            Choose which day you want to replace with <strong>{recipeToPlan.name}</strong>.
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => addRecipeToSpecificDay(recipeToPlan, day)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937' }}>
                  {day}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    marginTop: '4px',
                    lineHeight: 1.4
                  }}
                >
                  {meals?.[day]?.name || 'empty'}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '14px' }}>
            <button
              className="modal-swap"
              onClick={() => setRecipeToPlan(null)}
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

export default Recipes;