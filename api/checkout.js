export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    console.log('PRICE_ID:', process.env.STRIPE_PRICE_ID);
    console.log('SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/members?token={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message, err.raw);
    res.status(500).json({ error: err.message });
  }
}
