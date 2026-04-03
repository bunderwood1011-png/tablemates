import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(rawBody, signature, secret) {
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=');
    acc[key] = val;
    return acc;
  }, {});

  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) throw new Error('Invalid signature format');

  const tolerance = 300; // 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > tolerance) {
    throw new Error('Timestamp too old');
  }

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    throw new Error('Signature mismatch');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await getRawBody(req);

  try {
    verifyStripeSignature(rawBody.toString(), req.headers['stripe-signature'], webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const event = JSON.parse(rawBody.toString());

  // Use anon key — RPCs are SECURITY DEFINER so they bypass RLS
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  const FOUNDING_PRICE_ID = process.env.STRIPE_FOUNDING_PRICE_ID;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const tier = sub.items?.data?.[0]?.price?.id === FOUNDING_PRICE_ID ? 'founding' : 'pro';

      await supabase.rpc('update_subscription_from_stripe', {
        p_stripe_customer_id: sub.customer,
        p_subscription_status: sub.status,
        p_subscription_id: sub.id,
        p_subscription_tier: tier,
        p_trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.rpc('cancel_subscription_from_stripe', {
        p_stripe_customer_id: sub.customer,
      });
      break;
    }

    default:
      break;
  }

  return res.status(200).json({ received: true });
}
