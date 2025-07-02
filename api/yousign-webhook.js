export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  console.log('Received Yousign webhook:', req.body);
  // TODO: Add logic to store status in a database or in-memory cache if needed
  res.status(200).send('OK');
} 