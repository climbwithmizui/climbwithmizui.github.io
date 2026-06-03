import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { token } = req.body;

    // Stripeセッション確認
    const session = await stripe.checkout.sessions.retrieve(token);

    if (session.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    // トークンの使い回し防止（IPベース）
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const tokenKey = `token_${token}`;
    const storedIp = await redis.get(tokenKey);

    if (storedIp && storedIp !== ip) {
      return res.status(403).json({ error: 'Token used from different device' });
    }

    if (!storedIp) {
      // 初回アクセス：IPを記録（30日有効）
      await redis.set(tokenKey, ip, { ex: 60 * 60 * 24 * 30 });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
