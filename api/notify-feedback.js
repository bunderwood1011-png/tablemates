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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized' });

  // Verify caller is admin
  const { data: account } = await supabase
    .from('accounts')
    .select('is_admin')
    .eq('user_id', authUser.id)
    .single();

  if (!account?.is_admin) return res.status(403).json({ error: 'Forbidden' });

  const { toEmail, title, body } = req.body || {};
  if (!toEmail || !title || !body) return res.status(400).json({ error: 'Missing fields' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Missing RESEND_API_KEY' });

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Tablemates <hello@tablemates.io>',
      to: [toEmail],
      subject: `Update from Tablemates: ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <div style="font-size: 13px; font-weight: 700; color: #1D9E75; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">Tablemates Update</div>
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 12px; line-height: 1.3;">${title}</div>
          <div style="font-size: 15px; color: #444; line-height: 1.75; margin-bottom: 28px;">${body}</div>
          <a href="https://tablemates.io" style="display: inline-block; background: #1D9E75; color: white; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">Open Tablemates</a>
          <div style="font-size: 12px; color: #aaa; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; line-height: 1.6;">
            You're getting this because you sent feedback to Tablemates. Thanks for helping us improve!
          </div>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    return res.status(502).json({ error: err.message || 'Failed to send email' });
  }

  return res.status(200).json({ ok: true });
}
