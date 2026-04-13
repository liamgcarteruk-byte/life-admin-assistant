# iOS Shortcut Setup - Updated Instructions (Visual Guide)

Based on your actual Shortcuts app interface, here's the exact step-by-step guide.

---

## Step 1: Create a New Shortcut

1. In the Shortcuts app, tap the **"+"** button (top right)
2. A blank shortcut editor will open

---

## Step 2: Add "Dictate Text" Action

1. Tap the **"+"** button in the editor (it adds a new action)
2. Search for **"Dictate Text"** (you can see it in your screenshot as a featured action)
3. Tap on "Dictate Text" to add it
4. This is now your first action — when the shortcut runs, Siri will listen to you

---

## Step 3: Add "Get Contents of URL" Action (The API Call)

1. Tap **"+"** again to add another action
2. Search for **"Get Contents of URL"**
3. Tap to add it
4. Now you need to configure it:

### Configuration for "Get Contents of URL":

**A) Set the URL:**
- In the "URL" field, paste: `https://life-admin-assistant.vercel.app/api/add-task`

**B) Set the Method to POST:**
- Tap on the method dropdown (default is "GET")
- Change to **"POST"**

**C) Add Headers:**
- Look for **"Headers"** or **"Show More"** option
- Add a new header:
  - Name: `Content-Type`
  - Value: `application/json`

**D) Add the Request Body (JSON):**
- Look for **"Request Body"** or **"Body"** field
- Change the type to **"JSON"**
- In the text field, you need to paste the JSON

---

## Step 4: Paste the JSON Body (Copy This Exactly)

Here's the JSON you need to paste. **Copy this entire block:**

```json
{
  "title": "Dictated Text",
  "category": "personal",
  "priority": "medium",
  "due_date": "",
  "description": "Created via voice shortcut"
}
```

**BUT WAIT** — You need to use the variable from Step 2 (the dictated text). So it should actually be:

Instead of typing `"Dictated Text"`, you need to:
1. Tap on the text field for "title"
2. Start typing: `"title": "`
3. Then tap the **"▸"** variable icon (looks like a blue arrow or magic wand)
4. Select **"Dictated Text"** from the list
5. This will insert the actual text the user spoke

---

## Step 5: Add Confirmation Notification

1. Tap **"+"** to add another action
2. Search for **"Show Result"**
3. Tap to add it
4. In the text field, type: `✅ Task saved!`

---

## Step 6: Name Your Shortcut

1. At the top of the editor, tap **"Shortcut"** or the title field
2. Name it: **"Quick Task"** (or whatever you prefer)
3. Tap "Done"

---

## Step 7: Set Up Back-Tap Trigger

1. Close the Shortcut editor
2. Open **Settings** app
3. Go to **Accessibility** → **Touch** → **Back Tap**
4. Tap **"Double Tap"**
5. Scroll down and tap **"Shortcuts"**
6. Select **"Quick Task"** (or whatever you named it)

**Done!**

---

## Testing

1. **First test:** 
   - Double-tap back of phone
   - Siri should appear
   - Speak: "Test task"
   - You should see "✅ Task saved!" notification
   - Open your Life Admin app — the task should be there

2. **Second test:**
   - Close the app completely
   - Double-tap back of phone
   - Speak: "Buy groceries"
   - Confirm notification appears
   - Open app later — task is there

---

## Troubleshooting the JSON Part

If you get stuck on the JSON step, here's an easier approach:

**Instead of the complex JSON**, use this simpler version that doesn't need variables:

```
{
  "title": "Voice task",
  "category": "personal",
  "priority": "medium",
  "due_date": "",
  "description": "Created via voice"
}
```

The downside: All voice tasks will be titled "Voice task" instead of showing what you said.

**Better approach (recommended):**

Look for a **"Custom Dictionary"** or **"Dictionary"** action in Shortcuts. You can use that to build the JSON more visually without typing it all out.

---

## If You Still Get Stuck

When you do, please:
1. Take a screenshot of the error or where you're stuck
2. Tell me exactly which step you're on
3. Describe what you're seeing
4. I can provide more specific help

---

## Alternative: Simpler Version Without JSON Coding

If the JSON is too complex, I can create a **different approach**:
- A simple webpage form you can bookmark
- You tap the bookmark and use the web app's built-in voice input
- We can trigger it via back-tap too

Let me know if you want me to set that up instead!

