# Phase 1 Implementation Plan: Email Analysis System (MVP)

**Goal:** Implement automated daily email ingestion, Claude-powered analysis, and task auto-creation.

---

## 1. System Architecture Overview

```
Gmail Inbox
    ↓
Apps Script (Daily trigger + Manual button)
    ↓
Gmail API (fetch new emails)
    ↓
Claude Haiku (analyze + extract data)
    ↓
Google Sheet (store flagged emails + update tasks)
    ↓
Frontend App (display daily summary + "Check Emails" button)
```

**Data Flow:**
1. Apps Script runs on schedule (daily) OR when user clicks "Check Emails" button
2. Fetches unread/new emails from Gmail using Gmail API
3. Sends emails to Claude Haiku for analysis
4. Claude extracts: summary, reason_flagged, action_items, sender_importance, topic
5. Stores results in FlaggedEmails sheet
6. Auto-creates tasks in Tasks sheet for action-needed emails
7. Frontend fetches latest flagged emails to display daily summary

---

## 2. Gmail API Setup (Step-by-Step)

### 2.1 Enable Gmail API in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your existing project** (or create new one)
3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click → "Enable"
   - Search for "Google Sheets API"
   - Click → "Enable"

### 2.2 Create Service Account (for Apps Script)

**Why?** Apps Script needs permission to access Gmail on your behalf.

1. Go to "APIs & Services" → "Credentials"
2. Click **"+ Create Credentials"** → **"Service Account"**
3. Fill in details:
   - Service account name: `life-admin-email-analyzer`
   - Click "Create and Continue"
4. **Grant roles:** Select "Editor" (allows Gmail + Sheets access)
5. Click "Continue" → "Done"

### 2.3 Generate API Key for Apps Script

1. Go back to "Credentials" page
2. Click on the **service account** you just created
3. Go to **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Choose **JSON**
6. Download the JSON file (keep this safe!)
7. **Copy the credentials** — you'll need these in Apps Script

### 2.4 Enable Domain-Wide Delegation (Optional but Recommended)

1. In the service account, go to **"Details"** tab
2. Find **"Domain-wide delegation"**
3. Click **"Enable"**
4. This allows the script to act on your behalf

---

## 3. Apps Script Modifications

### 3.1 Add Gmail Email Ingestion Function

Add this function to your existing Apps Script:

```javascript
// ============ EMAIL INGESTION ============

const GMAIL_API_KEY = "YOUR_API_KEY_HERE"; // Get from Google Cloud Console
const GMAIL_USER_ID = "me"; // Current user

function getNewEmails() {
  try {
    // Query: only unread emails from the last 24 hours
    const query = "is:unread newer_than:1d";
    
    const url = `https://www.googleapis.com/gmail/v1/users/${GMAIL_USER_ID}/messages?q=${encodeURIComponent(query)}&access_token=${ScriptApp.getOAuthToken()}`;
    
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (!data.messages) {
      return { success: true, emails: [], message: "No new emails" };
    }
    
    const emails = [];
    
    // Fetch details for each email
    for (let messageId of data.messages) {
      const emailUrl = `https://www.googleapis.com/gmail/v1/users/${GMAIL_USER_ID}/messages/${messageId.id}?format=full&access_token=${ScriptApp.getOAuthToken()}`;
      const emailResponse = UrlFetchApp.fetch(emailUrl);
      const emailData = JSON.parse(emailResponse.getContentText());
      
      const headers = emailData.payload.headers;
      const from = headers.find(h => h.name === "From")?.value || "Unknown";
      const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";
      const receivedAt = new Date(parseInt(emailData.internalDate));
      
      // Extract email body
      let body = "";
      if (emailData.payload.parts) {
        const textPart = emailData.payload.parts.find(p => p.mimeType === "text/plain");
        if (textPart && textPart.body.data) {
          body = decodeBase64(textPart.body.data);
        }
      } else if (emailData.payload.body.data) {
        body = decodeBase64(emailData.payload.body.data);
      }
      
      emails.push({
        gmail_message_id: messageId.id,
        from: from,
        subject: subject,
        received_at: receivedAt.toISOString(),
        body: body.substring(0, 2000) // Limit to 2000 chars to save token usage
      });
    }
    
    return { success: true, emails: emails, count: emails.length };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function decodeBase64(str) {
  return Utilities.newBlob(Utilities.base64Decode(str)).getDataAsString();
}
```

### 3.2 Add Claude Analysis Function

```javascript
// ============ CLAUDE ANALYSIS ============

const CLAUDE_API_KEY = "YOUR_CLAUDE_API_KEY"; // Get from Anthropic console
const CLAUDE_MODEL = "claude-3-5-haiku-20241022"; // Fast + cheap

function analyzeEmailWithClaude(email) {
  const prompt = `You are an email analyzer. Analyze this email and extract the following information in JSON format:

Email from: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "should_flag": true/false,
  "summary": "1-2 sentence summary of email content",
  "reason_flagged": "Why this email is flagged (or null if not flagged)",
  "action_items": ["Action 1", "Action 2"] or [],
  "sender_importance": "high/medium/low",
  "topic": "category (e.g., Financial, Health, Subscriptions, Work, Personal)",
  "is_spam": true/false,
  "is_subscription": true/false
}

Be concise to minimize token usage. If should_flag is false, set reason_flagged to null.`;

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  try {
    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    
    if (result.content && result.content[0]) {
      return JSON.parse(result.content[0].text);
    }
    
    return { should_flag: false, error: "Claude analysis failed" };
  } catch (error) {
    return { should_flag: false, error: error.toString() };
  }
}
```

### 3.3 Add Email Processing & Storage Function

```javascript
// ============ PROCESS & STORE EMAILS ============

function processAndStoreFlaggedEmails() {
  try {
    // Step 1: Get new emails from Gmail
    const emailsResult = getNewEmails();
    if (!emailsResult.success || emailsResult.emails.length === 0) {
      return { success: true, message: "No new emails to process", processed: 0 };
    }

    const ss = getSpreadsheet();
    const flaggedSheet = ss.getSheetByName("FlaggedEmails");
    const processedEmails = [];

    // Step 2: Analyze each email with Claude
    for (let email of emailsResult.emails) {
      const analysis = analyzeEmailWithClaude(email);

      // Skip spam
      if (analysis.is_spam) continue;

      // Skip if not flagged
      if (!analysis.should_flag) continue;

      // Step 3: Add to FlaggedEmails sheet
      const newRow = [
        "email_id_" + Date.now() + Math.random(), // Unique ID
        email.from,
        email.subject,
        email.received_at,
        analysis.summary,
        analysis.reason_flagged,
        analysis.action_items ? analysis.action_items.join("; ") : "",
        analysis.sender_importance,
        analysis.topic,
        email.gmail_message_id,
        "unread"
      ];

      flaggedSheet.appendRow(newRow);

      // Step 4: Auto-create task if action_items exist
      if (analysis.action_items && analysis.action_items.length > 0) {
        createTaskFromEmail(email, analysis);
      }

      processedEmails.push({
        subject: email.subject,
        actions: analysis.action_items
      });
    }

    return {
      success: true,
      message: `Processed ${processedEmails.length} emails`,
      processed: processedEmails.length,
      emails: processedEmails
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createTaskFromEmail(email, analysis) {
  // Auto-create task in Tasks sheet
  const ss = getSpreadsheet();
  const tasksSheet = ss.getSheetByName("Tasks");
  
  const taskId = "T-" + String(tasksSheet.getLastRow()).padStart(5, "0");
  const actionItems = analysis.action_items.join("; ");

  const newTask = [
    taskId,
    `[EMAIL] ${email.subject}`, // Task title includes email subject
    actionItems, // Description includes action items
    "email",
    analysis.topic,
    "high", // High priority for action-needed emails
    "",
    "pending",
    "",
    new Date(),
    ""
  ];

  tasksSheet.appendRow(newTask);
}
```

### 3.4 Add Daily Trigger

1. In Apps Script editor, click **"Triggers"** (alarm icon on left)
2. Click **"+ Create trigger"**
3. Set up:
   - Function: `processAndStoreFlaggedEmails`
   - Deployment: Head
   - Event source: Time-driven
   - Type: Day timer
   - Time of day: 8:00 AM (adjust as needed)
4. Save

### 3.5 Add Manual Trigger (Optional - for Vercel API route)

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case "complete_task":
        return jsonResponse(completeTask(data.task_id));
      case "add_task":
        return jsonResponse(addTask(data));
      case "check_emails":  // NEW: Manual email check
        return jsonResponse(processAndStoreFlaggedEmails());
      default:
        return jsonResponse({ error: "Unknown action" });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}
```

---

## 4. Update Google Sheet Schema

Add these columns to **FlaggedEmails** sheet (if not already present):

| Column | Type | Notes |
|--------|------|-------|
| email_id | Text | Unique identifier |
| from | Text | Sender email |
| subject | Text | Email subject |
| received_at | DateTime | When email was received |
| summary | Text | Claude-generated summary |
| reason_flagged | Text | Why it was flagged |
| **action_items** | Text | Extracted action items (NEW) |
| **sender_importance** | Text | high/medium/low (NEW) |
| **topic** | Text | Category/topic (NEW) |
| gmail_message_id | Text | Gmail message ID (for deduplication) |
| status | Text | unread/read/archived |

---

## 5. Frontend Additions

### 5.1 Create Email Summary Component

Create `src/EmailSummary.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle, RefreshCw } from 'lucide-react';

const EmailSummary = ({ data, onRefresh, isRefreshing, lastUpdated }) => {
  const [isCheckingEmails, setIsCheckingEmails] = useState(false);

  const handleCheckEmails = async () => {
    setIsCheckingEmails(true);
    try {
      const response = await fetch('/api/check-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_emails' })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Processed ${result.processed} new emails`);
        await onRefresh();
      }
    } catch (error) {
      alert('Error checking emails: ' + error.message);
    } finally {
      setIsCheckingEmails(false);
    }
  };

  if (!data.flaggedEmails || data.flaggedEmails.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
        <Mail className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No flagged emails today</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleCheckEmails}
          disabled={isCheckingEmails}
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          {isCheckingEmails ? 'Checking...' : 'Check Emails Now'}
        </button>
      </div>

      <div className="space-y-3">
        {data.flaggedEmails.map((email) => (
          <div key={email.email_id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300">
            <h3 className="font-semibold text-gray-900">{email.subject}</h3>
            <p className="text-sm text-gray-600 mt-1">From: {email.from}</p>
            <p className="text-sm text-gray-700 mt-2">{email.summary}</p>
            
            {email.action_items && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700">Actions:</p>
                <p className="text-xs text-gray-600">{email.action_items}</p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                {email.topic}
              </span>
              <span className={`inline-block text-xs px-2 py-1 rounded ${
                email.sender_importance === 'high' ? 'bg-red-100 text-red-700' :
                email.sender_importance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {email.sender_importance.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailSummary;
```

### 5.2 Update App.jsx to Include Email Summary

Add to the main content area in App.jsx (or add a new "Emails" tab):

```javascript
{activeTab === 'emails' && (
  <EmailSummary
    data={data}
    onRefresh={handleRefresh}
    isRefreshing={isRefreshing}
    lastUpdated={lastUpdated}
  />
)}
```

### 5.3 Add "Check Emails" Button to Header

Update the header in App.jsx to include manual trigger button.

---

## 6. Create Vercel API Route for Manual Email Check

Create `api/check-emails.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/usercontent';

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_emails' })
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

## 7. Implementation Sequence

**Week 1:**
1. [ ] Set up Gmail API in Google Cloud
2. [ ] Get API credentials
3. [ ] Add email ingestion function to Apps Script
4. [ ] Get Claude API key and add analysis function

**Week 2:**
5. [ ] Add email processing + storage functions
6. [ ] Update FlaggedEmails sheet schema
7. [ ] Test with a few emails manually
8. [ ] Set up daily trigger

**Week 3:**
9. [ ] Create EmailSummary frontend component
10. [ ] Add to app routing/tabs
11. [ ] Create API route for manual trigger
12. [ ] Test end-to-end

---

## 8. Testing Checklist

- [ ] Gmail API can fetch emails
- [ ] Claude analysis works and produces valid JSON
- [ ] Emails are stored in FlaggedEmails sheet
- [ ] Tasks are auto-created for action-items
- [ ] Daily trigger runs automatically
- [ ] Manual "Check Emails" button works
- [ ] Frontend displays flagged emails correctly
- [ ] Email summary is accurate

---

## 9. Important Notes

**Token Optimization:**
- Using Claude Haiku (not Sonnet) to minimize costs
- Limiting email body to 2000 chars
- Using concise prompts
- Batching emails in one API call when possible

**Email Deduplication:**
- Currently skipping by checking gmail_message_id
- Phase 2 will add smarter deduplication

**Security:**
- Keep Claude API key safe (use environment variables)
- Gmail API credentials should never be committed
- Use OAuth token from ScriptApp

---

## Questions Before We Start?

1. Should I add any additional columns to FlaggedEmails?
2. Do you want emails tab in bottom nav, or integrated into Tasks?
3. Any specific topics/categories you want to prioritize?

