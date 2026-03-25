import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL' });
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
