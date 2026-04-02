import dotenv from 'dotenv';
import Stripe from 'stripe';
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

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { priceId, plan } = req.body || {};

  // Resolve price from plan name (preferred) or fall back to explicit priceId
  const PRICE_MAP = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    founding: process.env.STRIPE_FOUNDING_PRICE_ID,
  };
  const resolvedPriceId = (plan && PRICE_MAP[plan]) || priceId;
  if (!resolvedPriceId) return res.status(400).json({ error: 'Missing priceId' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Get or create Stripe customer
  const { data: account } = await supabase
    .from('accounts')
    .select('stripe_customer_id, subscription_status, subscription_tier')
    .eq('user_id', user.id)
    .single();

  // Don't let lifetime users checkout
  if (account?.subscription_tier === 'beta_lifetime') {
    return res.status(400).json({ error: 'You already have lifetime access.' });
  }

  let customerId = account?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('accounts').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
  }

  const appUrl = origin || 'https://tablemates.io';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: resolvedPriceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: resolvedPriceId === process.env.STRIPE_PRO_PRICE_ID ? 7 : 0,
    },
    success_url: `${appUrl}?checkout=success`,
    cancel_url: `${appUrl}?checkout=cancelled`,
  });

  return res.status(200).json({ url: session.url });
}
