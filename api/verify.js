import Stripe from 'stripe';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { sessionId, trackId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    if (session.metadata.trackId !== trackId) {
      return res.status(403).json({ error: 'Track mismatch' });
    }

    const usedKey = `used_${sessionId}`;
    const alreadyUsed = await redis.get(usedKey);
    if (alreadyUsed) {
      return res.status(403).json({ error: 'Token already used' });
    }

    await redis.set(usedKey, '1', { ex: 86400 });

    const tracks = {
      kokoro_hashire: process.env.AUDIO_URL_KOKORO,
    };

    const audioUrl = tracks[trackId];
    if (!audioUrl) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.status(200).json({ audioUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
