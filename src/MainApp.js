import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import Profiles from './Profiles';
import Schedule from './Schedule';
import ThisWeek from './ThisWeek';
import ShoppingList from './ShoppingList';
import PastWeeks from './PastWeeks';
import Recipes from './Recipes';
import Splash from './Splash';
import { supabase } from './lib/supabase';

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
  const [recipes, setRecipes] = useState(() => {
    try {
      const s = localStorage.getItem('tm_recipes');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [schedule, setSchedule] = useState(() => {
    try {
      const s = localStorage.getItem('tm_schedule');
      return s ? JSON.parse(s) : DEFAULT_SCHEDULE;
    } catch {
      return DEFAULT_SCHEDULE;
    }
  });

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
    localStorage.setItem('tm_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('tm_shopping', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('tm_saved_weeks', JSON.stringify(savedWeeks));
  }, [savedWeeks]);

  useEffect(() => {
    localStorage.setItem('tm_recipes', JSON.stringify(recipes));
  }, [recipes]);

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

  console.log('SET MEALS RAN');
  console.log('Saving meals to Supabase...', {
    user_id: user.id,
    week_key: weekKey,
    meals: resolvedMeals
  });

  const { error: deleteError } = await supabase
    .from('weekly_meals')
    .delete()
    .eq('user_id', user.id)
    .eq('week_key', weekKey);

  if (deleteError) {
    console.error('Error deleting old weekly meals:', deleteError);
    alert('Delete failed: ' + deleteError.message);
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
    alert('Save failed: ' + insertError.message);
    return;
  }

  console.log('Meals saved successfully:', data);
  alert('Meals saved to Supabase!');
};

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
              <circle cx="7" cy="7" r="4.5" stroke={showSearch ? 'white' : '#888'} strokeWidth="1.5" />
              <path d="M10.5 10.5L13 13" stroke={showSearch ? 'white' : '#888'} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div style={{ textAlign: 'center' }}>
            <h1 className="logo">table<span>mates</span></h1>
            <p className="tagline">dinner, handled.</p>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>{user.email}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => setActiveTab('profiles')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: activeTab === 'profiles' ? '#1D9E75' : '#e8e8e8',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6" r="3" stroke={activeTab === 'profiles' ? 'white' : '#888'} strokeWidth="1.5" />
                <path d="M3 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={activeTab === 'profiles' ? 'white' : '#888'} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '11px',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit'
              }}
            >
              log out
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
                      borderBottom: i < searchResults.length - 1 ? '0.5px solid #f7f7f5' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{result.name}</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{result.sub}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#1D9E75' }}>go</span>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim() && searchResults.length === 0 && (
              <div style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '12px' }}>
                no results for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nav">
        <button className={'nav-btn' + (activeTab === 'schedule' ? ' active' : '')} onClick={() => setActiveTab('schedule')}>
          schedule
        </button>
        <button className={'nav-btn' + (activeTab === 'week' ? ' active' : '')} onClick={() => setActiveTab('week')}>
          this week
        </button>
        <button className={'nav-btn' + (activeTab === 'shopping' ? ' active' : '')} onClick={() => setActiveTab('shopping')}>
          shopping
        </button>
        <button className={'nav-btn' + (activeTab === 'recipes' ? ' active' : '')} onClick={() => setActiveTab('recipes')}>
          recipes
        </button>
        <button className={'nav-btn' + (activeTab === 'pastweeks' ? ' active' : '')} onClick={() => setActiveTab('pastweeks')}>
          past weeks
        </button>
      </div>

      <div className="content">
        {activeTab === 'profiles' && <Profiles members={members} setMembers={setMembers} />}
        {activeTab === 'schedule' && <Schedule schedule={schedule} setSchedule={setSchedule} />}
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
    </div>
  );
}

export default MainApp;