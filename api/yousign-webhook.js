// In-memory storage for signature statuses
const signatureStatuses = {};

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
      signatureStatuses[signatureRequestId] = {
        status,
        event: event_name,
        signerStatus,
        updatedAt: Date.now(),
        raw: req.body
      };
    }
  } catch (e) {
    console.error('Error processing webhook:', e);
  }
  res.status(200).send('OK');
}

// Export for use in other endpoints
export { signatureStatuses }; 