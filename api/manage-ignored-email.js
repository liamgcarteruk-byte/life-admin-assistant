/**
 * Vercel API Route: Manage Ignored Email
 *
 * This is a serverless function that handles actions on ignored emails.
 * Actions: approve (move to flagged), whitelist_sender (create rule), delete
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract the data from the request
  const { action, email_id, sender_email, sender_name } = req.body;

  // Your Google Apps Script deployment URL
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec';

  try {
    // Make the request FROM Vercel's servers (not from the browser)
    // This avoids CORS restrictions entirely
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'manage_ignored_email',
        sub_action: action,
        email_id,
        sender_email,
        sender_name,
      }),
    });

    // Get the response from Google Apps Script
    const data = await response.json();

    // Send it back to your React app
    return res.status(200).json(data);
  } catch (error) {
    // If something goes wrong, return an error
    return res.status(500).json({ error: error.message });
  }
}
