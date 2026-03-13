// Vercel Serverless Function — email collection via Blob storage
// Setup: Vercel dashboard → Storage → Create Blob Store → Connect to Project

import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse body — handle string or already-parsed object
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const timestamp = new Date().toISOString();

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Read existing emails
      let emails = [];
      try {
        const { blobs } = await list({ prefix: 'teton-emails' });
        if (blobs.length > 0) {
          const response = await fetch(blobs[0].url);
          emails = await response.json();
        }
      } catch (e) {
        // First time — no file yet
      }

      // Check for duplicates
      if (!emails.some(e => e.email === email)) {
        emails.push({ email, timestamp });
      }

      // Write updated list back
      await put('teton-emails.json', JSON.stringify(emails, null, 2), {
        access: 'private',
        addRandomSuffix: false,
      });
    } else {
      // Fallback: log to Vercel runtime logs (Dashboard → Logs)
      console.log(`[SIGNUP] ${email} at ${timestamp}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
