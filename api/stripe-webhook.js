import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  const getSupabaseUserId = async (customerId) => {
    const { data } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    return data?.user_id;
  };

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = await getSupabaseUserId(sub.customer);
      if (!userId) break;

      const tier = sub.metadata?.tier ||
        (sub.items?.data?.[0]?.price?.id === process.env.STRIPE_FOUNDING_PRICE_ID ? 'founding' : 'pro');

      await supabase.from('accounts').update({
        subscription_status: sub.status,
        subscription_id: sub.id,
        subscription_tier: tier,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      }).eq('user_id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = await getSupabaseUserId(sub.customer);
      if (!userId) break;

      await supabase.from('accounts').update({
        subscription_status: 'canceled',
        subscription_id: null,
        trial_end: null,
      }).eq('user_id', userId);
      break;
    }

    default:
      break;
  }

  return res.status(200).json({ received: true });
}
