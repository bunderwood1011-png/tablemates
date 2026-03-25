import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { logError } from './utils/logError';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const JSON_TEMPLATE =
  '{"meals":{"Monday":{"name":"","time":"","description":"","modifications":[]},"Tuesday":{"name":"","time":"","description":"","modifications":[]},"Wednesday":{"name":"","time":"","description":"","modifications":[]},"Thursday":{"name":"","time":"","description":"","modifications":[]},"Friday":{"name":"","time":"","description":"","modifications":[]},"Saturday":{"name":"","time":"","description":"","modifications":[]},"Sunday":{"name":"","time":"","description":"","modifications":[]}}}';

const NOTICE_STORAGE_KEY = 'tm_this_week_notice';

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

  const rangeMatch = lower.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    return Number(rangeMatch[2]);
  }

  let total = 0;

  const decimalHourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(hr|hrs|hour|hours)/);
  const minuteMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);

  if (decimalHourMatch) total += Math.round(Number(decimalHourMatch[1]) * 60);
  if (minuteMatch) total += Number(minuteMatch[1]);

  if (!decimalHourMatch && !minuteMatch) {
    const plainNumber = lower.match(/\d+/);
    if (plainNumber) total = Number(plainNumber[0]);
  }

  return Number.isNaN(total) ? 0 : total;
};

const getMaxMinutesForPace = (pace) => {
  if (pace === 'busy') return 30;
  if (pace === 'moderate') return 60;
  return Infinity;
};

const getMealTimeFloor = (meal) => {
  const text = `${meal?.name || ''} ${meal?.description || ''}`.toLowerCase();
  const hasAny = (keywords) => keywords.some((word) => text.includes(word));

  if (
    hasAny([
      'pot roast',
      'brisket',
      'short ribs',
      'whole chicken',
      'slow cooker',
      'crockpot',
      'crock pot',
      'braised',
      'dutch oven',
      'ribs'
    ])
  ) {
    return 90;
  }

  if (
    hasAny([
      'lasagna',
      'meatloaf',
      'casserole',
      'pot pie',
      'stuffed peppers',
      'stuffed shells'
    ])
  ) {
    return 60;
  }

  if (
    hasAny([
      'pizza',
      'homemade pizza',
      'stromboli',
      'calzone'
    ])
  ) {
    return 45;
  }

  if (
    hasAny([
      'sheet pan',
      'baked',
      'roasted',
      'oven roasted',
      'gratin',
      'enchiladas',
      'fried chicken',
      'chicken thighs',
      'chicken breast',
      'baked chicken',
      'baked salmon',
      'baked fish'
    ])
  ) {
    return 40;
  }

  if (
    hasAny([
      'pasta',
      'alfredo',
      'spaghetti',
      'burger',
      'burgers',
      'skillet',
      'stir fry',
      'rice bowl',
      'grain bowl',
      'soup'
    ])
  ) {
    return 25;
  }

  if (
    hasAny([
      'taco',
      'tacos',
      'quesadilla',
      'wrap',
      'sandwich',
      'sliders',
      'salad',
      'flatbread',
      'scramble'
    ])
  ) {
    return 20;
  }

  return 30;
};

const getEffectiveMealMinutes = (meal) => {
  const parsedMinutes = parseMealDurationToMinutes(meal?.time);
  const floorMinutes = getMealTimeFloor(meal);
  return Math.max(parsedMinutes || 0, floorMinutes);
};

const mealFitsPace = (meal, pace) => {
  const maxMinutes = getMaxMinutesForPace(pace);
  const effectiveMinutes = getEffectiveMealMinutes(meal);
  return effectiveMinutes <= maxMinutes;
};

const getDayPace = (dayData, dinnerStartTime) => {
  if (!dayData) return 'relaxed';
  if (typeof dayData === 'string') return dayData;

  const items = Array.isArray(dayData.items) ? dayData.items : [];
  if (!items.length) return 'relaxed';

  const dinnerStart = dinnerStartTime ? parseTime(dinnerStartTime) : null;

  if (dinnerStart) {
    const prepWindowStart = dinnerStart - 120; // 2 hours before dinner

    let minutesInPrepWindow = 0;
    let eventRunsIntoDinner = false;

    for (const item of items) {
      const start = parseTime(item.start);
      const end = parseTime(item.end);

      if (start === null || end === null || end <= start) {
        // No time info — conservatively assume it brushes the prep window
        minutesInPrepWindow += 30;
        continue;
      }

      // Overlaps with the 2-hour prep window before dinner?
      if (end > prepWindowStart && start < dinnerStart) {
        const overlapStart = Math.max(start, prepWindowStart);
        const overlapEnd = Math.min(end, dinnerStart);
        minutesInPrepWindow += Math.max(0, overlapEnd - overlapStart);
      }

      // Runs into or past dinner start?
      if (end > dinnerStart) {
        eventRunsIntoDinner = true;
      }
    }

    if (eventRunsIntoDinner || minutesInPrepWindow >= 75) return 'busy';
    if (minutesInPrepWindow >= 30) return 'moderate';
    return 'relaxed';
  }

  // No dinner time set — fall back to total-day logic
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

  if (totalMinutes >= 180 || items.length >= 3 || longEventCount >= 2) return 'busy';
  if (totalMinutes >= 60 || items.length >= 2) return 'moderate';
  return 'relaxed';
};

function ThisWeek({
  user,
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
const [showIngredients, setShowIngredients] = useState(false);
const [showProfileUpdatePrompt, setShowProfileUpdatePrompt] = useState(false);
const [notice, setNotice] = useState(null);
const [shoppingMessage, setShoppingMessage] = useState('creating your list...');
const [swapFeedbackOther, setSwapFeedbackOther] = useState({});
const [showSwapFeedback, setShowSwapFeedback] = useState({});

const slowMessages = [
  'Sorry, grabbed a cart with a wonky wheel...',
  'Checking the aisles...',
  'Double-checking the pantry...'
];

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

  const callAI = async (prompt, model) => {
    const response = await fetch('https://tablemates-psi.vercel.app/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
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
const showNotice = (message, type = 'info') => {
  setNotice({ message, type });

  try {
    window.localStorage.setItem(
      NOTICE_STORAGE_KEY,
      JSON.stringify({ message, type })
    );
  } catch (err) {
    console.error('Could not save notice:', err);
  }
};

const clearNotice = () => {
  setNotice(null);

  try {
    window.localStorage.removeItem(NOTICE_STORAGE_KEY);
  } catch (err) {
    console.error('Could not clear notice:', err);
  }
};
 const submitSwapFeedback = async ({ day, mealName, reason, text = '' }) => {
  try {

    console.log('SUBMITTING FEEDBACK', { day, mealName, reason, text });

    const { data, error } = await supabase
      .from('meal_feedback')
      .insert([
        {
          user_id: user?.id || null,
          day,
          meal_name: mealName,
          feedback_reason: reason,
          feedback_text: text,
          source: 'swap',
        },
      ])
      .select();

    if (error) {
      console.error('meal_feedback insert error:', error);
      throw error;
    }

    console.log('FEEDBACK SAVED', data);

    setShowSwapFeedback((prev) => ({
      ...prev,
      [day]: false,
    }));

    setSwapFeedbackOther((prev) => ({
      ...prev,
      [day]: false,
      [`${day}_text`]: '',
    }));

    showNotice('Thanks for the feedback.', 'info');
  } catch (err) {
    console.error('submitSwapFeedback error:', err);

    await logError({
      userId: user?.id || null,
      action: 'submit_swap_feedback',
      error: err,
      context: {
        day,
        mealName,
        reason,
        text,
      },
    });

    setError(err.message || 'Could not save feedback. Please try again.');
  }
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

  const getMealPlanImpactSummary = (previousMeals = {}, nextMeals = {}) => {
    let replacedDays = 0;
    let clearedModDays = 0;

    for (const day of DAYS) {
      const previousMeal = previousMeals?.[day];
      const nextMeal = nextMeals?.[day];

      if (!previousMeal || !nextMeal) continue;

      if (previousMeal.name !== nextMeal.name) {
        replacedDays += 1;

        const hadMods =
          Array.isArray(previousMeal.modifications) &&
          previousMeal.modifications.some((mod) => mod.person);

        if (hadMods) {
          clearedModDays += 1;
        }
      }
    }

    return { replacedDays, clearedModDays };
  };

      const buildMealPlanUpdateMessage = ({
  action = 'week',
  clearedModDays = 0
}) => {
  const isSwap = action === 'swap';
  const prefix = isSwap ? 'Meal swapped.' : 'Week updated.';
  const effects = [];

  if (isSwap) {
    effects.push('Consider recreating your shopping list');
  } else {
    effects.push('Consider creating a new shopping list');
  }

  if (clearedModDays > 0) {
    effects.push(
      clearedModDays === 1
        ? '1 day of modifications was reset'
        : `${clearedModDays} days of modifications were reset`
    );
  }

  return `${prefix} ${effects.join(' and ')}.`;
};

  const regenerateMealForDay = async (day, existingMeals) => {
    const familyInfo = buildFamilyInfo();
    const pace = getDayPace(schedule?.[day], schedule?.dinner_start_time);
    const maxMinutes = getMaxMinutesForPace(pace);

    const otherMealNames = DAYS.filter((d) => d !== day)
      .map((d) => existingMeals[d]?.name)
      .filter(Boolean)
      .join(', ');

    const prompt =
      `Suggest one dinner for ${day} night. ` +
      `This is a ${pace} day. ` +
      (maxMinutes === Infinity
        ? 'Time limit: any length is allowed, but keep it practical. '
        : `Time limit: ${maxMinutes} minutes or less total, including prep and cook time. `) +
      'The time must equal the REAL total cooking time including prep and cook time. ' +
      'Be conservative, not optimistic — if you are unsure, round up. ' +
      'Include oven preheat time (usually 10–15 min) in the total for any oven recipe. ' +
      'Do NOT return times under the real cooking time. ' +
      'Oven meals (baked, roasted, sheet pan) are at least 40 minutes total. ' +
      'Pizza takes at least 45 minutes total. ' +
      'Lasagna, casseroles, and stuffed peppers take at least 60 minutes total. ' +
      'Do not label oven meals as 20–30 minutes. ' +
      'Likes and dislikes are preferences, not absolute rules. Allergies are strict and must never be included. ' +
      `Family:\n${familyInfo}\n` +
      (otherMealNames ? `Do NOT repeat these meals already in the week: ${otherMealNames}. ` : '') +
      'Return ONLY valid JSON: {"name":"","time":"","description":"","modifications":[]}';

    return await callAI(prompt);
  };

  const validateAndFixMeals = async (generatedMeals) => {
    const fixedMeals = { ...generatedMeals };

    for (const day of DAYS) {
      const pace = getDayPace(schedule?.[day], schedule?.dinner_start_time);
      const meal = fixedMeals[day];

      if (!mealFitsPace(meal, pace)) {
        fixedMeals[day] = await regenerateMealForDay(day, fixedMeals);
      }
    }

    return fixedMeals;
  };

  const getPaceMealRules = (pace) => {
    if (pace === 'busy') {
      return `
BUSY DAY MEAL RULES:
- Choose dinners that realistically take 30 minutes or less of active cooking time.
- Prioritize tacos, quesadillas, wraps, sandwiches, burgers, skillet meals, stir-fry, quick pasta, rice bowls, soups, salads, and flatbreads.
- Air fryer meals are excellent choices for busy nights.
- Slow cooker meals are allowed if prep takes about 10 minutes or less and the meal cooks while the family is busy.
- Focus on meals that minimize hands-on cooking and cleanup.

Avoid:
- Long oven-baked meals
- Roasted dinners
- Casseroles or lasagna
- Sheet pan dinners with long bake times
- Recipes requiring long marinating, breading and baking, or extended simmering.
`;
    }

    if (pace === 'moderate') {
      return `
MODERATE DAY MEAL RULES:
- Choose dinners that realistically take 45 minutes or less total.
- Moderate-effort meals are okay, including pasta, burgers with sides, skillet meals, protein + side dinners, enchiladas, and simple oven meals.
- Avoid very long roasts, brisket, pot roast, or anything that takes more than 60 minutes total.
- Keep meals practical for a normal weeknight.
`;
    }

    return `
RELAXED DAY MEAL RULES:
- Longer and more involved meals are welcome.
- Roasts, casseroles, baked dishes, comfort meals, and slow-cooked meals are all acceptable.
- Keep meals realistic and family-friendly.
`;
  };

  const fetchRecentFeedback = async () => {
    if (!user?.id) return [];
    try {
      const { data } = await supabase
        .from('meal_feedback')
        .select('meal_name, feedback_reason, feedback_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40);
      return data || [];
    } catch {
      return [];
    }
  };

  const buildFeedbackPrompt = (feedback) => {
    if (!feedback?.length) return '';
    const reasonLabels = {
      too_long: 'takes too long to make',
      dont_like_ingredients: "family doesn't like the ingredients",
      not_kid_friendly: 'not kid-friendly',
      other: 'not a good fit',
    };
    const lines = feedback.map((f) => {
      const label = f.feedback_reason === 'other' && f.feedback_text
        ? f.feedback_text
        : (reasonLabels[f.feedback_reason] || 'not a good fit');
      return `- ${f.meal_name}: ${label}`;
    });
    return (
      'This family has rejected these meals before. Do not suggest them again, ' +
      'and avoid meals that share the same issue (e.g. if a meal was too long, avoid other long meals on busy nights):\n' +
      lines.join('\n') + '\n'
    );
  };

  const fetchCommunityRecipes = async (excludeIds = []) => {
    try {
      let query = supabase
        .from('recipes')
        .select('name, total_minutes, time_label')
        .eq('is_active', true)
        .limit(25);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data } = await query;
      return data || [];
    } catch {
      return [];
    }
  };

  const buildCommunityRecipesPrompt = (communityRecipes) => {
    if (!communityRecipes?.length) return '';
    const lines = communityRecipes
      .map((r) => `- ${r.name} (${r.time_label || `${r.total_minutes} min`})`)
      .join('\n');
    return (
      'If none of the family\'s saved meals fit a particular night, here are other meals from our recipe library to draw from:\n' +
      lines + '\n'
    );
  };

  const fetchSavedRecipes = async () => {
    if (!user?.id) return [];
    try {
      const { data: userRecipes } = await supabase
        .from('user_recipes')
        .select('recipe_id, favorite')
        .eq('user_id', user.id)
        .limit(50);

      if (!userRecipes?.length) return [];

      const recipeIds = userRecipes.map((r) => r.recipe_id);
      const { data: recipeDetails } = await supabase
        .from('recipes')
        .select('id, name, total_minutes, time_label')
        .in('id', recipeIds);

      if (!recipeDetails?.length) return [];

      const favoriteIds = new Set(
        userRecipes.filter((r) => r.favorite).map((r) => r.recipe_id)
      );

      return recipeDetails.map((r) => ({
        name: r.name,
        minutes: r.total_minutes,
        timeLabel: r.time_label,
        favorite: favoriteIds.has(r.id),
      }));
    } catch {
      return [];
    }
  };

  const buildSavedRecipesPrompt = (savedRecipes) => {
    if (!savedRecipes?.length) return '';
    const lines = savedRecipes
      .map((r) => `- ${r.name} (${r.timeLabel || `${r.minutes} min`})${r.favorite ? ' ★ favorite' : ''}`)
      .join('\n');
    return `This family has saved meals they enjoy. Use them when the pace and schedule allow — favorites especially:\n${lines}\n`;
  };

  const suggestWeek = async () => {
    setLoading(true);
    setError(null);

    const previousMeals = meals || {};
    const hadShoppingList = Array.isArray(shoppingList) && shoppingList.length > 0;

    setShoppingList(null);
    onMealsRegenerated();

    try {
      const familyInfo = buildFamilyInfo();
      const scheduleInfo = DAYS.map((d) => {
        const pace = getDayPace(schedule?.[d], schedule?.dinner_start_time);
        return `${d}: ${pace}\n${getPaceMealRules(pace)}`;
      }).join('\n\n');

      const existingMealNames = Object.values(meals || {})
        .map((meal) => meal?.name)
        .filter(Boolean)
        .join(', ');

      const savedRecipes = await fetchSavedRecipes();
      const savedRecipesPrompt = buildSavedRecipesPrompt(savedRecipes);
      const communityRecipes = await fetchCommunityRecipes();
      const communityRecipesPrompt = buildCommunityRecipesPrompt(communityRecipes);
      const recentFeedback = await fetchRecentFeedback();
      const feedbackPrompt = buildFeedbackPrompt(recentFeedback);

      const prompt =
        'You are a family meal planner. Suggest one dinner per night for a week. ' +
        'Busy nights need meals 30 min or less, moderate nights 60 min or less, relaxed nights can be any length. ' +
        'The time must equal the REAL total cooking time including prep and cook time. ' +
        'Be conservative, not optimistic — if you are unsure, round up. ' +
        'Include oven preheat time (usually 10–15 min) in the total for any oven recipe. ' +
        'Do NOT return times under the real cooking time. ' +
        'Oven meals (baked, roasted, sheet pan) are at least 40 minutes total. ' +
        'Pizza takes at least 45 minutes total. ' +
        'Lasagna, casseroles, and stuffed peppers take at least 60 minutes total. ' +
        'Slow cooker and braised meals take at least 90 minutes total. ' +
        'Do not label oven meals as 20–30 minutes. ' +
        'Likes and dislikes are preferences, not absolute rules. Allergies are strict and must never be included. ' +
        'Do not repeat meals within the same week. ' +
        (existingMealNames ? `Avoid repeating these previously suggested meals if possible: ${existingMealNames}. ` : '') +
        (savedRecipesPrompt ? savedRecipesPrompt : '') +
        (communityRecipesPrompt ? communityRecipesPrompt : '') +
        (feedbackPrompt ? feedbackPrompt : '') +
        `Family:\n${familyInfo}\n` +
        `Schedule and pace rules:\n${scheduleInfo}\n` +
        'Return ONLY valid JSON matching this template, and fill in every field exactly: ' +
        JSON_TEMPLATE;

const result = await callAI(prompt);
const generatedMeals = result.meals || {};
const validatedMeals = await validateAndFixMeals(generatedMeals);
const impact = getMealPlanImpactSummary(previousMeals, validatedMeals);
const message = buildMealPlanUpdateMessage({
  action: 'week',
  hadShoppingList,
  clearedModDays: impact.clearedModDays
});

showNotice(message, 'info');
await setMeals(validatedMeals);
await refreshAllMods(validatedMeals);
} catch (err) {
  console.error('suggestWeek error:', err);

  await logError({
    userId: user?.id || null,
    action: 'generate_weekly_meals',
    error: err,
    context: {
      hadShoppingList,
      previousMealCount: Object.keys(previousMeals || {}).length,
      generatedMealCount: Object.keys(meals || {}).length,
      daysRequested: DAYS.length,
    },
  });

  setError(err.message || 'Could not generate meals. Please try again.');
}

setLoading(false);
};
const skipMealForDay = (day) => {
  setMeals((prev) => ({
    ...prev,
    [day]: {
      skipped: true,
      name: 'Dinner Planned Elsewhere',
      time: '',
      description: 'No meal planned for this night.'
    }
  }));
};
  const swapMeal = async (day) => {
  setSwapping(day);
  setModal(null);
  setError(null);
  setShowSwapFeedback((prev) => ({ ...prev, [day]: true }));

  const previousMeal = meals?.[day];
  const hadShoppingList = Array.isArray(shoppingList) && shoppingList.length > 0;
  const previousMealHadMods =
    Array.isArray(previousMeal?.modifications) &&
    previousMeal.modifications.some((mod) => mod.person);
  const pace = getDayPace(schedule?.[day], schedule?.dinner_start_time);

  try {
    const current = meals[day] ? meals[day].name : '';
    const otherMealNames = DAYS.filter((d) => d !== day)
      .map((d) => meals[d]?.name)
      .filter(Boolean)
      .join(', ');

    const familyInfo = buildFamilyInfo();
    const maxMinutes = getMaxMinutesForPace(pace);
    const paceRules = getPaceMealRules(pace);

    const timeLimit =
      maxMinutes === Infinity
        ? 'any length is allowed, but keep it practical'
        : `${maxMinutes} minutes or less total, including prep and cook time`;

    const savedRecipes = await fetchSavedRecipes();
    const savedRecipesPrompt = buildSavedRecipesPrompt(savedRecipes);
    const communityRecipes = await fetchCommunityRecipes();
    const communityRecipesPrompt = buildCommunityRecipesPrompt(communityRecipes);
    const recentFeedback = await fetchRecentFeedback();
    const feedbackPrompt = buildFeedbackPrompt(recentFeedback);

    const prompt =
      `Suggest one dinner for ${day} night. ` +
      `This is a ${pace} day. ` +
      `${paceRules}\n` +
      `Time limit: ${timeLimit}. ` +
      'The time must equal the REAL total cooking time including prep and cook time. ' +
      'Be conservative, not optimistic — if you are unsure, round up. ' +
      'Include oven preheat time (usually 10–15 min) in the total for any oven recipe. ' +
      'Do NOT return times under the real cooking time. ' +
      'Oven meals (baked, roasted, sheet pan) are at least 40 minutes total. ' +
      'Pizza takes at least 45 minutes total. ' +
      'Lasagna, casseroles, and stuffed peppers take at least 60 minutes total. ' +
      'Do not label oven meals as 20–30 minutes. ' +
      'Likes and dislikes are preferences, not absolute rules. Allergies are strict and must never be included. ' +
      (savedRecipesPrompt ? savedRecipesPrompt : '') +
      (communityRecipesPrompt ? communityRecipesPrompt : '') +
      (feedbackPrompt ? feedbackPrompt : '') +
      `Family:\n${familyInfo}\n` +
      (current
        ? `The current meal is: ${current}. You MUST NOT suggest this meal or anything very similar to it. `
        : '') +
      (otherMealNames
        ? `Meals already planned this week: ${otherMealNames}. You MUST suggest something clearly different in main protein, cuisine, and flavor profile. Do NOT repeat or slightly modify these meals. `
        : '') +
      'The new meal must feel distinctly different from the rest of the week. Avoid repeating similar ingredients, cooking styles, or cuisines. ' +
      'Return ONLY valid JSON. Do not include markdown, bullet points, commentary, or extra text. The response must start with { and end with }. Use this exact format: {"name":"","time":"","description":"","modifications":[]}';

    console.log('SWAP TRIGGERED');

    let result = await callAI(prompt);

    const existingMeals = DAYS
      .filter((d) => d !== day)
      .map((d) => meals[d]?.name?.toLowerCase())
      .filter(Boolean);

    const isTooSimilarMeal = (mealName) => {
      const normalizedNewMeal = (mealName || '').toLowerCase().trim();

      return existingMeals.some(
        (meal) =>
          normalizedNewMeal.includes(meal) || meal.includes(normalizedNewMeal)
      );
    };

    if (isTooSimilarMeal(result?.name)) {
      console.warn('Swap result was too similar, retrying once...');

      const retryPrompt =
        prompt +
        ' The last result was too similar to the current week. Try again with a clearly different dinner idea using a different protein, cuisine, and flavor profile. Return ONLY valid JSON. Do not include markdown or extra text.';

      result = await callAI(retryPrompt);

      if (isTooSimilarMeal(result?.name)) {
        throw new Error(
          'That swap was too similar to meals already in your week. Please try again for a more different option.'
        );
      }
    }

    if (!mealFitsPace(result, pace)) {
      throw new Error(`That swap did not fit the ${pace} time limit. Please try again.`);
    }

    const message = buildMealPlanUpdateMessage({
      action: 'swap',
      hadShoppingList,
      clearedModDays: previousMealHadMods ? 1 : 0,
    });

    showNotice(message, 'info');
    setMeals((prev) => ({ ...prev, [day]: result }));
    setShowSwapFeedback((prev) => ({ ...prev, [day]: false }));
  } catch (err) {
    console.error('swapMeal error:', err);

    await logError({
      userId: user?.id || null,
      action: 'swap_meal',
      error: err,
      context: {
        day,
        previousMeal: previousMeal?.name || null,
        pace,
        hadShoppingList,
      },
    });

    setError(err.message || 'Swap failed. Please try again.');
  } finally {
    setSwapping(null);
  }
};
  const refreshAllMods = async (mealsInput) => {
    setSwapping('all_mods');
    setError(null);
    if (!mealsInput) setShowProfileUpdatePrompt(false);

    try {
      const familyInfo = buildFamilyInfo();
      const mealsToUse = mealsInput || meals;
      const updatedMeals = { ...mealsToUse };

      const activeDays = DAYS.filter((d) => mealsToUse[d] && !mealsToUse[d].skipped);
      if (activeDays.length === 0) return;

      const mealsList = activeDays.map((d) => `${d}: ${mealsToUse[d].name}`).join('\n');

      const prompt =
        `Family:\n${familyInfo}\n\n` +
        `Meals this week:\n${mealsList}\n\n` +
        'For each meal and each person, suggest a modification only if needed — allergies, dislikes, spice level, texture, sauces on the side, or ingredient swaps. ' +
        'Skip a person for a meal only if it genuinely works perfectly for them as written. ' +
        'Return ONLY valid JSON with each day as a key: ' +
        '{"Monday":[{"person":"Name","note":"short note"}],"Tuesday":[],...} ' +
        'Only include days from the meals list above.';

      const result = await callAI(prompt, 'claude-haiku-4-5-20251001');

      let totalModCount = 0;
      for (const day of activeDays) {
        const mods = Array.isArray(result[day]) ? result[day] : [];
        updatedMeals[day] = { ...updatedMeals[day], modifications: mods };
        totalModCount += mods.filter((m) => m.person).length;
      }

      await setMeals(updatedMeals);
      onMealsRegenerated();

      if (totalModCount === 0) {
        showNotice('🎉 No new modifications needed', 'success');
      } else {
        showNotice(
          `✅ Updated ${totalModCount} modification${totalModCount === 1 ? '' : 's'}`,
          'success'
        );
      }
    } catch (err) {
      console.error('refreshAllMods error:', err);
      setError(err.message || 'Could not refresh modifications. Please try again.');
    }

    setSwapping(null);
  };

const generateShoppingList = async () => {
  setShoppingLoading(true);
  setError(null);
  setShoppingMessage('Creating your list...');

  let messageTimer;
  let messageInterval;

  try {
    messageTimer = setTimeout(() => {
      let index = 0;
      setShoppingMessage(slowMessages[index]);

      messageInterval = setInterval(() => {
        index = (index + 1) % slowMessages.length;
        setShoppingMessage(slowMessages[index]);
      }, 2500);
    }, 4000);

    const mealNames = DAYS
      .filter((d) => meals[d] && !meals[d]?.skipped)
      .map((d) => `${d}: ${meals[d].name}`)
      .join(', ');

    const prompt =
      `Generate a shopping list for these dinners: ${mealNames}. ` +
      'Group the list by store section. ' +
      'Return ONLY valid JSON: ' +
      '{"sections":[{"name":"produce","items":[{"item":"","amount":"","meal":""}]},{"name":"meat and protein","items":[]},{"name":"dairy","items":[]},{"name":"pantry","items":[]}]}';

    const result = await callAI(prompt);

setShoppingList(result.sections || []);
onShoppingListReady(result.sections || []);
} catch (err) {
  console.error('generateShoppingList error:', err);

  await logError({
    userId: user?.id || null,
    action: 'generate_shopping_list',
    error: err,
    context: {
      mealCount: Object.keys(meals || {}).length,
      sectionCount: Array.isArray(shoppingList) ? shoppingList.length : 0,
    },
  });

  setError(err.message || 'Could not generate shopping list. Please try again.');
} finally {
  clearTimeout(messageTimer);
  clearInterval(messageInterval);
  setShoppingLoading(false);
  setShoppingMessage('Creating your list...');
}
};

  const openRecipeModal = async (day) => {
    setLoadingSteps(day);
    setError(null);

    try {
      const meal = meals[day];
      const familyInfo = buildFamilyInfo();

      const prompt =
        `Create a simple family-friendly recipe for this meal: ${meal.name}. ` +
        (meal.description ? `Meal description: ${meal.description}. ` : '') +
        `Family info:\n${familyInfo}\n` +
        'Return ONLY valid JSON in this exact format: ' +
        '{"ingredients":["ingredient 1","ingredient 2"],"steps":["step 1","step 2","step 3","step 4","step 5","step 6"]}. ' +
        'Ingredients should be a simple grocery-style list with amounts when possible. ' +
        'Steps should be short, clear, and easy to follow, one sentence each. ' +
        'Do not include any extra text outside the JSON.';

      const result = await callAI(prompt);

      const ingredients = Array.isArray(result.ingredients) ? result.ingredients : [];
      const steps = Array.isArray(result.steps) ? result.steps : [];
      const stepText = steps.join(' ').toLowerCase();

      if (
        (stepText.includes('bake') || stepText.includes('roast')) &&
        parseMealDurationToMinutes(meal.time) < 30
      ) {
        console.warn('AI returned unrealistic oven recipe time:', meal.name, meal.time);
      }

      setShowIngredients(false);

      setModal({
        day,
        meal,
        ingredients,
        steps
      });
    } catch (err) {
      console.error('openRecipeModal error:', err);
      setError(err.message || 'Could not load recipe. Please try again.');
    }

    setLoadingSteps(null);
  };

  const keepMeal = async () => {
    if (!modal) return;

    setError(null);

    const totalMinutes = parseMealDurationToMinutes(modal.meal.time);

    const newRecipe = {
      id: Date.now(),
      name: modal.meal.name,
      time: modal.meal.time,
      description: modal.meal.description,
      ingredients: modal.ingredients || [],
      steps: modal.steps || [],
      modifications: modal.meal.modifications || [],
      favorite: false
    };

    try {
      const { data: existingRecipes, error: existingError } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('name', modal.meal.name);

      if (existingError) {
        throw existingError;
      }

      const alreadyExists = Array.isArray(existingRecipes) && existingRecipes.length > 0;

      if (!alreadyExists) {
        const { error: insertError } = await supabase.from('recipes').insert([
          {
            name: modal.meal.name,
            description: modal.meal.description || '',
            prep_minutes: 0,
            cook_minutes: totalMinutes,
            time_label: modal.meal.time || '',
            steps: modal.steps || [],
            ingredients: modal.ingredients || [],
            tags: [],
            dietary_flags: [],
            source_type: 'ai'
          }
        ]);

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

  useEffect(() => {
  if (profilesUpdatedAfterMeals && Object.keys(meals || {}).length > 0) {
    setShowProfileUpdatePrompt(true);
  }
}, [profilesUpdatedAfterMeals, meals]);

useEffect(() => {
  try {
    const raw = sessionStorage.getItem(NOTICE_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed?.message) return;

    const isFresh = Date.now() - (parsed.createdAt || 0) < 5000;
    if (isFresh) {
      setNotice(parsed);
    } else {
      sessionStorage.removeItem(NOTICE_STORAGE_KEY);
    }
  } catch {
    // ignore storage issues
  }
}, []);

useEffect(() => {
  if (!notice?.id) return;

  const timer = setTimeout(() => {
    clearNotice();
  }, 3200);

  return () => clearTimeout(timer);
}, [notice?.id]);

useEffect(() => {
  localStorage.setItem('tm_this_week_meals', JSON.stringify(meals || {}));
  window.dispatchEvent(new Event('tablemates-week-updated'));
}, [meals]);

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

  const shouldShowShoppingListButton =
    DAYS.every((day) => meals?.[day]?.name) &&
    (!Array.isArray(shoppingList) || shoppingList.length === 0);

  const noticeStyles =
    notice?.tone === 'success'
      ? {
          background: '#E8F7EF',
          color: '#17603E',
          border: '1px solid #B7E4C7'
        }
      : {
          background: '#FFF4E8',
          color: '#8A4B12',
          border: '1px solid #FFD9B3'
        };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        {Object.keys(meals).length === 0 ? (
          <button
            className="suggest-btn"
            onClick={suggestWeek}
            disabled={loading}
            style={{ margin: 0, flex: 1, padding: '14px' }}
          >
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
              {loading ? 'Replanning...' : 'Replan whole week'}
            </button>

            <button
  className="week-save-btn"
  onClick={onSaveWeek}
>
  Save
</button>
          </>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {notice && (
        <div
          style={{
            position: 'fixed',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '460px',
            padding: '12px 14px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '600',
            lineHeight: 1.4,
            boxShadow: '0 12px 26px rgba(0,0,0,0.12)',
            zIndex: 10002,
            ...noticeStyles
          }}
        >
          {notice.message}
        </div>
      )}

     {DAYS.map((day) => {
  const dayPace = getDayPace(schedule?.[day], schedule?.dinner_start_time);

  return (
    <div key={day} className="week-meal-card polished-meal-card">
      <div className="meal-card-top">
  <div className="meal-day">{day}</div>

  {meals[day] && !meals[day]?.skipped && (
  <span
    className="pace-badge polished-pace-badge"
    style={{
      background: paceBg[dayPace],
      color: paceColor[dayPace]
    }}
  >
    {dayPace}
  </span>
)}
{meals[day] && !meals[day]?.skipped && (
  <div className="meal-time">{meals[day].time}</div>
)}
</div>

{meals[day] ? (
  <div>
    <div className="meal-name">
      {meals[day]?.skipped ? 'Dinner Planned Elsewhere' : meals[day].name}
    </div>

    {meals[day]?.description && (
      <div className="meal-description">
        {meals[day].description}
      </div>
    )}

    {hasMods(day) && (
      <div className="mods-section" style={{ marginBottom: '12px' }}>
        <div className="mods-label">modifications</div>
        {meals[day].modifications.map((mod, j) =>
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

    <div className="meal-actions-row">
  <button
    type="button"
    className="action-btn"
    onClick={() => openRecipeModal(day)}
    disabled={loadingSteps === day || meals[day]?.skipped}
    style={{ flex: 1 }}
  >
    {loadingSteps === day ? 'loading...' : 'how to cook'}
  </button>

  <button
    type="button"
    className="action-btn swap-btn"
    onClick={() => swapMeal(day)}
    disabled={swapping === day || meals[day]?.skipped}
    style={{ flex: 1 }}
  >
    {swapping === day ? 'swapping...' : 'swap meal'}
  </button>

  <button
    type="button"
    className="action-btn"
    onClick={() => skipMealForDay(day)}
    style={{ flex: 1 }}
  >
    skip night
  </button>
</div>

{!meals[day]?.skipped && showSwapFeedback[day] && (
  <div style={{
    marginTop: '10px',
    border: '1.5px solid #E46A2E',
    borderRadius: '12px',
    padding: '10px 12px',
  }}>
    <div
      style={{
        fontSize: '13px',
        color: '#E46A2E',
        marginBottom: '6px',
        fontWeight: 600,
      }}
    >
      Not a fit?
    </div>

    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button
        type="button"
        className="action-btn"
        onClick={() =>
          submitSwapFeedback({
            day,
            mealName: meals[day]?.name || '',
            reason: 'too_long',
          })
        }
      >
        Too long
      </button>

      <button
        type="button"
        className="action-btn"
        onClick={() =>
          submitSwapFeedback({
            day,
            mealName: meals[day]?.name || '',
            reason: 'dont_like_ingredients',
          })
        }
      >
        Don’t like ingredients
      </button>

      <button
        type="button"
        className="action-btn"
        onClick={() =>
          submitSwapFeedback({
            day,
            mealName: meals[day]?.name || '',
            reason: 'not_kid_friendly',
          })
        }
      >
        Not kid-friendly
      </button>

      <button
        type="button"
        className="action-btn"
        onClick={() =>
          setSwapFeedbackOther((prev) => ({
            ...prev,
            [day]: !prev[day],
          }))
        }
      >
        Other
      </button>
    </div>

    {swapFeedbackOther[day] && (
      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Tell us why..."
          value={swapFeedbackOther[`${day}_text`] || ''}
          onChange={(e) =>
            setSwapFeedbackOther((prev) => ({
              ...prev,
              [`${day}_text`]: e.target.value,
            }))
          }
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #D1D5DB',
            fontSize: '13px',
          }}
        />

        <button
          type="button"
          className="action-btn"
          onClick={() => {
            submitSwapFeedback({
              day,
              mealName: meals[day]?.name || '',
              reason: 'other',
              text: swapFeedbackOther[`${day}_text`] || '',
            });

            setSwapFeedbackOther((prev) => ({
              ...prev,
              [day]: false,
              [`${day}_text`]: '',
            }));
          }}
        >
          Submit
        </button>
      </div>
    )}
  </div>
)}
</div>
) : (
  <div className="week-meal-empty">
    {loading ? 'thinking...' : 'not yet planned'}
  </div>
)}
</div>
);
})}

      {shouldShowShoppingListButton && (
        <div
          style={{
            position: 'sticky',
            bottom: '16px',
            marginTop: '20px',
            paddingTop: '12px',
            paddingBottom: '4px',
            background: 'linear-gradient(to top, #f7f7f5 60%, transparent)',
            zIndex: 20
          }}
        >
          <button
            className="suggest-btn"
            onClick={generateShoppingList}
            disabled={shoppingLoading}
            style={{
              width: '100%',
              maxWidth: '420px',
              margin: '0 auto',
              display: 'block'
            }}
          >
            {shoppingLoading ? shoppingMessage : '🛒 Create Shopping List'}
          </button>
        </div>

      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-sheet recipe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>

            <div className="modal-title">{modal.meal.name}</div>

            <div
              style={{
                fontSize: '15px',
                lineHeight: 1.5,
                color: '#6B7280',
                marginBottom: '20px'
              }}
            >
              <span style={{ color: '#E46A2E', fontWeight: 600 }}>⏱ {modal.meal.time}</span>
              {' · '}
              {modal.meal.description}
            </div>

            {modal.ingredients?.length > 0 && (
              <div
                style={{
                  background: '#F6F8F7',
                  border: '1px solid #E8EFEA',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '8px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowIngredients((prev) => !prev)}
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
                  <span>Ingredients ({modal.ingredients.length})</span>

                  <span
                    style={{
                      fontSize: '20px',
                      color: '#E46A2E',
                      fontWeight: '600',
                      lineHeight: 1
                    }}
                  >
                    {showIngredients ? '−' : '+'}
                  </span>
                </button>

                {showIngredients && (
                  <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                    {modal.ingredients.map((item, i) => (
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

            <h3
              style={{
                margin: '28px 0 14px 0',
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

      {showProfileUpdatePrompt && (
        <div className="modal-overlay" onClick={() => setShowProfileUpdatePrompt(false)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
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
              Profile updated
            </div>

            <div
              style={{
                fontSize: '15px',
                lineHeight: 1.5,
                color: '#6B7280',
                marginBottom: '22px'
              }}
            >
              A family profile was updated. Check for meal modifications?
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="modal-keep"
                onClick={refreshAllMods}
                style={{ flex: 1 }}
              >
                {swapping === 'all_mods' ? 'checking...' : 'Check mods'}
              </button>

              <button
                className="modal-swap"
                onClick={() => setShowProfileUpdatePrompt(false)}
                style={{ flex: 1 }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

    {shoppingLoading && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(247,247,245,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9998,
      padding: '24px'
    }}
  >
    <div
      style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '30px',
        textAlign: 'center',
        boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
        maxWidth: '340px',
        width: '100%'
      }}
    >
      <div
        style={{
          fontSize: '36px',
          animation: 'forkBounce 1s infinite'
        }}
      >
        🛒
      </div>

      <div
        style={{
          marginTop: '12px',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1a1a1a'
        }}
      >
        {shoppingMessage}
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
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
              maxWidth: '340px',
              width: '100%'
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
                fontWeight: '600',
                color: '#1a1a1a'
              }}
            >
              Searching through my grandma’s recipe box...
            </div>

            <div
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color: '#777',
                lineHeight: '1.5'
              }}
            >
              finding something good for this week...
            </div>
          </div>

          <style>
            {`
              @keyframes forkBounce {
                0%, 100% { transform: translateY(0); }
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