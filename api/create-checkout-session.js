import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://www.tablemates.io',
  'https://tablemates.io',
  'https://tablemates-psi.vercel.app',
  'http://localhost:3000',
];

async function stripePost(path, params, secretKey) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe error ${res.status}`);
  return data;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.slice(7);

  // Use user's JWT so RLS allows writes
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { plan } = req.body || {};
  const PRICE_MAP = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    founding: process.env.STRIPE_FOUNDING_PRICE_ID,
  };
  const resolvedPriceId = plan && PRICE_MAP[plan];
  if (!resolvedPriceId) return res.status(400).json({ error: 'Invalid plan' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('stripe_customer_id, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (account?.subscription_tier === 'beta_lifetime') {
      return res.status(400).json({ error: 'You already have lifetime access.' });
    }

    let customerId = account?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripePost('/customers', {
        email: user.email,
        'metadata[supabase_user_id]': user.id,
      }, secretKey);
      customerId = customer.id;
      // Use SECURITY DEFINER RPC to save customer ID (bypasses RLS reliably)
      await supabase.rpc('save_stripe_customer_id', {
        p_user_id: user.id,
        p_stripe_customer_id: customerId,
      });
    }

    const appUrl = origin || 'https://tablemates.io';

    const sessionParams = {
      customer: customerId,
      'payment_method_types[0]': 'card',
      'line_items[0][price]': resolvedPriceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${appUrl}?checkout=success`,
      cancel_url: `${appUrl}?checkout=cancelled`,
    };
    if (plan === 'pro') {
      sessionParams['subscription_data[trial_period_days]'] = '7';
    }

    const session = await stripePost('/checkout/sessions', sessionParams, secretKey);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
