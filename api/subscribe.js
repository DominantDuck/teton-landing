// Vercel Serverless Function — email collection
// Emails are stored in Vercel KV (Redis). Set up:
//   1. Go to your Vercel dashboard → Storage → Create KV Database
//   2. Link it to this project — env vars are auto-injected
//
// If you don't want KV, swap the storage logic below for any DB/service.

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // ── Storage: Vercel KV ──────────────────────────────
    // If KV_REST_API_URL is set, use Vercel KV
    if (process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      const timestamp = new Date().toISOString();
      // Store as a hash: email → signup date
      await kv.hset('teton:emails', { [email]: timestamp });
      // Also push to a list for easy enumeration
      await kv.lpush('teton:email_list', JSON.stringify({ email, timestamp }));
    } else {
      // Fallback: just log (visible in Vercel dashboard → Logs)
      console.log(`[SIGNUP] ${email} at ${new Date().toISOString()}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
