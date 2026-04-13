import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import MyHome from './MyHome';
import AccountSupport from './AccountSupport';
import ThisWeek from './ThisWeek';
import ShoppingList from './ShoppingList';
import PastWeeks from './PastWeeks';
import Recipes from './Recipes';
import AdminPanel from './AdminPanel';
import Paywall from './Paywall';
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
  const [activeTab, setActiveTab] = useState('week');
  const [profilesUpdatedAfterMeals, setProfilesUpdatedAfterMeals] = useState(false);
  const [highlightedRecipe, setHighlightedRecipe] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembersRaw] = useState([]);
  const [meals, setMealsRaw] = useState({});
  const [schedule, setScheduleRaw] = useState(DEFAULT_SCHEDULE);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState(null);
  const [accountCreatedAt, setAccountCreatedAt] = useState(null);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    return false;
  });
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);
  const [showPlanningBanner, setShowPlanningBanner] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const dismissed = localStorage.getItem(`tm_planning_banner_${today}`);
    return !dismissed;
  });

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
    const day = start.getDay(); // 0 = Sunday, 1 = Monday, ...

    // If the user's planning day is Sunday and today IS Sunday,
    // they're planning for the upcoming week — point to next Monday's key
    // so the plan doesn't vanish when Monday arrives.
    const planningDaySunday = schedule?.planning_day === 'Sunday';
    if (planningDaySunday && day === 0) {
      start.setDate(start.getDate() + 1); // next Monday
    } else {
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
    }

    start.setHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
  }, [schedule?.planning_day]);

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
      .select('beta_user, is_admin, subscription_status, subscription_tier, created_at')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error loading account:', error);
      return;
    }

    setIsBetaUser(!!data?.beta_user);
    setIsAdmin(!!data?.is_admin);
    setSubscriptionStatus(data?.subscription_status || null);
    setSubscriptionTier(data?.subscription_tier || null);
    setAccountCreatedAt(data?.created_at || null);
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
      return; // don't wipe meals on error
    }

    if (data?.meals) {
      setMealsRaw(data.meals);
    }
    // if no data, leave meals as-is — don't reset to {}
  };

  loadMeals();
}, [user.id, weekKey]); // use user.id not user to prevent extra re-renders

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

    setScheduleRaw({
      ...(data?.schedule || DEFAULT_SCHEDULE),
      dinner_start_time: (data?.dinner_start_time || '').substring(0, 5),
      dinner_end_time: (data?.dinner_end_time || '').substring(0, 5),
      planning_day: data?.planning_day || '',
    });
  };

  if (user?.id) {
    loadSchedule();
  }
}, [user?.id]);

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

    const { error: upsertError } = await supabase
      .from('weekly_meals')
      .upsert(
        [{ user_id: user.id, week_key: weekKey, meals: resolvedMeals, updated_at: new Date().toISOString() }],
        { onConflict: 'user_id, week_key' }
      );

    if (upsertError) {
      console.error('Error saving meals:', upsertError);
    }
  };

  const setSchedule = async (newScheduleOrUpdater) => {
  let resolvedSchedule;

  // Use functional form so we always get the latest state, avoiding stale closure overwrites
  setScheduleRaw((prev) => {
    resolvedSchedule = typeof newScheduleOrUpdater === 'function'
      ? newScheduleOrUpdater(prev)
      : newScheduleOrUpdater;
    return resolvedSchedule;
  });

  // 👇 separate dinner times from schedule JSON
  const cleanedSchedule = { ...resolvedSchedule };
  delete cleanedSchedule.dinner_start_time;
  delete cleanedSchedule.dinner_end_time;
  delete cleanedSchedule.planning_day;

  const { data, error } = await supabase
    .from('schedules')
    .upsert(
      [
        {
          user_id: user.id,
          schedule: cleanedSchedule,
          dinner_start_time: resolvedSchedule?.dinner_start_time || null,
          dinner_end_time: resolvedSchedule?.dinner_end_time || null,
          planning_day: resolvedSchedule?.planning_day || null,
        }
      ],
      { onConflict: 'user_id' }
    )
    .select();

  if (error) {
    console.error('Error saving schedule:', error);
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
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  recipes.forEach((recipe) => {
    if (recipe.name?.toLowerCase().includes(q)) {
      results.push({
        type: 'recipe',
        name: recipe.name,
        sub: 'saved recipe',
        action: () => {
          setHighlightedRecipe(recipe);
          setActiveTab('recipes');
          setShowSearch(false);
          setSearchQuery('');
        }
      });
    }
  });

  DAYS.forEach((day) => {
    const meal = meals[day];
    if (meal?.name?.toLowerCase().includes(q)) {
      results.push({
        type: 'week',
        name: meal.name,
        sub: `this week - ${day}`,
        action: () => {
          setHighlightedRecipe(meals[day]);
          setActiveTab('recipes');
          setShowSearch(false);
          setSearchQuery('');
        }
      });
    }
  });

  savedWeeks.forEach((week) => {
    DAYS.forEach((day) => {
      const meal = week.meals?.[day];
      if (meal?.name?.toLowerCase().includes(q)) {
        results.push({
          type: 'past',
          name: meal.name,
          sub: `week of ${week.date}`,
          action: () => {
            setHighlightedRecipe(meals[day]);
            setActiveTab('recipes');
            setShowSearch(false);
            setSearchQuery('');
          }
        });
      }
    });
  });

  const seen = new Set();
  return results.filter((result) => {
    const key = `${result.type}-${result.name}-${result.sub}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

  const searchResults = getSearchResults();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isPlanningDay = schedule?.planning_day && schedule.planning_day === today;

  // Paywall check
  const hasAccess = (() => {
    if (subscriptionStatus === null && accountCreatedAt === null) return true; // still loading
    if (subscriptionTier === 'beta_lifetime') return true;
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') return true;
    // 7-day grace period for new users who haven't subscribed yet
    if (!subscriptionStatus && accountCreatedAt) {
      const daysSinceSignup = (Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSignup < 7) return true;
    }
    return false;
  })();

  const daysLeftInTrial = (() => {
    if (!accountCreatedAt || subscriptionStatus) return 0;
    const daysSinceSignup = (Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - daysSinceSignup));
  })();

  if (!hasAccess) {
    return <Paywall user={user} daysLeftInTrial={daysLeftInTrial} />;
  }

  return (
  <div className="app">
    {checkoutSuccess && (
      <div style={{ background: '#1D9E75', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600' }}>
        <span>You're subscribed! Welcome to Tablemates Pro.</span>
        <button onClick={() => setCheckoutSuccess(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
      </div>
    )}

    {isPlanningDay && showPlanningBanner && (
      <div style={{
        background: '#1D9E75',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '14px',
        fontWeight: '600',
      }}>
        <span>🗓 It's your planning day! Ready to set up this week?</span>
        <button
          onClick={() => {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            localStorage.setItem(`tm_planning_banner_${today}`, 'true');
            setShowPlanningBanner(false);
          }}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
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
          <div style={{ position: 'relative', display: 'inline-flex' }}>
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
            {hasNewAnnouncements && (
              <span style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#FF6B35',
                border: '2px solid white',
                pointerEvents: 'none'
              }} />
            )}
          </div>
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
  {isAdmin && (
    <button
      className={'nav-btn' + (activeTab === 'admin' ? ' active' : '')}
      onClick={() => setActiveTab('admin')}
    >
      admin
    </button>
  )}
</div>

<div className="content">
  {activeTab === 'home' && (
    <MyHome
      members={members}
      setMembers={setMembers}
      schedule={schedule}
      setSchedule={setSchedule}
      meals={meals}
      setMeals={setMeals}
    />
  )}

  {activeTab === 'account' && (
    <AccountSupport onLogout={handleLogout} onAnnouncementSeen={() => setHasNewAnnouncements(false)} />
  )}

  {activeTab === 'admin' && isAdmin && (
    <AdminPanel />
  )}

  {activeTab === 'week' && (
    <ThisWeek
      user={user}
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
  user={user}
  recipes={recipes}
  setRecipes={setRecipes}
  highlightedRecipe={highlightedRecipe}
  setHighlightedRecipe={setHighlightedRecipe}
  meals={meals}
  setMeals={setMeals}
  savedWeeks={savedWeeks}
  setSavedWeeks={setSavedWeeks}
/>
  )}

  {activeTab === 'pastweeks' && (
    <PastWeeks
      savedWeeks={savedWeeks}
      setSavedWeeks={setSavedWeeks}
      onNavigateToRecipe={(meal) => {
      setHighlightedRecipe(meal);
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