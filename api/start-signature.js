import fetch from 'node-fetch';
import FormData from 'form-data';

const apiBaseUrl = 'https://api-sandbox.yousign.app/v3';
const apiKey = process.env.YOUSIGN_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { first_name, last_name, email } = req.body;
    console.log('Received signature request for:', { first_name, last_name, email });
    // Fetch the PDF from the public directory via HTTP
    const pdfUrl = `https://${req.headers.host}/NDA.pdf`;
    const pdfBuffer = Buffer.from(await fetch(pdfUrl).then(r => r.arrayBuffer()));
    console.log('Fetched PDF from:', pdfUrl);

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
    console.log('Signature request creation response:', signatureRequest);
    if (!signatureRequest.id) {
      console.error('Failed to create signature request:', signatureRequest);
      return res.status(500).json({ error: 'Failed to create signature request', details: signatureRequest });
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
    console.log('Document upload response:', document);
    if (!document.id) {
      console.error('Failed to upload document:', document);
      return res.status(500).json({ error: 'Failed to upload document', details: document });
    }

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
    console.log('Signer creation response:', signer);
    if (!signer.id) {
      console.error('Failed to add signer:', signer);
      return res.status(500).json({ error: 'Failed to add signer', details: signer });
    }

    // 4. Activate signature request
    response = await fetch(`${apiBaseUrl}/signature_requests/${signatureRequest.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
    });
    const activateResp = await response.json();
    console.log('Activation response:', activateResp);
    if (activateResp.error) {
      console.error('Failed to activate signature request:', activateResp);
      return res.status(500).json({ error: 'Failed to activate signature request', details: activateResp });
    }

    // 5. Poll for signature_link in the signers array (up to 10 attempts, 3s apart)
    let signatureLink = null;
    const maxAttempts = 10;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      response = await fetch(`${apiBaseUrl}/signature_requests/${signatureRequest.id}`, {
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
      });
      const sigReqDetails = await response.json();
      console.log(`Polling attempt ${attempt + 1}:`, sigReqDetails);
      signatureLink = sigReqDetails.signers?.[0]?.signature_link;
      if (signatureLink) break;
      await delay(3000); // wait 3 seconds before next attempt
    }

    if (!signatureLink) {
      console.error('Failed to get signature link after polling for request:', signatureRequest.id);
      return res.status(500).json({ error: 'Failed to get signature link after polling.' });
    }

    console.log('Signature link found:', signatureLink);
    res.status(200).json({ iframeUrl: signatureLink, signatureRequestId: signatureRequest.id });
  } catch (err) {
    console.error('Error in start-signature:', err);
    res.status(500).json({ error: err.message });
  }
} 