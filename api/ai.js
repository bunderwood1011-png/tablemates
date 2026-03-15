import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log('Anthropic key exists:', !!apiKey);
    console.log('Anthropic key length:', apiKey?.length || 0);

    if (!apiKey) {
      return res.status(500).json({
        error: 'Missing ANTHROPIC_API_KEY in local environment'
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', data);
      return res.status(anthropicResponse.status).json({
        error: data?.error?.message || 'Anthropic request failed'
      });
    }

    const text = data?.content?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'No response text returned from Anthropic' });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error('AI route error:', error);
    return res.status(500).json({
      error: error.message || 'Server error'
    });
  }
}