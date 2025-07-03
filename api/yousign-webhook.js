const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function setSignatureStatus(signatureRequestId, statusObj) {
  await fetch(`${UPSTASH_REDIS_REST_URL}/set/signature:${signatureRequestId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: JSON.stringify(statusObj) })
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  console.log('Received Yousign webhook:', req.body);
  try {
    const { event_name, data } = req.body;
    const signatureRequestId = data?.signature_request?.id;
    const status = data?.signature_request?.status;
    const signerStatus = data?.signer?.status;
    if (signatureRequestId) {
      await setSignatureStatus(signatureRequestId, {
        status,
        event: event_name,
        signerStatus,
        updatedAt: Date.now(),
        raw: req.body
      });
      console.log('Upstash: set status for', signatureRequestId);
    }
  } catch (e) {
    console.error('Error processing webhook:', e);
  }
  res.status(200).send('OK');
}

export async function getSignatureStatus(id) {
  const resp = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/signature:${id}`, {
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
    }
  });
  const data = await resp.json();
  if (!data.result) return null;
  return JSON.parse(data.result);
} // trigger redeploy
