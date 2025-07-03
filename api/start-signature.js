import fetch from 'node-fetch';
import FormData from 'form-data';

const apiBaseUrl = 'https://api-sandbox.yousign.com/v3';
const apiKey = process.env.YOUSIGN_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { first_name, last_name, email } = req.body;
    // Fetch the PDF from the public directory via HTTP
    const pdfUrl = `https://${req.headers.host}/NDA.pdf`;
    const pdfBuffer = await fetch(pdfUrl).then(r => r.buffer());

    // 1. Create signature request
    let response = await fetch(`${apiBaseUrl}/signature_requests`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: 'Signature Request',
        delivery_mode: 'email',
        timezone: 'Europe/Paris',
      }),
    });
    const signatureRequest = await response.json();
    if (!signatureRequest.id) {
      throw new Error('Failed to create signature request: ' + JSON.stringify(signatureRequest));
    }

    // 2. Upload document
    const form = new FormData();
    form.append('file', pdfBuffer, 'file.pdf');
    form.append('nature', 'signable_document');
    response = await fetch(`${apiBaseUrl}/signature_requests/${signatureRequest.id}/documents`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });
    const document = await response.json();
    if (!document.id) throw new Error('Failed to upload document: ' + JSON.stringify(document));

    // 3. Add signer
    const signerPayload = {
      info: {
        first_name,
        last_name,
        email,
        locale: 'fr',
      },
      signature_authentication_mode: 'no_otp',
      signature_level: 'electronic_signature',
      fields: [{
        document_id: document.id,
        type: 'signature',
        height: 40,
        width: 85,
        page: 1,
        x: 100,
        y: 100,
      }],
    };
    response = await fetch(`${apiBaseUrl}/signature_requests/${signatureRequest.id}/signers`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(signerPayload),
    });
    const signer = await response.json();
    if (!signer.id) {
      throw new Error('Failed to add signer: ' + JSON.stringify(signer));
    }

    // 4. Activate signature request
    response = await fetch(`${apiBaseUrl}/signature_requests/${signatureRequest.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
    });
    await response.json();

    // 5. Poll for signature_link in the signers array (up to 30 attempts, 5s apart)
    let signatureLink = null;
    const maxAttempts = 30;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      response = await fetch(`${apiBaseUrl}/signature_requests/${signatureRequest.id}`, {
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
      });
      const sigReqDetails = await response.json();
      signatureLink = sigReqDetails.signers?.[0]?.signature_link;
      if (signatureLink) break;
      await delay(5000); // wait 5 seconds before next attempt
    }

    if (!signatureLink) {
      throw new Error('Failed to get signature link after polling.');
    }

    res.status(200).json({ iframeUrl: signatureLink, signatureRequestId: signatureRequest.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 