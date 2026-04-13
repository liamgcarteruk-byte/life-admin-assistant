/**
 * Vercel API Route: Add Task
 *
 * This is a serverless function that runs on Vercel's servers.
 * It receives form data from your React app and creates a new task in Google Sheets.
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract the task data from the request
  const { title, description, category, priority, due_date } = req.body;

  // Your Google Apps Script deployment URL
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec';

  try {
    // Make the request FROM Vercel's servers (not from the browser)
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add_task',
        title,
        description,
        category,
        priority,
        due_date,
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
