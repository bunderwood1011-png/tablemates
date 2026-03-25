import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const logError = async (type, message, context) => {
  try {
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    await supabase.from('error_logs').insert({ error_type: type, error_message: message, context });
  } catch {}
};

const ALLOWED_ORIGINS = [
  'https://www.tablemates.io',
  'https://tablemates.io',
  'https://tablemates-psi.vercel.app',
  'http://localhost:3000',
];

function isValidPublicUrl(urlString) {
  let parsed;
  try { parsed = new URL(urlString); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const h = parsed.hostname;
  if (h === 'localhost') return false;
  if (/^127\./.test(h)) return false;
  if (/^10\./.test(h)) return false;
  if (/^192\.168\./.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (h === '169.254.169.254') return false;
  if (h.endsWith('.local')) return false;
  return true;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify Supabase auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL' });
  }

  if (!isValidPublicUrl(url)) {
    return res.status(400).json({ error: 'Invalid or disallowed URL.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  // Fetch the page
  let pageText;
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Tablemates/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!pageRes.ok) {
      await logError('recipe_fetch_failed', `HTTP ${pageRes.status}`, url);
      return res.status(422).json({ error: `Could not fetch that page (${pageRes.status}). Try copying the recipe manually.` });
    }

    const html = await pageRes.text();

    // Strip tags and collapse whitespace — keep it lean for the AI
    pageText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000); // cap at ~12k chars to stay within token limits
  } catch (err) {
    await logError('recipe_fetch_error', err.message || 'Fetch failed', url);
    return res.status(422).json({ error: 'Could not reach that URL. The site may be blocking requests.' });
  }

  // Ask Claude to extract the recipe
  const prompt =
    'Extract the recipe from the following webpage text. ' +
    'Return ONLY valid JSON in this exact format — no markdown, no commentary:\n' +
    '{"name":"","description":"","prep_minutes":0,"cook_minutes":0,"ingredients":[],"steps":[]}\n\n' +
    'Rules:\n' +
    '- name: the recipe name\n' +
    '- description: one short sentence describing the dish (optional, can be "")\n' +
    '- prep_minutes: prep time as an integer (0 if not found)\n' +
    '- cook_minutes: cook time as an integer (0 if not found)\n' +
    '- ingredients: array of strings, each one ingredient with quantity\n' +
    '- steps: array of strings, each one step in plain language\n' +
    '- If the page does not contain a recipe, return {"error":"No recipe found"}\n\n' +
    'Page content:\n' + pageText;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await anthropicRes.json();
  const text = data?.content?.find((b) => b.type === 'text')?.text?.trim() || '';

  let recipe;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    recipe = JSON.parse(jsonMatch?.[0] || text);
  } catch {
    return res.status(500).json({ error: 'Could not parse recipe from that page.' });
  }

  if (recipe.error) {
    return res.status(422).json({ error: recipe.error });
  }

  return res.status(200).json(recipe);
}
