/**
 * Vercel API Route: Complete Task
 *
 * This is a serverless function that runs on Vercel's servers.
 * It acts as a middleman between your React app and Google Apps Script.
 *
 * How it works:
 * 1. React app sends a request to /api/complete-task
 * 2. This function receives the task_id
 * 3. It forwards the request to Google Apps Script
 * 4. Google updates the Google Sheet
 * 5. Response is sent back to React
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { task_id } = req.body;

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
        action: 'complete_task',
        task_id: task_id,
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
