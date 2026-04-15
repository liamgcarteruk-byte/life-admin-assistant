export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, sender_email, status } = req.body;

    if (action !== 'manage_sender') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (!sender_email || !status) {
      return res.status(400).json({ error: 'Missing sender_email or status' });
    }

    // Forward to Google Apps Script
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec';
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manage_sender',
        sender_email: sender_email,
        status: status
      })
    });

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in manage-sender:', error);
    return res.status(500).json({ error: error.message });
  }
}
