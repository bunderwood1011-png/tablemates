import React, { useState, useEffect } from 'react';
import './App.css';
import Profiles from './Profiles';
import Schedule from './Schedule';
import ThisWeek from './ThisWeek';
import ShoppingList from './ShoppingList';
import PastWeeks from './PastWeeks';
import Recipes from './Recipes';
import Splash from './Splash';
import { supabase } from './lib/supabase';

const DEFAULT_MEMBERS = [
  { id: 1, name: 'Mom', likes: ['pasta', 'salad', 'chicken'], dislikes: ['mushrooms'], allergies: [] },
  { id: 2, name: 'Dad', likes: ['steak', 'potatoes', 'spicy food'], dislikes: ['tofu'], allergies: [] },
  { id: 3, name: 'Mia', likes: ['pasta', 'cheese', 'apples'], dislikes: ['mushrooms', 'onions'], allergies: ['peanuts'] },
];

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

  const [members, setMembersRaw] = useState(() => {
    try {
      const s = localStorage.getItem('tm_members');
      return s ? JSON.parse(s) : DEFAULT_MEMBERS;
    } catch {
      return DEFAULT_MEMBERS;
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

  const [meals, setMeals] = useState(() => {
    try {
      const s = localStorage.getItem('tm_meals');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
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

  const [recipes, setRecipes] = useState(() => {
    try {
      const s = localStorage.getItem('tm_recipes');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => { localStorage.setItem('tm_members', JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem('tm_schedule', JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem('tm_meals', JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem('tm_shopping', JSON.stringify(shoppingList)); }, [shoppingList]);
  useEffect(() => { localStorage.setItem('tm_saved_weeks', JSON.stringify(savedWeeks)); }, [savedWeeks]);
  useEffect(() => { localStorage.setItem('tm_recipes', JSON.stringify(recipes)); }, [recipes]);

  const setMembers = (newMembers) => {
    setMembersRaw(newMembers);
    if (Object.keys(meals).length > 0) setProfilesUpdatedAfterMeals(true);
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
      meals: meals
    };

    setSavedWeeks(prev => [newSave, ...prev]);
    alert('Week saved to your archive!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app">
      {showSplash && <Splash onDone={() => { setShowSplash(false); setActiveTab('week'); }} />}

      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <div style={{ textAlign: 'center' }}>
            <h1 className="logo">
              table<span>mates</span>
            </h1>
            <p className="tagline">dinner, handled.</p>
            <p style={{ fontSize: '11px', color: '#999' }}>
              {user.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '8px 10px',
              borderRadius: '12px',
              background: '#f2f2f2',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            log out
          </button>

        </div>
      </div>

      <div className="nav">
        <button className={'nav-btn' + (activeTab === 'schedule' ? ' active' : '')} onClick={() => setActiveTab('schedule')}>schedule</button>
        <button className={'nav-btn' + (activeTab === 'week' ? ' active' : '')} onClick={() => setActiveTab('week')}>this week</button>
        <button className={'nav-btn' + (activeTab === 'shopping' ? ' active' : '')} onClick={() => setActiveTab('shopping')}>shopping</button>
        <button className={'nav-btn' + (activeTab === 'recipes' ? ' active' : '')} onClick={() => setActiveTab('recipes')}>recipes</button>
        <button className={'nav-btn' + (activeTab === 'pastweeks' ? ' active' : '')} onClick={() => setActiveTab('pastweeks')}>past weeks</button>
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