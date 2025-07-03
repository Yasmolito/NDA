import { signatureStatuses } from './yousign-webhook';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const status = signatureStatuses[id];
  if (!status) return res.status(404).json({ status: 'unknown' });
  res.json(status);
} 