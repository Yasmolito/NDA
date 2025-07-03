const apiBaseUrl = 'https://api-sandbox.yousign.app/v3';
const apiKey = process.env.YOUSIGN_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  const response = await fetch(`${apiBaseUrl}/signature_requests/${id}`, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
  const sigReqDetails = await response.json();
  res.json({
    status: sigReqDetails.status,
    signers: sigReqDetails.signers?.map(s => ({
      id: s.id,
      status: s.status
    })) || []
  });
} 