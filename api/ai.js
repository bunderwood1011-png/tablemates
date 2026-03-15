import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { prompt } = req.body || {};

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const rawText = await anthropicResponse.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
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

    const textBlocks = Array.isArray(data?.content) ? data.content : [];
    const text = textBlocks
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

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