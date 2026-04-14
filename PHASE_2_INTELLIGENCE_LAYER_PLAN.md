# Phase 2: Intelligence Layer - Complete Implementation Plan

**Aligns with:** Build Plan Sessions 2.1 - 2.4 + Extended Features (Learning System, Ignored Emails Log, Subscription Approval)

**Timeline:** 4-6 sessions (~2-3 weeks)

**Cost Impact:** £0.15-0.40/day for email processing (Haiku model)

---

## Overview: How Phase 2 Fits Into Your System

**Phase 1 Status:** ✅ Complete
- Working app (React + Vercel)
- Manual data entry works
- OAuth authentication secure
- Subscriptions & Tasks views built

**Phase 2 Goal:** Intelligence Layer
- Automated daily email scanning
- Claude Haiku analyzes emails
- Auto-creates tasks, flags important messages
- Detects subscriptions
- Learns from your corrections
- Respects Rules you set
- Tracks costs to stay within budget

**Phase 3 (Future):** Advanced Features
- Proactive research on renewals
- Calendar integration
- Property/household tracking

---

## Data Flow (How Everything Connects)

```
Daily at 7am (or when you click "Check Emails"):

1. Apps Script reads Gmail (since last run)
2. Extracts: from, subject, date, body (truncated)
3. Batches into groups of 10 emails
4. Sends to Claude Haiku with Rules context
5. Claude returns: tasks, subscriptions, flags, spam score
6. Apps Script writes results to Sheets
7. Logs token usage + cost
8. Frontend fetches new data
9. You see: new tasks, flagged emails, subscription alerts
```

---

## Session 2.1: Email Scanner Foundation (60-90 min)

**What You'll Build:**
- Gmail API integration in Apps Script
- Email extraction function
- Claude Haiku analysis with structured JSON response
- Results written to FlaggedEmails, Tasks, Subscriptions sheets
- Basic deduplication using gmail_message_id

### 2.1a: Gmail API Setup

Follow these steps (detailed instructions at end of this document):

1. Enable Gmail API in Google Cloud Console
2. Get OAuth credentials (Apps Script uses your account)
3. Test: manually fetch 5 recent emails

**Result:** `getNewEmails()` function returns array of email objects

### 2.1b: Email Extraction Function

Create function `extractEmailsSinceLastRun()`:

```javascript
function extractEmailsSinceLastRun() {
  const ss = getSpreadsheet();
  const configSheet = ss.getSheetByName("Config");
  
  // Get last timestamp
  const configData = configSheet.getDataRange().getValues();
  const lastTimestampRow = configData.find(row => row[0] === "LAST_EMAIL_TIMESTAMP");
  const lastTimestamp = lastTimestampRow ? new Date(lastTimestampRow[1]) : new Date(Date.now() - 24*60*60*1000);
  
  // Gmail query: since last run, not already processed
  const query = `after:${Math.floor(lastTimestamp.getTime()/1000)}`;
  
  const emails = [];
  const gmailService = Gmail.Users.Messages.list('me', { q: query });
  
  if (!gmailService.messages || gmailService.messages.length === 0) {
    return { success: true, emails: [], message: "No new emails" };
  }
  
  for (let messageId of gmailService.messages) {
    const message = Gmail.Users.Messages.get('me', messageId.id, { format: 'full' });
    
    const headers = message.payload.headers;
    const from = headers.find(h => h.name === "From")?.value || "Unknown";
    const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";
    const receivedAt = new Date(parseInt(message.internalDate));
    
    // Extract body (text only, max 2000 chars for token efficiency)
    let body = extractEmailBody(message.payload);
    body = body.substring(0, 2000);
    
    emails.push({
      gmail_message_id: messageId.id,
      from: from,
      subject: subject,
      received_at: receivedAt.toISOString(),
      body: body
    });
  }
  
  return { success: true, emails: emails, count: emails.length };
}

function extractEmailBody(payload) {
  if (payload.parts) {
    const textPart = payload.parts.find(p => p.mimeType === "text/plain");
    if (textPart && textPart.body.data) {
      return Utilities.newBlob(
        Utilities.base64Decode(textPart.body.data)
      ).getDataAsString();
    }
  } else if (payload.body && payload.body.data) {
    return Utilities.newBlob(
      Utilities.base64Decode(payload.body.data)
    ).getDataAsString();
  }
  return "";
}
```

**Result:** Function returns emails from last 24 hours

### 2.1c: Email Batching Function

Create function `batchEmails(emails, batchSize = 10)`:

```javascript
function batchEmails(emails, batchSize = 10) {
  const batches = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }
  return batches;
}
```

**Why batching?** Sends 10 emails to Claude at once, more efficient than one-by-one.

### 2.1d: Claude Haiku Analysis Function

```javascript
const CLAUDE_API_KEY = "sk-ant-..."; // From Anthropic console
const CLAUDE_MODEL = "claude-3-5-haiku-20241022";

function analyzeEmailBatchWithClaude(emailBatch, rules) {
  // Build context from Rules sheet
  const rulesContext = rules.map(r => `- ${r.pattern}: ${r.action}`).join("\n");
  
  const emailsForAnalysis = emailBatch.map(e => 
    `From: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}`
  ).join("\n---\n");
  
  const prompt = `You are an email classifier for a personal admin assistant.

RULES (user preferences):
${rulesContext}

Analyze these emails and for EACH ONE, respond with ONLY valid JSON in this format:
{
  "email_id": "email_0",
  "should_flag": true/false,
  "is_spam": true/false,
  "summary": "one sentence summary",
  "reason_flagged": "Financial impact" or null,
  "action_items": ["item1", "item2"] or [],
  "sender_importance": "high/medium/low",
  "topic": "Financial/Health/Subscriptions/Work/Personal",
  "is_subscription": true/false,
  "confidence": 0.95
}

EMAILS TO ANALYZE:
${emailsForAnalysis}

Respond with a JSON array. Do not include markdown. Be concise to minimize tokens.`;

  try {
    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      payload: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    
    const result = JSON.parse(response.getContentText());
    const analysisText = result.content[0].text;
    
    // Extract token usage
    const inputTokens = result.usage.input_tokens;
    const outputTokens = result.usage.output_tokens;
    
    // Parse JSON response
    const analyses = JSON.parse(analysisText);
    
    return {
      success: true,
      analyses: analyses,
      tokens: { input: inputTokens, output: outputTokens }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
```

**Result:** Structured analysis of each email in the batch

### 2.1e: Process & Store Results

```javascript
function processEmailBatch(emailBatch, analyses) {
  const ss = getSpreadsheet();
  const flaggedSheet = ss.getSheetByName("FlaggedEmails");
  const tasksSheet = ss.getSheetByName("Tasks");
  const subsSheet = ss.getSheetByName("Subscriptions");
  const ignoredSheet = ss.getSheetByName("IgnoredEmails"); // NEW
  
  for (let i = 0; i < emailBatch.length; i++) {
    const email = emailBatch[i];
    const analysis = analyses[i];
    
    // Skip spam
    if (analysis.is_spam) {
      logIgnoredEmail(ignoredSheet, email, "Spam detected", analysis.confidence);
      continue;
    }
    
    // Skip if marked as not flagged by Claude
    if (!analysis.should_flag) {
      logIgnoredEmail(ignoredSheet, email, "Not relevant", 0.5);
      continue;
    }
    
    // Check if email already processed (deduplication)
    const existingRow = flaggedSheet.getRange(1, 10, flaggedSheet.getLastRow())
      .getValues()
      .findIndex(row => row[0] === email.gmail_message_id);
    
    if (existingRow >= 0) {
      Logger.log(`Email already flagged: ${email.subject}`);
      continue;
    }
    
    // Add to FlaggedEmails
    const emailId = "email_" + Date.now() + "_" + Math.random();
    const flaggedRow = [
      emailId,
      email.from,
      email.subject,
      email.received_at,
      analysis.summary,
      analysis.reason_flagged,
      analysis.action_items.join("; "),
      analysis.sender_importance,
      analysis.topic,
      email.gmail_message_id,
      "unread"
    ];
    flaggedSheet.appendRow(flaggedRow);
    
    // Auto-create task if action items exist
    if (analysis.action_items && analysis.action_items.length > 0) {
      const taskId = "T-" + String(tasksSheet.getLastRow()).padStart(5, "0");
      const taskRow = [
        taskId,
        `[EMAIL] ${email.subject}`,
        analysis.action_items.join("; "),
        "email",
        analysis.topic,
        "high",
        "",
        "pending",
        emailId, // Link to flagged email
        new Date(),
        ""
      ];
      tasksSheet.appendRow(taskRow);
    }
    
    // Handle subscriptions (Phase 2.3)
    if (analysis.is_subscription) {
      handleSubscriptionEmail(subsSheet, email, analysis);
    }
  }
}

function logIgnoredEmail(ignoredSheet, email, reason, confidence) {
  const row = [
    "email_" + Date.now(),
    email.from,
    email.subject,
    email.received_at,
    reason,
    Math.round(confidence * 100) + "%",
    "pending_review",
    new Date()
  ];
  ignoredSheet.appendRow(row);
}
```

**Result:** Emails stored, tasks created, subscriptions detected

### 2.1f: Log Processing

```javascript
function logProcessingRun(emailsProcessed, tokensUsed) {
  const ss = getSpreadsheet();
  const logSheet = ss.getSheetByName("ProcessingLog");
  
  // Calculate cost (Haiku pricing)
  const costPerMInput = 0.80 / 1000000;  // £0.80 per million
  const costPerMOutput = 2.40 / 1000000; // £2.40 per million
  const costGBP = (tokensUsed.input * costPerMInput) + (tokensUsed.output * costPerMOutput);
  
  const row = [
    new Date(),
    emailsProcessed,
    tokensUsed.input,
    tokensUsed.output,
    costGBP.toFixed(4),
    "success"
  ];
  logSheet.appendRow(row);
}
```

**Result:** Cost tracking for budget monitoring

---

## Session 2.2: Scheduled Automation & Cost Controls (45-60 min)

**What You'll Build:**
- Daily time-based trigger (7am)
- Manual "Check Emails" button in app
- Cost checks before running
- Error handling
- Config sheet updates

### 2.2a: Main Orchestration Function

```javascript
function dailyEmailScan() {
  try {
    const ss = getSpreadsheet();
    const configSheet = ss.getSheetByName("Config");
    
    // CHECK 1: Is automation enabled?
    const automationEnabled = getConfigValue(configSheet, "AUTOMATION_ENABLED");
    if (!automationEnabled) {
      Logger.log("Automation disabled in Config sheet");
      return { success: false, message: "Automation disabled" };
    }
    
    // CHECK 2: Is weekly cost under threshold?
    const weeklyCost = calculateWeeklyCost(ss);
    const costThreshold = getConfigValue(configSheet, "WEEKLY_COST_THRESHOLD");
    
    if (weeklyCost > costThreshold) {
      sendAlertEmail(`Weekly cost limit exceeded: £${weeklyCost.toFixed(2)} > £${costThreshold}`);
      return { success: false, message: "Cost threshold exceeded" };
    }
    
    // STEP 1: Get new emails
    const emailsResult = extractEmailsSinceLastRun();
    if (!emailsResult.success || emailsResult.emails.length === 0) {
      return { success: true, message: "No new emails", processed: 0 };
    }
    
    // STEP 2: Get active rules
    const rulesSheet = ss.getSheetByName("Rules");
    const rules = parseRulesSheet(rulesSheet);
    
    // STEP 3: Batch emails
    const batches = batchEmails(emailsResult.emails, 10);
    
    let totalTokens = { input: 0, output: 0 };
    let processedCount = 0;
    
    // STEP 4: Process each batch
    for (let batch of batches) {
      // Check token budget before processing batch
      if (totalTokens.input + 5000 > getConfigValue(configSheet, "DAILY_TOKEN_BUDGET")) {
        Logger.log("Daily token budget reached, queuing remaining emails");
        break;
      }
      
      const analysisResult = analyzeEmailBatchWithClaude(batch, rules);
      
      if (!analysisResult.success) {
        Logger.log(`Batch analysis failed: ${analysisResult.error}`);
        continue;
      }
      
      processEmailBatch(batch, analysisResult.analyses);
      totalTokens.input += analysisResult.tokens.input;
      totalTokens.output += analysisResult.tokens.output;
      processedCount += batch.length;
      
      // Rate limiting: wait 2 seconds between batches
      Utilities.sleep(2000);
    }
    
    // STEP 5: Update config
    updateConfigValue(configSheet, "LAST_EMAIL_TIMESTAMP", new Date());
    
    // STEP 6: Log run
    logProcessingRun(processedCount, totalTokens);
    
    return {
      success: true,
      processed: processedCount,
      tokens: totalTokens,
      cost: calculateTokenCost(totalTokens)
    };
    
  } catch (error) {
    Logger.log(`ERROR in dailyEmailScan: ${error}`);
    sendAlertEmail(`Email scan failed: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function getConfigValue(sheet, key) {
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === key);
  return row ? row[1] : null;
}

function updateConfigValue(sheet, key, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
}

function calculateWeeklyCost(ss) {
  const logSheet = ss.getSheetByName("ProcessingLog");
  const data = logSheet.getDataRange().getValues();
  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
  
  return data
    .filter(row => new Date(row[0]) > sevenDaysAgo)
    .reduce((sum, row) => sum + (row[4] || 0), 0);
}

function calculateTokenCost(tokens) {
  const costPerMInput = 0.80 / 1000000;
  const costPerMOutput = 2.40 / 1000000;
  return (tokens.input * costPerMInput) + (tokens.output * costPerMOutput);
}

function sendAlertEmail(message) {
  // Send yourself an alert (uses Gmail API)
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    "Email Scan Alert",
    message
  );
}
```

### 2.2b: Create Time-Based Trigger

In Apps Script editor:
1. Click **Triggers** (clock icon)
2. **+ Create trigger**
3. Set:
   - Function: `dailyEmailScan`
   - Deployment: Head
   - Event source: Time-driven
   - Type: Day timer
   - Time: 7:00 AM
4. Save

### 2.2c: Create Manual Trigger (API Route)

Create `api/check-emails.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_DEPLOYMENT_URL;

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

Update `doPost()` in Apps Script:

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
      case "check_emails":
        return jsonResponse(dailyEmailScan());
      default:
        return jsonResponse({ error: "Unknown action" });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}
```

---

## Session 2.3: Subscription Intelligence (60-90 min)

**What You'll Build:**
- Subscription detection from emails
- Smart updates to existing subscriptions
- New subscription tracking with confidence levels
- Renewal alerts
- Pending Subscriptions approval queue (NEW)

### 2.3a: Handle Subscription Emails

```javascript
function handleSubscriptionEmail(subsSheet, email, analysis) {
  // Check if subscription already exists
  const existingRow = findSubscriptionByEmail(subsSheet, email.from);
  
  if (existingRow >= 0) {
    // Update existing
    updateSubscription(subsSheet, existingRow, email, analysis);
  } else {
    // Create pending subscription (needs user approval)
    createPendingSubscription(subsSheet, email, analysis);
  }
}

function findSubscriptionByEmail(sheet, emailFrom) {
  const data = sheet.getDataRange().getValues();
  return data.findIndex(row => row[1] === emailFrom); // Column B = from
}

function updateSubscription(sheet, rowIndex, email, analysis) {
  // Update last_email_date
  sheet.getRange(rowIndex + 1, 11).setValue(new Date());
  
  // Update cost if detected
  const cost = extractCostFromEmail(email.body);
  if (cost) {
    sheet.getRange(rowIndex + 1, 5).setValue(cost);
  }
  
  // Update renewal_date if detected
  const renewalDate = extractRenewalDateFromEmail(email.body);
  if (renewalDate) {
    sheet.getRange(rowIndex + 1, 6).setValue(renewalDate);
  }
}

function createPendingSubscription(sheet, email, analysis) {
  // Create row in sheet with status "pending_approval"
  const subId = "sub_" + Date.now();
  
  // Extract data from email/analysis
  const cost = extractCostFromEmail(email.body);
  const renewalDate = extractRenewalDateFromEmail(email.body);
  
  const row = [
    subId,
    email.from,
    analysis.topic, // Use Claude's topic detection
    cost || "",
    renewalDate || "",
    "monthly",
    new Date(),
    new Date(),
    "pending_approval",
    Math.round(analysis.confidence * 100) + "%",
    email.subject
  ];
  
  sheet.appendRow(row);
  
  // Also log in IgnoredEmails as "pending_subscription_approval"
  const ignoredSheet = sheet.getParent().getSheetByName("IgnoredEmails");
  const ignoredRow = [
    "email_" + Date.now(),
    email.from,
    email.subject,
    email.received_at,
    "Subscription detected (pending approval)",
    Math.round(analysis.confidence * 100) + "%",
    "pending_subscription_approval",
    new Date()
  ];
  ignoredSheet.appendRow(ignoredRow);
}

function extractCostFromEmail(body) {
  // Simple regex for currency amounts
  const match = body.match(/[£$€](\d+(?:\.\d{2})?)/);
  return match ? match[1] : null;
}

function extractRenewalDateFromEmail(body) {
  // Simple extraction - could be improved with Claude
  const match = body.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}
```

### 2.3b: Subscription Renewal Alerts

```javascript
function checkSubscriptionRenewals() {
  const ss = getSpreadsheet();
  const subsSheet = ss.getSheetByName("Subscriptions");
  const tasksSheet = ss.getSheetByName("Tasks");
  const alertDays = 14; // Alert 2 weeks before renewal
  
  const data = subsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const renewalDate = new Date(row[5]); // Column F
    const subName = row[2];
    const subId = row[0];
    
    // Check if renewal is within alert window
    const today = new Date();
    const daysUntilRenewal = Math.floor((renewalDate - today) / (1000*60*60*24));
    
    if (daysUntilRenewal <= alertDays && daysUntilRenewal > 0) {
      // Check if alert already created (no duplicates)
      if (!isRenewalAlertCreated(tasksSheet, subId)) {
        // Create task
        const taskId = "T-" + String(tasksSheet.getLastRow()).padStart(5, "0");
        const taskRow = [
          taskId,
          `[RENEWAL] ${subName} renews in ${daysUntilRenewal} days`,
          "",
          "subscription",
          "Financial",
          "high",
          "",
          "pending",
          subId,
          new Date(),
          ""
        ];
        tasksSheet.appendRow(taskRow);
      }
    }
  }
}

function isRenewalAlertCreated(tasksSheet, subId) {
  const data = tasksSheet.getDataRange().getValues();
  return data.some(row => row[8] === subId && row[1].includes("[RENEWAL]"));
}
```

---

## Session 2.4: Learning From Corrections (45-60 min)

**What You'll Build:**
- Rules sheet management
- Rules-based email filtering
- Ignored emails log with approval workflow
- "Check Subscriptions" feature in app

### 2.4a: Rules Sheet Structure

Rules sheet columns:
- A: rule_id
- B: pattern (regex or simple match)
- C: action (ignore, flag, create_task, archive)
- D: reason (why this rule)
- E: created_date
- F: active (TRUE/FALSE)

Example rules:
- `newsletter@.*` → action: `ignore` (spam filter)
- `billing@` → action: `flag` (financial)
- `support@bank` → action: `create_task` (needs attention)

### 2.4b: Parse Rules Function

```javascript
function parseRulesSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  const rules = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] !== TRUE) continue; // Skip inactive rules
    
    rules.push({
      id: data[i][0],
      pattern: data[i][1],
      action: data[i][2],
      reason: data[i][3]
    });
  }
  
  return rules;
}
```

### 2.4c: Apply Rules in Claude Prompt

Include in Claude analysis:

```javascript
const rulesContext = rules.map(r => 
  `- If email matches "${r.pattern}": ${r.action.toUpperCase()} (reason: ${r.reason})`
).join("\n");

// In the Claude prompt:
`RULES (user preferences - ALWAYS FOLLOW THESE):
${rulesContext}

When analyzing emails:
1. FIRST check if email matches any rule
2. If rule matched, follow its action exactly
3. Do NOT override rules with other analysis
`
```

### 2.4d: Ignored Emails View & Approval

Create new sheet: **IgnoredEmails**

Columns:
- A: email_id
- B: from
- C: subject
- D: received_at
- E: ignore_reason
- F: confidence
- G: status (pending_review, approved_ignore, moved_to_flagged, pending_subscription_approval)
- H: logged_at

Create React component `IgnoredEmailsReview.jsx`:

```javascript
import React, { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

const IgnoredEmailsReview = ({ data, onApprove, onFlag }) => {
  const [selectedId, setSelectedId] = useState(null);
  
  const ignoredEmails = data.ignoredEmails || [];
  const pendingReview = ignoredEmails.filter(e => e.status === 'pending_review');
  const pendingSubscriptions = ignoredEmails.filter(e => e.status === 'pending_subscription_approval');
  
  return (
    <div className="space-y-6">
      {/* Pending Subscriptions */}
      {pendingSubscriptions.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3">📋 Subscription Approval Queue</h3>
          <p className="text-sm text-gray-500 mb-3">Review and approve detected subscriptions</p>
          
          <div className="space-y-2">
            {pendingSubscriptions.map(email => (
              <div key={email.email_id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{email.subject}</p>
                    <p className="text-sm text-gray-600">From: {email.from}</p>
                    <p className="text-xs text-blue-600 mt-1">Confidence: {email.confidence}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(email.email_id, 'subscription')}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => onApprove(email.email_id, 'ignore')}
                      className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                    >
                      ✕ Not Sub
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Other Ignored Emails */}
      {pendingReview.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3">🚫 Ignored Emails Log</h3>
          <p className="text-sm text-gray-500 mb-3">If any were ignored incorrectly, move them back to flagged</p>
          
          <div className="space-y-2">
            {pendingReview.map(email => (
              <div key={email.email_id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{email.subject}</p>
                    <p className="text-xs text-gray-600">{email.from}</p>
                    <p className="text-xs text-gray-500 mt-1">{email.ignore_reason}</p>
                  </div>
                  <button
                    onClick={() => onFlag(email.email_id)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex-shrink-0 ml-2"
                  >
                    Mark Relevant
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {pendingReview.length === 0 && pendingSubscriptions.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-gray-600">No items to review</p>
        </div>
      )}
    </div>
  );
};

export default IgnoredEmailsReview;
```

### 2.4e: Create "Add Rule" Endpoint

Create `api/add-rule.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pattern, action, reason } = req.body;
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_DEPLOYMENT_URL;

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'add_rule',
        pattern: pattern,
        ruleAction: action,
        reason: reason
      })
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

Update Apps Script `doPost()`:

```javascript
case "add_rule":
  return jsonResponse(addRule(data.pattern, data.ruleAction, data.reason));
```

---

## Frontend Components for Phase 2

### Component 1: Email Summary View

```javascript
// src/EmailSummary.jsx - shows flagged emails from today
import React from 'react';
import { Mail, AlertCircle, RefreshCw } from 'lucide-react';

const EmailSummary = ({ data, onCheckEmails, isChecking, lastUpdated }) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEmails = (data.flaggedEmails || []).filter(e => 
    new Date(e.received_at) > todayStart
  );
  
  return (
    <div className="space-y-4">
      <button
        onClick={onCheckEmails}
        disabled={isChecking}
        className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Mail className="w-5 h-5" />
        {isChecking ? 'Checking Emails...' : 'Check Emails Now'}
      </button>

      {todayEmails.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No flagged emails today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayEmails.map(email => (
            <div key={email.email_id} className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900">{email.subject}</h3>
              <p className="text-sm text-gray-600">{email.from}</p>
              <p className="text-sm text-gray-700 mt-2">{email.summary}</p>
              {email.action_items && (
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Actions:</strong> {email.action_items}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailSummary;
```

### Component 2: Add to Bottom Navigation

Update `BottomNav.jsx`:

```javascript
const tabs = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'emails', label: 'Emails', icon: Mail },        // NEW
  { id: 'subscriptions', label: 'Subs', icon: CreditCard },
  { id: 'review', label: 'Review', icon: AlertCircle },  // NEW - for ignored/subscriptions
];
```

Create `Review.jsx` component that shows IgnoredEmailsReview + PendingSubscriptions.

---

## Google Sheet Setup Checklist

Ensure these sheets exist and are configured:

- [ ] **Tasks** - with columns from build_plan
- [ ] **Subscriptions** - with columns from build_plan + pending_approval status
- [ ] **FlaggedEmails** - with all columns shown above
- [ ] **Rules** - with pattern, action, reason columns
- [ ] **ProcessingLog** - with date, count, tokens, cost columns
- [ ] **IgnoredEmails** - with status column for tracking
- [ ] **Config** - with:
  - AUTOMATION_ENABLED = TRUE
  - DAILY_TOKEN_BUDGET = 50000
  - WEEKLY_COST_THRESHOLD = 200 (pence, ~£2)
  - LAST_EMAIL_TIMESTAMP = (current date)
  - CLAUDE_API_KEY = (your key)

---

## Implementation Sequence

**Week 1:**
- [ ] Session 2.1: Email Scanner Foundation (Gmail API + Claude analysis + storage)
- [ ] Session 2.2: Scheduled Automation (daily trigger + manual button)

**Week 2:**
- [ ] Session 2.3: Subscription Intelligence (pending approval queue + renewal alerts)
- [ ] Session 2.4: Learning from Corrections (Rules + ignored log)

**Week 3:**
- [ ] Frontend: Email Summary component + Review tab
- [ ] Testing & debugging
- [ ] Deploy to Vercel

---

## Testing Checklist

- [ ] Gmail API can fetch 5+ emails
- [ ] Claude analysis returns valid JSON
- [ ] Emails appear in FlaggedEmails sheet
- [ ] Tasks auto-created for action items
- [ ] Daily trigger fires at 7am (check Apps Script execution log)
- [ ] "Check Emails Now" button in app works
- [ ] Cost calculated and logged
- [ ] Rules applied correctly (test with one rule)
- [ ] Ignored emails logged properly
- [ ] Subscription alerts created within 14 days of renewal
- [ ] Email summary displays in app
- [ ] No loops or errors in logs

---

## Questions & Next Steps

Ready to start with Session 2.1? Or would you like me to:
1. Create the Gmail API setup guide?
2. Prepare a detailed prompt for Claude analysis?
3. Create a data validation checklist?

