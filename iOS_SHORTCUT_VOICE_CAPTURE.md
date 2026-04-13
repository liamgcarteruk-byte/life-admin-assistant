# iOS Shortcut: Frictionless Voice Memo Capture

## Overview

This guide sets up an iOS Shortcut that allows you to:
1. **Double-tap the back of your phone** (even when locked)
2. **Speak a task** (Siri listens automatically)
3. **Everything else is automatic** — task appears in your app

**Time to set up:** ~5 minutes  
**Time to use:** ~5 seconds per task

---

## How It Works (Technical Overview)

```
Double-tap phone
    ↓
iOS Shortcut triggers
    ↓
Siri asks for voice input (dictation)
    ↓
You speak your task
    ↓
Shortcut sends text to your API (/api/add-task)
    ↓
Your Vercel backend creates the task in Google Sheets
    ↓
Task appears in your Life Admin app
    ↓
You get a notification confirming success
```

---

## Step 1: Create the iOS Shortcut

Open the **Shortcuts app** on your iPhone and follow these exact steps:

### 1.1 Create a New Shortcut
1. Tap **"+"** button (or "Create Shortcut")
2. Search for and add this action: **"Dictate Text"**
   - This opens Siri and listens for your voice
   - The spoken text is automatically transcribed

### 1.2 Add Error Handling
3. Tap **"+"** below "Dictate Text"
4. Search for: **"Ask for Text"** 
   - Purpose: If Siri doesn't hear anything, this asks you to type instead
   - Prompt: **"What's the task?"**
   - Set as fallback (in case dictation fails)

### 1.3 Add the API Request
5. Tap **"+"** and search for: **"Get contents of URL"**
   - Method: **POST**
   - URL: `https://life-admin-assistant.vercel.app/api/add-task`
   - Headers: Check the "Show More" or "Headers" section and add:
     ```
     Content-Type: application/json
     ```
   - Request Body: Choose **"JSON"** and enter:
     ```json
     {
       "title": "[Dictated Text]",
       "category": "personal",
       "priority": "medium",
       "due_date": "",
       "description": "Created via voice shortcut"
     }
     ```
     (Where `[Dictated Text]` is the variable from the Dictate Text step)

### 1.4 Add Success Notification
6. Tap **"+"** and search for: **"Show Result"**
   - This shows a confirmation that the task was saved
   - Text: **"✅ Task saved: [Dictated Text]"**

### 1.5 Add Error Notification
7. After the URL request, add: **"Ask for Text"** as a fallback
   - If the API request fails, ask the user what happened

---

## Step 2: Set Up Back-Tap Trigger

Once the Shortcut is created, configure it to run when you double-tap your phone's back:

1. Open **Settings** on your iPhone
2. Go to **Accessibility** → **Touch** → **Back Tap**
3. Tap **"Double Tap"** (or Triple Tap if you prefer)
4. Scroll down and tap **"Shortcuts"**
5. Select the Shortcut you just created (name it something like **"Quick Task"**)

**That's it!** Now whenever you double-tap the back of your phone, the Shortcut will run.

---

## Step 3: Test It

1. **First test (app open):**
   - Open your Life Admin app
   - Double-tap back of phone
   - Speak: **"Test task"**
   - You should see a confirmation notification
   - Check your app — the task should appear immediately

2. **Second test (app closed):**
   - Close the Life Admin app completely
   - Lock your phone
   - Double-tap the back of your phone
   - Speak: **"Buy groceries"**
   - You'll get a notification confirming the task was saved
   - Later, open the app and the task will be there

3. **Third test (in background):**
   - Open any app (not Life Admin)
   - Double-tap back of phone
   - Speak: **"Call dentist"**
   - Confirm it works without opening the Life Admin app

---

## Detailed Shortcut Steps (Visual Reference)

If you're having trouble following the above, here's a more detailed breakdown:

### Action 1: Dictate Text
```
Action: Dictate Text
Purpose: Listens to your voice and converts to text
Variable Name: Dictated Text (this is what we'll use later)
```

### Action 2: Get Contents of URL
```
Action: Get Contents of URL
Method: POST
URL: https://life-admin-assistant.vercel.app/api/add-task

Headers:
  Content-Type: application/json

Request Body (JSON):
{
  "title": "[Dictated Text]",
  "category": "personal",
  "priority": "medium",
  "due_date": "",
  "description": "Created via voice shortcut"
}
```

### Action 3: Show Result
```
Action: Show Result
Text: ✅ Task saved: [Dictated Text]
```

---

## Customization Options

### Change the Category
In the JSON body, change `"category": "personal"` to:
- `"finance"` for money-related tasks
- `"health"` for health reminders
- `"property"` for home/property tasks
- `"work"` for work tasks

### Change the Priority
Change `"priority": "medium"` to:
- `"low"` for casual tasks
- `"high"` for urgent tasks

### Add Due Date
To set a due date (e.g., today), change:
```json
"due_date": ""
```
to:
```json
"due_date": "[Current Date]"
```
(Use Shortcut's "Current Date" variable)

### Custom Confirmation Message
In the "Show Result" action, change the text to whatever you like:
- ✅ Done!
- ✅ Task recorded
- ✅ Got it!

---

## Troubleshooting

### "Back Tap isn't working"
- Make sure you have iOS 14.5 or later
- Go to Settings → Accessibility → Touch → Back Tap and confirm it's enabled
- Try tapping slightly harder on the back of your phone
- The sweet spot is usually in the middle-lower area of the back

### "Siri doesn't hear me"
- Speak clearly at normal pace (not too fast, not too slow)
- Make sure you're in a relatively quiet environment
- If Siri really can't hear, the "Ask for Text" fallback will let you type instead

### "Task doesn't appear in app"
- Check your internet connection (API call needs connectivity)
- Open the app and do a manual refresh (pull down to refresh)
- Check the browser console (F12) for any error messages
- Make sure the Shortcut shows a successful confirmation notification

### "I get an error notification"
- Double-check the API URL is exactly: `https://life-admin-assistant.vercel.app/api/add-task`
- Make sure the JSON in the request body is valid (no typos or missing commas)
- Verify your Vercel deployment is still running

### "The confirmation never appears"
- The Shortcut might be running in the background
- Pull down from the top of your screen to see notifications
- Or add a vibration alert: Add "Vibrate Device" action after the API call

---

## Advanced Options

### Add Haptic Feedback (Phone Vibrates)
To feel confirmation instead of seeing it:
1. Add action: **"Vibrate Device"** after the API request
2. Choose: **"Success"** vibration pattern
3. Now your phone will buzz when the task is saved

### Add Sound Alert
1. Add action: **"Play Sound"**
2. Choose: **"Chime"** or any sound you prefer
3. This plays a sound when the task is confirmed

### Set Up Multiple Shortcuts
You can create different Shortcuts for different categories:
- One for **"Quick Task"** (default, personal)
- One for **"Quick Expense"** (finance category)
- One for **"Quick Health Note"** (health category)

Then set different Shortcuts to different triggers (you can't have multiple back-taps, but you can use voice command "Hey Siri, Quick Task").

---

## What Happens Behind the Scenes

When you speak and tap, here's the exact flow:

1. **Your phone:** Siri captures your voice and transcribes to text
2. **Shortcut:** Extracts the text (e.g., "Buy milk")
3. **POST request:** Sends this JSON to your API:
   ```json
   {
     "title": "Buy milk",
     "category": "personal",
     "priority": "medium",
     "due_date": "",
     "description": "Created via voice shortcut"
   }
   ```
4. **Your Vercel API:** Receives the request at `/api/add-task`
5. **API route:** Sends it to your Google Apps Script
6. **Apps Script:** Adds a new row to your Google Sheets
7. **Your database:** New task is saved
8. **Confirmation:** Shortcut shows you a notification
9. **Your app:** Next time you open it, the task is there

---

## Testing Checklist

- [ ] Shortcut is created and named
- [ ] Back-Tap is configured to trigger the Shortcut
- [ ] Siri can hear you (test by speaking clearly)
- [ ] API endpoint is correct in the Shortcut
- [ ] JSON format in request body is valid
- [ ] First test: App open, double-tap, speak, see confirmation
- [ ] Second test: App closed, double-tap, task appears later
- [ ] Third test: Different app open, double-tap works
- [ ] Task appears in app with correct info
- [ ] Multiple tasks work (try 3-4 times)

---

## Next Steps

1. **Set up this Shortcut** (follow steps above)
2. **Test it thoroughly** (use the checklist)
3. **Use it daily** (becomes muscle memory quickly)
4. **Later:** Session 1.6 will add the additional views (Subscriptions, Emails, History)

---

## Questions?

If anything isn't working:
- Check the browser console in your app (F12) for error messages
- Verify the Shortcut notification shows success or failure
- Make sure your phone has internet connection
- Try re-creating the Shortcut if something gets stuck

This should give you the frictionless 5-second voice capture you're looking for! 🎤

