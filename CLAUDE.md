# Life Admin Assistant - Project Instructions for Claude

## About Me (The User)
- I'm a **very beginner coder** — please provide background and explanations for what's being done
- I use a **Windows laptop**
- I appreciate **step-by-step guidance** with visual references when possible
- I learn best when code is explained in simple terms

---

## Project Context

### What This Is
A personal life administration assistant that runs as:
1. **Web app** — Dashboard at https://life-admin-assistant.vercel.app
2. **iOS shortcut** — Frictionless voice capture via back-tap
3. **Backend** — Google Sheets database + Google Apps Script API + Vercel serverless functions

### Current Status
- ✅ **Session 1.5 Complete:** Voice input (web app) + iOS Shortcut with back-tap working
- ⏳ **Session 1.6 Next:** Build additional views (Subscriptions, Emails, History) with navigation

### Project Folder
**IMPORTANT:** Work folder is `C:\Users\liamc\life-admin-assistant`
- This is where all source code lives
- GitHub is connected to this folder
- Vercel auto-deploys from this folder
- When making edits, use this exact path

---

## Session Startup Instructions

**At the beginning of each new session, I should:**

1. **REQUEST ACCESS TO PROJECT FOLDER FIRST**
   ```
   C:\Users\liamc\life-admin-assistant
   ```
   This must be done before reading any project files or making changes.

2. **READ PROJECT_STATE.md** (the source of truth):
   - Location: `C:\Users\liamc\life-admin-assistant\PROJECT_STATE.md`
   - Contains: All technical details, credentials, architecture, current status
   - Always read this FIRST before doing any work

3. **READ PROJECT MEMORY** for session-specific context:
   - Location: Auto-loaded persistent memory
   - Contains: Session progress, debugging notes, what works/what failed

4. **Apply file management rules (Phase 2.4+):**
   - **For .jsx files:** Create versioned copy (e.g., Dashboard_Phase2.4.jsx) AND auto-update main file (Dashboard.jsx)
   - **For Apps Script:** Provide complete merged file for manual paste (cannot edit Google Apps Script directly)
   - **For all changes:** Commit to GitHub immediately after

5. **Apply communication preferences:**
   - User is beginner coder → explain everything
   - Provide step-by-step guidance
   - Use visual references when helpful
   - Simplify complex concepts

6. **Skip these questions:**
   - "Where is your project folder?" (It's `C:\Users\liamc\life-admin-assistant`)
   - "What have you built so far?" (Check PROJECT_STATE.md)
   - "Which framework are you using?" (React + Tailwind + Vercel + Google Stack)
   - "How is your app deployed?" (Vercel auto-deploys from GitHub)

---

## Key Project Details

### Tech Stack
- **Frontend:** React (Vite), Tailwind CSS
- **Hosting:** Vercel (auto-deploys from GitHub)
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Authentication:** Google OAuth
- **API Routes:** Vercel serverless functions (`/api/add-task`, `/api/complete-task`)

### Important URLs
- **Deployed App:** https://life-admin-assistant.vercel.app
- **GitHub Repo:** Connected to `C:\Users\liamc\life-admin-assistant`
- **Google Sheet:** ID `1WcTx3MTwY-tp3EL1ENBy0lXMQvs6UB-E`
- **Apps Script API:** `https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec`

### Current Features Working
- ✅ Dashboard with task list (real-time)
- ✅ Google OAuth login (secure)
- ✅ Add/edit/complete tasks
- ✅ Voice input via in-app microphone button
- ✅ iOS Shortcut with back-tap (frictionless capture)
- ✅ Automatic sync with Google Sheets

### Features Not Yet Built
- ⏳ Subscriptions view (Session 1.6)
- ⏳ Flagged emails view (Session 1.6)
- ⏳ Task history view (Session 1.6)
- ⏳ Bottom navigation tabs (Session 1.6)
- ⏳ Email scanning automation (Phase 2)

---

## Working Session Template

When starting a new session, use this approach:

```
[Start of new session message]

"I'm continuing work on the Life Admin Assistant project. Before we dive in:

1. Please read my project memory to understand what's been completed
2. Current focus: [State what you want to work on today]
3. Any blockers or questions I should know about: [List any]

Then let's get started!"
```

This ensures I:
- Have full context from previous sessions
- Know exactly what you want to build
- Can provide appropriate level of detail
- Don't waste time on clarifying questions

---

## Communication Preferences

- **Explanations:** Detailed background for beginner coder
- **Code:** Step-by-step with comments explaining what each part does
- **Guidance:** Visual references (screenshots) when helping with UI/configuration
- **Updates:** Clear summaries of what was done and what's next
- **Questions:** Ask clarifying questions if the goal is ambiguous

---

## Success Metrics

A good session:
- ✅ Reads project memory at the start
- ✅ Explains code/concepts in beginner-friendly way
- ✅ Provides step-by-step guidance
- ✅ Creates/updates documentation for future sessions
- ✅ Updates project memory at the end
- ✅ Leaves clear notes on what's next
- ✅ Tests features before considering them "done"

---

## Important Notes

- **Beginner-friendly:** This is the top priority. Code clarity > elegance.
- **Documentation:** Every session should update the project memory file.
- **Testing:** Always test on both desktop and mobile when relevant.
- **Screenshots:** Take them when troubleshooting, especially for iPhone setup.
- **Deployment:** Vercel auto-deploys, but remember to push to GitHub first.

