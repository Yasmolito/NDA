import fs from 'fs';
import path from 'path';

const STATUS_FILE = path.resolve(process.cwd(), 'signature-status.json');

function readStatuses() {
  try {
    const data = fs.readFileSync(STATUS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function writeStatuses(statuses) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(statuses, null, 2), 'utf8');
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
      const statuses = readStatuses();
      statuses[signatureRequestId] = {
        status,
        event: event_name,
        signerStatus,
        updatedAt: Date.now(),
        raw: req.body
      };
      writeStatuses(statuses);
    }
  } catch (e) {
    console.error('Error processing webhook:', e);
  }
  res.status(200).send('OK');
}

export function getSignatureStatus(id) {
  const statuses = readStatuses();
  return statuses[id];
} 