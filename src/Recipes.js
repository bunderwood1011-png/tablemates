import React, { useState, useEffect } from 'react';
import PastWeeks from './PastWeeks';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Recipes({
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

  useEffect(() => {
    if (highlightedRecipe) {
      const timer = setTimeout(() => {
        const match = recipes.find((r) => r.name === highlightedRecipe);
        if (match) setExpanded(match.id);
        setHighlightedRecipe(null);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [highlightedRecipe, recipes, setHighlightedRecipe]);


  const toggleFavorite = (id) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
    );
  };

  const deleteRecipe = (id) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
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
        time: recipe.time || '',
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

if (!recipes || recipes.length === 0) {
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
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setView('all')}
            style={{
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
      </div>

      {view === 'past' ? (
        <PastWeeks
          savedWeeks={savedWeeks}
          setSavedWeeks={setSavedWeeks}
          onNavigateToRecipe={(meal) => {
            setHighlightedRecipe(meal.name);
            setView('all');
          }}
        />
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🍳</div>
          <div className="empty-title">no recipes yet</div>
          <div className="empty-sub">
            tap "how to cook" on any meal to generate and save a recipe here
          </div>
        </div>
      )}
    </div>
  );
}

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
    </div>

    {view === 'past' ? (
      <PastWeeks
        savedWeeks={savedWeeks}
        setSavedWeeks={setSavedWeeks}
        onNavigateToRecipe={(meal) => {
          setHighlightedRecipe(meal.name);
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

                  {recipe.time && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#E46A2E',
                        fontWeight: '600'
                      }}
                    >
                      ⏱ {recipe.time}
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
                  use this this week
                </button>

                <button
                  onClick={() => deleteRecipe(recipe.id)}
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