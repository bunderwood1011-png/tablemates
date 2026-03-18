import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import MyHome from './MyHome';
import AccountSupport from './AccountSupport';
import ThisWeek from './ThisWeek';
import ShoppingList from './ShoppingList';
import PastWeeks from './PastWeeks';
import Recipes from './Recipes';
import Splash from './Splash';
import { supabase } from './supabaseClient';

const DEFAULT_SCHEDULE = {
  Monday: 'relaxed',
  Tuesday: 'busy',
  Wednesday: 'moderate',
  Thursday: 'relaxed',
  Friday: 'relaxed',
  Saturday: 'relaxed',
  Sunday: 'relaxed'
};

function MainApp({ user }) {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('week');
  const [profilesUpdatedAfterMeals, setProfilesUpdatedAfterMeals] = useState(false);
  const [highlightedRecipe, setHighlightedRecipe] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembersRaw] = useState([]);
  const [meals, setMealsRaw] = useState({});
  const [schedule, setScheduleRaw] = useState(DEFAULT_SCHEDULE);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);

  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const s = localStorage.getItem('tm_shopping');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const [savedWeeks, setSavedWeeks] = useState(() => {
    try {
      const s = localStorage.getItem('tm_saved_weeks');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

 const [recipes, setRecipes] = useState([]);
 const handleCloseBetaWelcome = () => {
  localStorage.setItem('tablemates_beta_welcome_seen', 'true');
  setShowBetaWelcome(false);
};

  const weekKey = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading profiles:', error);
        setMembersRaw([]);
        return;
      }

      setMembersRaw(data || []);
    };
  
    loadProfiles();
  }, [user]);
  useEffect(() => {
  if (!isBetaUser) return;

  const seen = localStorage.getItem('tablemates_beta_welcome_seen') === 'true';

  if (!seen) {
    setShowBetaWelcome(true);
  }
}, [isBetaUser]);

useEffect(() => {
  const loadAccount = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('beta_user')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error loading account:', error);
      return;
    }

    setIsBetaUser(!!data?.beta_user);
  };

  if (user?.id) {
    loadAccount();
  }
}, [user]);

  useEffect(() => {
    const loadMeals = async () => {
      const { data, error } = await supabase
        .from('weekly_meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_key', weekKey)
        .maybeSingle();

      if (error) {
        console.error('Error loading meals:', error);
        setMealsRaw({});
        return;
      }

      setMealsRaw(data?.meals || {});
    };

    loadMeals();
  }, [user, weekKey]);

  useEffect(() => {
    const loadSchedule = async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading schedule:', error);
        setScheduleRaw(DEFAULT_SCHEDULE);
        return;
      }

      setScheduleRaw(data?.schedule || DEFAULT_SCHEDULE);
    };

    loadSchedule();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tm_shopping', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('tm_saved_weeks', JSON.stringify(savedWeeks));
  }, [savedWeeks]);

  useEffect(() => {
  const loadRecipes = async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading recipes:', error);
      setRecipes([]);
      return;
    }

    setRecipes(data || []);
  };

  loadRecipes();
}, []);

  const setMembers = async (newMembersOrUpdater) => {
    const resolvedMembers =
      typeof newMembersOrUpdater === 'function'
        ? newMembersOrUpdater(members)
        : newMembersOrUpdater;

    setMembersRaw(resolvedMembers);

    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting old profiles:', deleteError);
      return;
    }

    if (resolvedMembers.length > 0) {
      const rowsToInsert = resolvedMembers.map((member) => ({
        user_id: user.id,
        name: member.name || '',
        likes: Array.isArray(member.likes) ? member.likes : [],
        dislikes: Array.isArray(member.dislikes) ? member.dislikes : [],
        allergies: Array.isArray(member.allergies) ? member.allergies : []
      }));

      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert(rowsToInsert)
        .select();

      if (insertError) {
        console.error('Error saving profiles:', insertError);
        return;
      }

      setMembersRaw(data || []);
    }

    if (Object.keys(meals).length > 0) {
      setProfilesUpdatedAfterMeals(true);
    }
  };

  const setMeals = async (newMealsOrUpdater) => {
    const resolvedMeals =
      typeof newMealsOrUpdater === 'function'
        ? newMealsOrUpdater(meals)
        : newMealsOrUpdater;

    setMealsRaw(resolvedMeals);

    const { error: deleteError } = await supabase
      .from('weekly_meals')
      .delete()
      .eq('user_id', user.id)
      .eq('week_key', weekKey);

    if (deleteError) {
      console.error('Error deleting old weekly meals:', deleteError);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('weekly_meals')
      .insert([
        {
          user_id: user.id,
          week_key: weekKey,
          meals: resolvedMeals
        }
      ])
      .select();

    if (insertError) {
      console.error('Error saving meals:', insertError);
      return;
    }

    console.log('Meals saved successfully:', data);
  };

  const setSchedule = async (newScheduleOrUpdater) => {
  const resolvedSchedule =
    typeof newScheduleOrUpdater === 'function'
      ? newScheduleOrUpdater(schedule)
      : newScheduleOrUpdater;

  setScheduleRaw(resolvedSchedule);

  const { data, error } = await supabase
    .from('schedules')
    .upsert(
      [
        {
          user_id: user.id,
          schedule: resolvedSchedule
        }
      ],
      { onConflict: 'user_id' }
    )
    .select();

  if (error) {
    console.error('Error saving schedule:', error);
    alert('Save schedule failed: ' + error.message);
    return;
  }

  console.log('Schedule saved successfully:', data);
};


  const handleShoppingListReady = (list) => {
    setShoppingList(list);
    setActiveTab('shopping');
  };

  const saveWeek = () => {
    if (Object.keys(meals).length === 0) return;

    const newSave = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      meals
    };

    setSavedWeeks((prev) => [newSave, ...prev]);
    alert('Week saved to your archive!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase();
    const results = [];

    recipes.forEach((r) => {
      if (r.name.toLowerCase().includes(q)) {
        results.push({
          type: 'recipe',
          name: r.name,
          sub: 'saved recipe',
          action: () => {
            setHighlightedRecipe(r.name);
            setActiveTab('recipes');
            setShowSearch(false);
            setSearchQuery('');
          }
        });
      }
    });

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    DAYS.forEach((day) => {
      if (meals[day] && meals[day].name.toLowerCase().includes(q)) {
        results.push({
          type: 'week',
          name: meals[day].name,
          sub: 'this week - ' + day,
          action: () => {
            setActiveTab('week');
            setShowSearch(false);
            setSearchQuery('');
          }
        });
      }
    });

    savedWeeks.forEach((week) => {
      DAYS.forEach((day) => {
        if (week.meals[day] && week.meals[day].name.toLowerCase().includes(q)) {
          results.push({
            type: 'past',
            name: week.meals[day].name,
            sub: 'week of ' + week.date,
            action: () => {
              setActiveTab('pastweeks');
              setShowSearch(false);
              setSearchQuery('');
            }
          });
        }
      });
    });

    const seen = new Set();
    return results.filter((r) => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    });
  };

  const searchResults = getSearchResults();

  return (
  <div className="app">
    {showSplash && (
      <Splash
        onDone={() => {
          setShowSplash(false);
          setActiveTab('week');
        }}
      />
    )}

    <div className="header" style={{ marginBottom: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}
      >
        <button
          onClick={() => {
            setShowSearch(!showSearch);
            setSearchQuery('');
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: showSearch ? '#1D9E75' : '#e8e8e8',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="7"
              cy="7"
              r="4.5"
              stroke={showSearch ? 'white' : '#888'}
              strokeWidth="1.5"
            />
            <path
              d="M10.5 10.5L13 13"
              stroke={showSearch ? 'white' : '#888'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 className="logo">
            table<span>mates</span>
          </h1>

          <p className="tagline">dinner, handled.</p>

          {isBetaUser && (
            <div
              style={{
                fontSize: '10px',
                background: '#E1F5EE',
                color: '#1D9E75',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-block',
                marginTop: '4px',
                fontWeight: 600
              }}
            >
              Beta tester 🎉
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setActiveTab('account')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: activeTab === 'account' ? '#1D9E75' : '#e8e8e8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle
                cx="9"
                cy="6"
                r="3"
                stroke={activeTab === 'account' ? 'white' : '#888'}
                strokeWidth="1.5"
              />
              <path
                d="M3 15c0-3.3 2.7-6 6-6s6 2.7 6 6"
                stroke={activeTab === 'account' ? 'white' : '#888'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {showSearch && (
        <div style={{ marginTop: '12px' }}>
          <input
            autoFocus
            className="text-input"
            placeholder="Search meals, recipes, past weeks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: searchResults.length > 0 ? '8px' : '0' }}
          />

          {searchResults.length > 0 && (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '0.5px solid #e8e8e8'
              }}
            >
              {searchResults.map((result, i) => (
                <div
                  key={i}
                  onClick={result.action}
                  style={{
                    padding: '10px 14px',
                    borderBottom:
                      i < searchResults.length - 1
                        ? '0.5px solid #f7f7f5'
                        : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#1a1a1a'
                      }}
                    >
                      {result.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#aaa',
                        marginTop: '2px'
                      }}
                    >
                      {result.sub}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#1D9E75' }}>
                    go
                  </span>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <div
              style={{
                fontSize: '13px',
                color: '#aaa',
                textAlign: 'center',
                padding: '12px'
              }}
            >
              no results for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>

    <div className="nav">
  <button
    className={'nav-btn' + (activeTab === 'home' ? ' active' : '')}
    onClick={() => setActiveTab('home')}
  >
    my home
  </button>
  <button
    className={'nav-btn' + (activeTab === 'week' ? ' active' : '')}
    onClick={() => setActiveTab('week')}
  >
    this week
  </button>
  <button
    className={'nav-btn' + (activeTab === 'shopping' ? ' active' : '')}
    onClick={() => setActiveTab('shopping')}
  >
    shopping
  </button>
  <button
    className={'nav-btn' + (activeTab === 'recipes' ? ' active' : '')}
    onClick={() => setActiveTab('recipes')}
  >
    recipes
  </button>
  <button
    className={'nav-btn' + (activeTab === 'pastweeks' ? ' active' : '')}
    onClick={() => setActiveTab('pastweeks')}
  >
    past weeks
  </button>
</div>

<div className="content">
  {activeTab === 'home' && (
    <MyHome
      members={members}
      setMembers={setMembers}
      schedule={schedule}
      setSchedule={setSchedule}
    />
  )}

  {activeTab === 'account' && (
    <AccountSupport onLogout={handleLogout} />
  )}

  {activeTab === 'week' && (
    <ThisWeek
      members={members}
      schedule={schedule}
      meals={meals}
      setMeals={setMeals}
      onSaveWeek={saveWeek}
      onShoppingListReady={handleShoppingListReady}
      recipes={recipes}
      setRecipes={setRecipes}
      profilesUpdatedAfterMeals={profilesUpdatedAfterMeals}
      onMealsRegenerated={() => setProfilesUpdatedAfterMeals(false)}
    />
  )}

  {activeTab === 'shopping' && (
    <ShoppingList
      shoppingList={shoppingList}
      setShoppingList={setShoppingList}
    />
  )}

  {activeTab === 'recipes' && (
    <Recipes
      recipes={recipes}
      setRecipes={setRecipes}
      highlightedRecipe={highlightedRecipe}
      setHighlightedRecipe={setHighlightedRecipe}
      meals={meals}
      setMeals={setMeals}
    />
  )}

  {activeTab === 'pastweeks' && (
    <PastWeeks
      savedWeeks={savedWeeks}
      setSavedWeeks={setSavedWeeks}
      onNavigateToRecipe={(meal) => {
        setHighlightedRecipe(meal.name);
        setActiveTab('recipes');
      }}
    />
  )}
</div>

{showBetaWelcome && (
  <div className="modal-overlay" onClick={handleCloseBetaWelcome}>
    <div
      className="modal-sheet"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: '420px' }}
    >
      <div className="modal-handle"></div>

      <div
        style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1F2937',
          marginBottom: '10px',
          textAlign: 'center'
        }}
      >
        🎉 Welcome, Beta Tester
      </div>

      <div
        style={{
          fontSize: '15px',
          lineHeight: 1.6,
          color: '#6B7280',
          marginBottom: '22px',
          textAlign: 'center'
        }}
      >
        You’re part of the founding Tablemates beta. Thanks for helping shape
        the app early — you’ll get free access for life.
      </div>

      <button
        className="modal-keep"
        onClick={handleCloseBetaWelcome}
        style={{ width: '100%' }}
      >
        Let’s do dinner
      </button>
    </div>
  </div>
)}
  </div>
);
}

export default MainApp;