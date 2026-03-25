import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const ALLOWED_ORIGINS = [
  'https://www.tablemates.io',
  'https://tablemates.io',
  'https://tablemates-psi.vercel.app',
  'http://localhost:3000',
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.'
    });
  }

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

  try {
    const { prompt, model } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: 'Missing or invalid prompt'
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY');
      return res.status(500).json({
        error: 'Missing ANTHROPIC_API_KEY'
      });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: prompt.trim()
          }
        ]
      })
    });

    const rawText = await anthropicResponse.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Anthropic returned non-JSON:', rawText);
      return res.status(502).json({
        error: 'Anthropic returned non-JSON response',
        raw: rawText.slice(0, 500)
      });
    }

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', data);
      return res.status(anthropicResponse.status).json({
        error: data?.error?.message || 'Anthropic request failed',
        details: data
      });
    }

    const text =
      Array.isArray(data?.content)
        ? data.content
            .filter((block) => block?.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim()
        : '';

    if (!text) {
      console.error('No text returned from Anthropic:', data);
      return res.status(500).json({
        error: 'No response text returned from Anthropic'
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error('AI route error:', error);

    return res.status(500).json({
      error: error.message || 'Server error'
    });
  }
}