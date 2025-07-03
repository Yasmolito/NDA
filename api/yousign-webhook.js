import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'nda';
const collectionName = 'signature_status';

async function upsertSignatureStatus(signatureRequestId, statusObj) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    await collection.updateOne(
      { _id: signatureRequestId },
      { $set: { ...statusObj, _id: signatureRequestId } },
      { upsert: true }
    );
  } finally {
    await client.close();
  }
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
      await upsertSignatureStatus(signatureRequestId, {
        status,
        event: event_name,
        signerStatus,
        updatedAt: Date.now(),
        raw: req.body
      });
    }
  } catch (e) {
    console.error('Error processing webhook:', e);
  }
  res.status(200).send('OK');
}

export async function getSignatureStatus(id) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    return await collection.findOne({ _id: id });
  } finally {
    await client.close();
  }
} 