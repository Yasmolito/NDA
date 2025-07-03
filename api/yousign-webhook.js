export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  console.log('Webhook received:', req.body);

  // Parse the webhook payload
  let body = req.body;
  if (!body) {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      body = req.body;
    }
  }

  // Extract the signature request ID and status/event
  const signatureRequestId = body?.data?.id || body?.data?.signature_request_id || body?.signature_request_id || body?.id;
  const status = body?.data?.status || body?.status || null;
  const event = body?.event || null;

  if (!signatureRequestId) {
    res.status(400).json({ error: 'Missing signature request ID' });
    return;
  }

  // Inline Upstash Redis logic
  const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    res.status(500).json({ error: 'Redis environment variables not set' });
    return;
  }

  // Store the status/event in Redis
  const redisKey = `signature-status:${signatureRequestId}`;
  const value = JSON.stringify({ status, event, updatedAt: Date.now() });

  try {
    const redisResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/set/${redisKey}/${encodeURIComponent(value)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Redis write response:', redisResponse.status, redisResponse.statusText);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Redis', details: err.message });
  }
} 