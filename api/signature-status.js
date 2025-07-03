export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  // Inline Redis fetch logic
  const resp = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/signature:${id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      }
    }
  );
  const data = await resp.json();
  if (!data.result) return res.status(404).json({ status: 'unknown' });
  res.json(JSON.parse(data.result));
} 