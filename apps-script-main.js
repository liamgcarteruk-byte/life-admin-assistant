// ============================================
// LIFE ADMIN ASSISTANT - APPS SCRIPT
// Phase 2.5: Email Sender Management & Filtering
// Updated: April 2026
// ============================================
// INSTRUCTIONS: This is the PRODUCTION version (with your actual API key).
// Never commit this file to GitHub - it's in .gitignore
// Use apps-script-main.template.js for version control (placeholder API key)

// ============ CONFIG (Update these!) ============
const SHEET_ID = "1YSyZiHBfINbvOfoeBEHMwC1Gt4M0E8JVUj9AKj8aDjg";
const SHEET_NAME = "Life Admin DB";
const CLAUDE_API_KEY = "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";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

// ============ DEPLOYMENT ACCESS ============

function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case "tasks":
        return jsonResponse(getTasks());
      case "subscriptions":
        return jsonResponse(getSubscriptions());
      case "flagged-emails":
        return jsonResponse(getFlaggedEmails());
      case "ignored-emails":
        return jsonResponse(getIgnoredEmails());
      case "dashboard":
        return jsonResponse(getDashboard());
      case "email-data":
        return jsonResponse(getEmailData(e.parameter.email_data_id));
      case "senders":
        return jsonResponse(getSendersData());
      default:
        return jsonResponse({ error: "Unknown action", availableActions: ["tasks", "subscriptions", "flagged-emails", "ignored-emails", "dashboard", "email-data", "senders"] });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

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
      case "add_rule":
        return jsonResponse(addRule(data.pattern, data.ruleAction, data.reason));
      case "manage_ignored_email":
        return jsonResponse(manageIgnoredEmail(data));
      case "suggest_action":
        return jsonResponse(suggestTaskAction(data.task_id));
      case "manage_sender":
        return jsonResponse(manageSender(data.sender_email, data.status));
      default:
        return jsonResponse({ error: "Unknown action" });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ============================================
// SECTION 1: READ ENDPOINTS
// ============================================

function getTasks() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tasks");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      tasks.push(mapRowToTask(headers, row));
    }
  }

  return { success: true, count: tasks.length, tasks: tasks };
}

function getSubscriptions() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Subscriptions");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const subscriptions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      subscriptions.push(mapRowToSubscription(headers, row));
    }
  }

  return { success: true, count: subscriptions.length, subscriptions: subscriptions };
}

function getFlaggedEmails() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("FlaggedEmails");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emails = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      emails.push(mapRowToEmail(headers, row));
    }
  }

  return { success: true, count: emails.length, emails: emails };
}

function getIgnoredEmails() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("IgnoredEmails");

    if (!sheet) {
      return { success: false, error: "IgnoredEmails sheet not found" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emails = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        const email = {};
        headers.forEach((header, index) => {
          email[header] = row[index] || "";
        });
        emails.push(email);
      }
    }

    return { success: true, count: emails.length, emails: emails };
  } catch (error) {
    Logger.log(`ERROR in getIgnoredEmails: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function getEmailData(emailDataId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("EmailData");

    if (!sheet) {
      return { success: false, error: "EmailData sheet not found" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === emailDataId) {
        const emailData = {};
        headers.forEach((header, index) => {
          emailData[header] = row[index] || "";
        });
        return { success: true, email_data: emailData };
      }
    }

    return { success: false, error: "Email data not found" };
  } catch (error) {
    Logger.log(`ERROR in getEmailData: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function getDashboard() {
  // Open spreadsheet once and read all three sheets directly.
  // The old approach called getTasks(), getSubscriptions(), and getFlaggedEmails() which each
  // called getSpreadsheet() separately — that's 3 openById() calls instead of 1.
  const ss = getSpreadsheet();

  const tasksSheet = ss.getSheetByName("Tasks");
  const subsSheet = ss.getSheetByName("Subscriptions");
  const emailsSheet = ss.getSheetByName("FlaggedEmails");

  const tasksData = tasksSheet.getDataRange().getValues();
  const tasksHeaders = tasksData[0];
  const subsData = subsSheet.getDataRange().getValues();
  const subsHeaders = subsData[0];
  const emailsData = emailsSheet.getDataRange().getValues();
  const emailsHeaders = emailsData[0];

  // Map rows to objects (same logic as the individual helper functions)
  const allTasks = [];
  for (let i = 1; i < tasksData.length; i++) {
    if (tasksData[i][0]) allTasks.push(mapRowToTask(tasksHeaders, tasksData[i]));
  }

  const allSubscriptions = [];
  for (let i = 1; i < subsData.length; i++) {
    if (subsData[i][0]) allSubscriptions.push(mapRowToSubscription(subsHeaders, subsData[i]));
  }

  const allEmails = [];
  for (let i = 1; i < emailsData.length; i++) {
    if (emailsData[i][0]) allEmails.push(mapRowToEmail(emailsHeaders, emailsData[i]));
  }

  const pendingTasks = allTasks.filter(t => t.status === "pending" || t.status === "");

  const today = new Date();
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate < today;
  });

  // Calculate in30Days once outside the filter (old code created a new Date() inside the loop)
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const renewingSoon = allSubscriptions.filter(s => {
    if (!s.renewal_date) return false;
    const renewalDate = new Date(s.renewal_date);
    return renewalDate > today && renewalDate <= in30Days;
  });

  return {
    success: true,
    summary: {
      pending_tasks: pendingTasks.length,
      overdue_tasks: overdueTasks.length,
      subscriptions_renewing_soon: renewingSoon.length,
      unread_flagged_emails: allEmails.filter(e => e.status !== "read").length
    },
    tasks: pendingTasks,
    subscriptions: allSubscriptions,
    subscriptions_renewing: renewingSoon.slice(0, 3),
    recent_emails: allEmails.slice(0, 3)
  };
}

// ============================================
// SECTION 2: WRITE ENDPOINTS
// ============================================

function completeTask(taskId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tasks");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const taskIdIndex = headers.indexOf("task_id");
  const statusIndex = headers.indexOf("status");
  const completedAtIndex = headers.indexOf("completed_at");

  for (let i = 1; i < data.length; i++) {
    if (data[i][taskIdIndex] === taskId) {
      sheet.getRange(i + 1, statusIndex + 1).setValue("done");
      sheet.getRange(i + 1, completedAtIndex + 1).setValue(new Date());
      return { success: true, message: "Task marked as done", task_id: taskId };
    }
  }

  return { success: false, error: "Task not found" };
}

function addTask(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tasks");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const existingCount = sheet.getLastRow();
  const taskId = "T-" + String(existingCount).padStart(5, "0");

  const newRow = [];
  for (let header of headers) {
    switch (header) {
      case "task_id": newRow.push(taskId); break;
      case "title": newRow.push(data.title || ""); break;
      case "description": newRow.push(data.description || ""); break;
      case "source": newRow.push("voice"); break;
      case "category": newRow.push(data.category || "personal"); break;
      case "priority": newRow.push(data.priority || "medium"); break;
      case "status": newRow.push("pending"); break;
      case "due_date": newRow.push(data.due_date || ""); break;
      case "recurrence": newRow.push("none"); break;
      case "related_email_id": newRow.push(data.related_email_id || ""); break;
      case "created_at": newRow.push(new Date()); break;
      case "completed_at": newRow.push(""); break;
      default: newRow.push("");
    }
  }

  sheet.appendRow(newRow);
  return { success: true, message: "Task added successfully", task_id: taskId };
}

// ============================================
// SECTION 2: SENDER LIST MANAGEMENT (NEW)
// ============================================

function ensureSendersListSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("SendersList");

  if (!sheet) {
    sheet = ss.insertSheet("SendersList");
    sheet.appendRow(["sender_email", "status"]);
    Logger.log("Created new SendersList sheet");
  }

  return sheet;
}

function getSendersList() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("SendersList");

    if (!sheet) {
      Logger.log("SendersList sheet not found, creating it...");
      ensureSendersListSheet();
      return { whitelisted: [], blacklisted: [], pending: [] };
    }

    const data = sheet.getDataRange().getValues();
    const whitelisted = [];
    const blacklisted = [];
    const pending = [];

    for (let i = 1; i < data.length; i++) {
      const email = data[i][0];
      const status = data[i][1];

      if (!email) continue;

      if (status === "whitelist") {
        whitelisted.push(email);
      } else if (status === "blacklist") {
        blacklisted.push(email);
      } else if (status === "pending") {
        pending.push(email);
      }
    }

    return { whitelisted, blacklisted, pending };

  } catch (error) {
    Logger.log(`Error in getSendersList: ${error}`);
    return { whitelisted: [], blacklisted: [], pending: [] };
  }
}

function getSendersData() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("SendersList");

    if (!sheet) {
      ensureSendersListSheet();
      sheet = ss.getSheetByName("SendersList");
    }

    const data = sheet.getDataRange().getValues();
    const senders = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        senders.push({
          email: data[i][0],
          status: data[i][1] || "pending"
        });
      }
    }

    return {
      success: true,
      count: senders.length,
      senders: senders
    };

  } catch (error) {
    Logger.log(`Error in getSendersData: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function manageSender(sender_email, new_status) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("SendersList");

    if (!sheet) {
      ensureSendersListSheet();
      sheet = ss.getSheetByName("SendersList");
    }

    const data = sheet.getDataRange().getValues();

    // Find existing sender
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sender_email) {
        sheet.getRange(i + 1, 2).setValue(new_status);
        Logger.log(`Updated sender ${sender_email} to ${new_status}`);
        return { success: true, message: `Sender updated to ${new_status}` };
      }
    }

    // Sender not found - add them
    sheet.appendRow([sender_email, new_status]);
    Logger.log(`Added new sender ${sender_email} with status ${new_status}`);
    return { success: true, message: `Sender added with status ${new_status}` };

  } catch (error) {
    Logger.log(`Error in manageSender: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function trackNewSenders(emails) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("SendersList");

    if (!sheet) {
      ensureSendersListSheet();
      sheet = ss.getSheetByName("SendersList");
    }

    const data = sheet.getDataRange().getValues();
    const existingSenders = new Set();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        existingSenders.add(data[i][0].toLowerCase());
      }
    }

    let newSendersAdded = 0;

    for (let email of emails) {
      const senderEmail = email.from.toLowerCase();

      if (!existingSenders.has(senderEmail)) {
        sheet.appendRow([email.from, "pending"]);
        existingSenders.add(senderEmail);
        newSendersAdded++;
        Logger.log(`Tracked new sender: ${email.from}`);
      }
    }

    if (newSendersAdded > 0) {
      Logger.log(`Tracked ${newSendersAdded} new senders`);
    }

    return newSendersAdded;

  } catch (error) {
    Logger.log(`Error in trackNewSenders: ${error}`);
    return 0;
  }
}

// ============================================
// SECTION 3: EMAIL SCANNER & ANALYSIS (UPDATED)
// ============================================

function extractEmailsSinceLastRun() {
  try {
    const ss = getSpreadsheet();
    const configSheet = ss.getSheetByName("Config");
    const configData = configSheet.getDataRange().getValues();
    let lastTimestamp = new Date(Date.now() - 24*60*60*1000);

    for (let row of configData) {
      if (row[0] === "LAST_EMAIL_TIMESTAMP" && row[1]) {
        lastTimestamp = new Date(row[1]);
        break;
      }
    }

    const daysBack = Math.ceil((Date.now() - lastTimestamp.getTime()) / (1000 * 60 * 60 * 24));

    // UPDATED: Get blacklist and exclude from Gmail query
    const senderLists = getSendersList();
    const blacklistedEmails = senderLists.blacklisted.map(e => `-from:${e}`).join(" ");

    const baseQuery = `newer_than:${daysBack}d`;
    const finalQuery = blacklistedEmails ? `${baseQuery} ${blacklistedEmails}` : baseQuery;

    Logger.log(`Gmail query: ${finalQuery}`);

    const threads = GmailApp.search(finalQuery, 0, 50);

    if (!threads || threads.length === 0) {
      return { success: true, emails: [], message: "No new emails", count: 0 };
    }

    const emails = [];
    for (let thread of threads) {
      const messages = thread.getMessages();
      for (let message of messages) {
        const from = message.getFrom();
        const subject = message.getSubject();
        const date = message.getDate();
        let body = message.getPlainBody();

        emails.push({
          gmail_message_id: message.getId(),
          from: from,
          subject: subject,
          received_at: date.toISOString(),
          body: body
        });
      }
    }

    Logger.log(`Found ${emails.length} new emails (after filtering blacklist)`);
    return { success: true, emails: emails, count: emails.length };
  } catch (error) {
    Logger.log(`ERROR in extractEmailsSinceLastRun: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function batchEmails(emails, batchSize = 10) {
  const batches = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }
  return batches;
}

function analyzeEmailBatchWithClaude(emailBatch, rules = []) {
  try {
    const rulesContext = rules.length > 0
      ? rules.map(r => `- If email matches "${r.pattern}": ${r.action.toUpperCase()} (reason: ${r.reason})`).join("\n")
      : "No custom rules yet";

    const emailsForAnalysis = emailBatch.map((e, index) => {
      // Truncate body for analysis but keep first 1500 chars (enough for context)
      const truncatedBody = e.body.substring(0, 1500);
      return `[Email ${index}]\nFrom: ${e.from}\nSubject: ${e.subject}\nBody: ${truncatedBody}`;
    }).join("\n---\n");

    const prompt = `You are an email classifier for a personal admin assistant.

RULES (user preferences - ALWAYS FOLLOW THESE):
${rulesContext}

FILTERING RULES - Mark emails as should_flag: false if they match these patterns:
1. RECRUITMENT EMAILS: Job listings, career opportunities, recruiter outreach, job board notifications (e.g. "Accounting Manager at ACCA Careers", LinkedIn jobs, indeed, glassdoor alerts)
2. MARKETING EMAILS: Newsletters, promotional offers, marketing campaigns, unsubscribe links present, bulk sender

For each email, determine:
- is_recruitment_email: true if job listing/recruiter outreach
- is_marketing_email: true if newsletter/promotional
- should_flag: false if is_recruitment_email OR is_marketing_email (these get ignored), true otherwise

Analyze these emails and for EACH ONE, respond with ONLY valid JSON in this format (no markdown, no extra text):
[
  {
    "email_index": 0,
    "should_flag": true,
    "is_recruitment_email": false,
    "is_marketing_email": false,
    "is_spam": false,
    "summary": "one sentence summary of what this email is about",
    "reason_flagged": "Financial impact" or null,
    "action_items": ["item1", "item2"],
    "sender_importance": "high",
    "topic": "Financial",
    "is_subscription": false,
    "confidence": 0.95
  }
]

EMAILS TO ANALYZE:
${emailsForAnalysis}

Respond with a valid JSON array. Do not include markdown, triple backticks, or any text outside the JSON.`;

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
      }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      Logger.log(`Claude API error: ${responseCode} - ${errorText}`);
      return { success: false, error: `API error: ${responseCode}` };
    }

    const result = JSON.parse(response.getContentText());
    const analysisText = result.content[0].text;
    const inputTokens = result.usage.input_tokens;
    const outputTokens = result.usage.output_tokens;

    let cleanedText = analysisText.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '');

    const startIdx = cleanedText.indexOf('[');
    const endIdx = cleanedText.lastIndexOf(']');

    if (startIdx === -1 || endIdx === -1) {
      Logger.log(`ERROR: Could not find JSON array in response`);
      return { success: false, error: "Invalid JSON format from Claude" };
    }

    cleanedText = cleanedText.substring(startIdx, endIdx + 1).trim();
    const analyses = JSON.parse(cleanedText);

    Logger.log(`Analyzed ${analyses.length} emails, tokens: in=${inputTokens}, out=${outputTokens}`);

    return {
      success: true,
      analyses: analyses,
      tokens: { input: inputTokens, output: outputTokens }
    };

  } catch (error) {
    Logger.log(`ERROR in analyzeEmailBatchWithClaude: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function processEmailBatch(emailBatch, analyses) {
  try {
    const ss = getSpreadsheet();
    const flaggedSheet = ss.getSheetByName("FlaggedEmails");
    const tasksSheet = ss.getSheetByName("Tasks");
    const subsSheet = ss.getSheetByName("Subscriptions");
    const ignoredSheet = ss.getSheetByName("IgnoredEmails");
    const emailDataSheet = ss.getSheetByName("EmailData");

    if (!flaggedSheet || !tasksSheet || !subsSheet) {
      Logger.log("ERROR: Required sheets not found!");
      return;
    }

    // Cache existing flagged email IDs as a Set for O(1) lookups.
    // Without this, the old code re-read the entire FlaggedEmails sheet once per email
    // in the batch (e.g. 10 emails = 10 full sheet reads). Now it reads once and checks
    // in memory — much faster as FlaggedEmails grows over time.
    const existingFlaggedData = flaggedSheet.getDataRange().getValues();
    const existingFlaggedIds = new Set(existingFlaggedData.slice(1).map(row => row[9]).filter(Boolean));

    for (let i = 0; i < emailBatch.length; i++) {
      const email = emailBatch[i];
      const analysis = analyses[i];

      // NEW: Check for recruitment/marketing emails
      if (analysis.is_recruitment_email || analysis.is_marketing_email) {
        const filterReason = analysis.is_recruitment_email ? "Recruitment email" : "Marketing/promotional email";
        if (ignoredSheet) logIgnoredEmail(ignoredSheet, email, filterReason, 0.95);
        Logger.log(`Filtered: ${email.subject} (${filterReason})`);
        continue;
      }

      if (analysis.is_spam) {
        if (ignoredSheet) logIgnoredEmail(ignoredSheet, email, "Spam detected", analysis.confidence);
        continue;
      }

      if (!analysis.should_flag) {
        if (ignoredSheet) logIgnoredEmail(ignoredSheet, email, "Not relevant", 0.5);
        continue;
      }

      // O(1) lookup using the Set built above — no sheet read needed
      const alreadyExists = existingFlaggedIds.has(email.gmail_message_id);

      if (alreadyExists) {
        Logger.log(`Email already flagged: ${email.subject}`);
        continue;
      }

      // NEW: Store full email content
      let emailDataId = null;
      if (emailDataSheet) {
        emailDataId = "email_data_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const emailDataRow = [
          emailDataId,
          email.gmail_message_id,
          email.from,
          email.subject,
          email.body,
          new Date()
        ];
        emailDataSheet.appendRow(emailDataRow);
        Logger.log(`Stored email data: ${emailDataId}`);
      }

      const emailId = "email_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const flaggedRow = [
        emailId, email.from, email.subject, email.received_at,
        analysis.summary, analysis.reason_flagged || "", analysis.action_items.join("; "),
        analysis.sender_importance, analysis.topic, email.gmail_message_id, "unread"
      ];
      flaggedSheet.appendRow(flaggedRow);
      existingFlaggedIds.add(email.gmail_message_id); // Keep Set in sync for within-batch dedup
      Logger.log(`Added flagged email: ${email.subject}`);

      if (analysis.action_items && analysis.action_items.length > 0) {
        const taskId = "T-" + String(tasksSheet.getLastRow()).padStart(5, "0");
        const taskRow = [
          taskId, `[EMAIL] ${email.subject}`, analysis.action_items.join("; "),
          "email", analysis.topic, "high", "", "pending", emailDataId, new Date(), ""
        ];
        tasksSheet.appendRow(taskRow);
        Logger.log(`Auto-created task for: ${email.subject}`);
      }

      if (analysis.is_subscription) {
        handleSubscriptionEmail(subsSheet, ignoredSheet, email, analysis);
      }
    }

  } catch (error) {
    Logger.log(`ERROR in processEmailBatch: ${error}`);
  }
}

function logIgnoredEmail(ignoredSheet, email, reason, confidence) {
  try {
    if (!ignoredSheet) return;

    const row = [
      "email_" + Date.now(),
      email.from, email.subject, email.received_at,
      reason, Math.round(confidence * 100) + "%",
      "pending_review", new Date()
    ];

    ignoredSheet.appendRow(row);
    Logger.log(`Logged ignored email: ${email.subject} (reason: ${reason})`);
  } catch (error) {
    Logger.log(`Error logging ignored email: ${error.toString()}`);
  }
}

function handleSubscriptionEmail(subsSheet, ignoredSheet, email, analysis) {
  try {
    if (!subsSheet) return;

    const existingRowIndex = findSubscriptionByEmail(subsSheet, email.from);

    if (existingRowIndex >= 0) {
      Logger.log(`Subscription already exists from ${email.from}, updating...`);
      updateSubscription(subsSheet, existingRowIndex, email, analysis);
    } else {
      Logger.log(`New subscription detected from ${email.from}, creating pending entry...`);
      createPendingSubscription(subsSheet, ignoredSheet, email, analysis);
    }

  } catch (error) {
    Logger.log(`Error handling subscription: ${error.toString()}`);
  }
}

function findSubscriptionByEmail(sheet, senderEmail) {
  try {
    if (!sheet || !senderEmail) return -1;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === senderEmail) return i;
    }
    return -1;
  } catch (error) {
    Logger.log(`Error finding subscription: ${error.toString()}`);
    return -1;
  }
}

function updateSubscription(sheet, rowIndex, email, analysis) {
  try {
    if (!sheet || rowIndex < 0) return;

    const cost = extractCostFromEmail(email.body);
    const renewalDate = extractRenewalDateFromEmail(email.body);

    sheet.getRange(rowIndex + 1, 8).setValue(new Date());

    if (cost) {
      sheet.getRange(rowIndex + 1, 4).setValue(cost);
      Logger.log(`Updated cost for ${email.from}: £${cost}`);
    }

    if (renewalDate) {
      sheet.getRange(rowIndex + 1, 5).setValue(renewalDate);
      Logger.log(`Updated renewal date for ${email.from}: ${renewalDate}`);
    }

  } catch (error) {
    Logger.log(`Error updating subscription: ${error.toString()}`);
  }
}

function createPendingSubscription(sheet, ignoredSheet, email, analysis) {
  try {
    if (!sheet) return;

    const cost = extractCostFromEmail(email.body);
    const renewalDate = extractRenewalDateFromEmail(email.body);
    const subId = "sub_" + Date.now();

    const row = [
      subId, email.from, analysis.topic, cost || "", renewalDate || "",
      "monthly", new Date(), new Date(), "pending_approval",
      Math.round(analysis.confidence * 100) + "%", email.subject
    ];

    sheet.appendRow(row);
    Logger.log(`Created pending subscription: ${email.subject}`);

    if (ignoredSheet) {
      try {
        const ignoredRow = [
          "email_" + Date.now(), email.from, email.subject, email.received_at,
          "Subscription detected (pending approval)",
          Math.round(analysis.confidence * 100) + "%",
          "pending_subscription_approval", new Date()
        ];
        ignoredSheet.appendRow(ignoredRow);
      } catch (e) {
        Logger.log(`Warning: Could not log to IgnoredEmails: ${e.toString()}`);
      }
    }

  } catch (error) {
    Logger.log(`Error creating pending subscription: ${error.toString()}`);
  }
}

function extractCostFromEmail(body) {
  const match = body.match(/[£$€](\d+(?:\.\d{2})?)/);
  return match ? match[1] : null;
}

function extractRenewalDateFromEmail(body) {
  const match = body.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// ============================================
// SECTION 4: SUBSCRIPTION RENEWAL ALERTS
// ============================================

function checkSubscriptionRenewals() {
  try {
    const ss = getSpreadsheet();
    const subsSheet = ss.getSheetByName("Subscriptions");
    const tasksSheet = ss.getSheetByName("Tasks");

    const alertDays = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = subsSheet.getDataRange().getValues();
    const headers = data[0];

    const subIdIndex = headers.indexOf("sub_id");
    const nameIndex = headers.indexOf("name");
    const renewalDateIndex = headers.indexOf("renewal_date");
    const statusIndex = headers.indexOf("status");

    // Cache tasks data once before the loop.
    // The old code called isRenewalAlertCreated(tasksSheet, subId) for every subscription,
    // and that function re-read the entire Tasks sheet each time. With 10 subscriptions,
    // that's 10 unnecessary full sheet reads. Now we read once and pass the data in.
    const tasksDataCache = tasksSheet.getDataRange().getValues();
    const tasksHeadersCache = tasksDataCache[0];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const subId = row[subIdIndex];
      const subName = row[nameIndex];
      const renewalDateStr = row[renewalDateIndex];
      const status = row[statusIndex];

      if (!subId || status !== "active") continue;
      if (!renewalDateStr || renewalDateStr === "") continue;

      try {
        const renewalDate = new Date(renewalDateStr);
        renewalDate.setHours(0, 0, 0, 0);

        const daysUntilRenewal = Math.floor((renewalDate - today) / (1000*60*60*24));

        if (daysUntilRenewal <= alertDays && daysUntilRenewal > 0) {
          if (!isRenewalAlertCreated(tasksDataCache, tasksHeadersCache, subId)) {
            createRenewalTask(tasksSheet, subName, daysUntilRenewal, subId);
          }
        }
      } catch (e) {
        Logger.log(`Error processing renewal date for ${subName}: ${e}`);
      }
    }

  } catch (error) {
    Logger.log(`Error in checkSubscriptionRenewals: ${error}`);
  }
}

// Accepts pre-loaded tasksData and headers instead of reading the sheet itself.
// This avoids re-reading Tasks on every subscription check (called from checkSubscriptionRenewals).
function isRenewalAlertCreated(tasksData, headers, subId) {
  try {
    const titleIndex = headers.indexOf("title");
    const relatedEmailIndex = headers.indexOf("related_email_id");

    for (let i = 1; i < tasksData.length; i++) {
      const row = tasksData[i];
      const title = row[titleIndex] || "";

      if (title.includes("[RENEWAL]") && row[relatedEmailIndex] === subId) {
        return true;
      }
    }

    return false;

  } catch (error) {
    Logger.log(`Error checking renewal alert: ${error}`);
    return false;
  }
}

function createRenewalTask(tasksSheet, subName, daysUntilRenewal, subId) {
  try {
    const taskId = "T-" + String(tasksSheet.getLastRow()).padStart(5, "0");
    const headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];

    const taskRow = [];
    for (let header of headers) {
      switch (header) {
        case "task_id": taskRow.push(taskId); break;
        case "title": taskRow.push(`[RENEWAL] ${subName} renews in ${daysUntilRenewal} days`); break;
        case "description": taskRow.push(`Review ${subName} subscription renewal`); break;
        case "source": taskRow.push("system"); break;
        case "category": taskRow.push("Financial"); break;
        case "priority": taskRow.push("high"); break;
        case "status": taskRow.push("pending"); break;
        case "related_email_id": taskRow.push(subId); break;
        case "created_at": taskRow.push(new Date()); break;
        default: taskRow.push("");
      }
    }

    tasksSheet.appendRow(taskRow);
    Logger.log(`Created renewal alert: [RENEWAL] ${subName} renews in ${daysUntilRenewal} days`);

  } catch (error) {
    Logger.log(`Error creating renewal task: ${error}`);
  }
}

function logProcessingRun(emailsProcessed, tokensUsed) {
  try {
    const ss = getSpreadsheet();
    const logSheet = ss.getSheetByName("ProcessingLog");

    const costPerMInput = 0.80 / 1000000;
    const costPerMOutput = 2.40 / 1000000;
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
    Logger.log(`Logged run: ${emailsProcessed} emails, cost: £${costGBP.toFixed(4)}`);

  } catch (error) {
    Logger.log(`Error logging run: ${error}`);
  }
}

// ============================================
// SECTION 5: CONFIG & SCHEDULING HELPERS
// ============================================

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
    .reduce((sum, row) => sum + (parseFloat(row[4]) || 0), 0);
}

function calculateTokenCost(tokens) {
  const costPerMInput = 0.80 / 1000000;
  const costPerMOutput = 2.40 / 1000000;
  return (tokens.input * costPerMInput) + (tokens.output * costPerMOutput);
}

function sendAlertEmail(message) {
  try {
    GmailApp.sendEmail(
      Session.getActiveUser().getEmail(),
      "Life Admin Assistant Alert",
      message
    );
  } catch (error) {
    Logger.log(`Error sending alert: ${error}`);
  }
}

// ============================================
// SECTION 6: MAIN ORCHESTRATION
// ============================================

function dailyEmailScan() {
  try {
    Logger.log("=== Starting daily email scan ===");

    const ss = getSpreadsheet();
    const configSheet = ss.getSheetByName("Config");

    const automationEnabled = getConfigValue(configSheet, "AUTOMATION_ENABLED");
    if (!automationEnabled) {
      Logger.log("Automation disabled in Config sheet");
      return { success: false, message: "Automation disabled" };
    }

    const weeklyCost = calculateWeeklyCost(ss);
    const costThreshold = getConfigValue(configSheet, "WEEKLY_COST_THRESHOLD") || 200;
    const costThresholdGBP = costThreshold / 100;

    if (weeklyCost > costThresholdGBP) {
      const message = `Weekly cost limit exceeded: £${weeklyCost.toFixed(2)} > £${costThresholdGBP}`;
      Logger.log(message);
      sendAlertEmail(message);
      return { success: false, message: message };
    }

    const emailsResult = extractEmailsSinceLastRun();
    if (!emailsResult.success || emailsResult.emails.length === 0) {
      Logger.log("No new emails found");
      return { success: true, message: "No new emails", processed: 0 };
    }

    Logger.log(`Found ${emailsResult.count} new emails`);

    // NEW: Track new senders as "pending"
    const newSendersCount = trackNewSenders(emailsResult.emails);
    Logger.log(`Tracked ${newSendersCount} new senders`);

    const rulesSheet = ss.getSheetByName("Rules");
    const rules = parseRulesSheet(rulesSheet);
    Logger.log(`Loaded ${rules.length} active rules`);

    const batches = batchEmails(emailsResult.emails, 10);
    Logger.log(`Batched into ${batches.length} batches`);

    let totalTokens = { input: 0, output: 0 };
    let processedCount = 0;

    // Read DAILY_TOKEN_BUDGET once before the loop.
    // The old code called getConfigValue() on every batch iteration, which re-read
    // the entire Config sheet each time. This value doesn't change during a run.
    const dailyTokenBudget = getConfigValue(configSheet, "DAILY_TOKEN_BUDGET") || 50000;

    for (let batchNum = 0; batchNum < batches.length; batchNum++) {
      const batch = batches[batchNum];

      if (totalTokens.input + 5000 > dailyTokenBudget) {
        Logger.log("Daily token budget reached");
        break;
      }

      Logger.log(`Processing batch ${batchNum + 1}/${batches.length}...`);

      const analysisResult = analyzeEmailBatchWithClaude(batch, rules);

      if (!analysisResult.success) {
        Logger.log(`Batch ${batchNum + 1} analysis failed: ${analysisResult.error}`);
        continue;
      }

      processEmailBatch(batch, analysisResult.analyses);
      totalTokens.input += analysisResult.tokens.input;
      totalTokens.output += analysisResult.tokens.output;
      processedCount += batch.length;

      Utilities.sleep(2000);
    }

    updateConfigValue(configSheet, "LAST_EMAIL_TIMESTAMP", new Date());
    logProcessingRun(processedCount, totalTokens);

    Logger.log("Checking for upcoming subscription renewals...");
    checkSubscriptionRenewals();

    const costGBP = calculateTokenCost(totalTokens);
    Logger.log(`=== Email scan complete: ${processedCount} emails, £${costGBP.toFixed(4)} ===`);

    return {
      success: true,
      processed: processedCount,
      new_senders_tracked: newSendersCount,
      tokens: totalTokens,
      cost: costGBP.toFixed(4)
    };

  } catch (error) {
    Logger.log(`ERROR in dailyEmailScan: ${error}`);
    sendAlertEmail(`Email scan failed: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function parseRulesSheet(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const rules = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][5] !== true && data[i][5] !== "TRUE") continue;

      rules.push({
        id: data[i][0],
        pattern: data[i][1],
        action: data[i][2],
        reason: data[i][3]
      });
    }

    return rules;
  } catch (error) {
    Logger.log(`Error parsing rules: ${error}`);
    return [];
  }
}

function addRule(pattern, ruleAction, reason) {
  try {
    const ss = getSpreadsheet();
    const rulesSheet = ss.getSheetByName("Rules");

    const ruleId = "rule_" + Date.now();
    const row = [
      ruleId,
      pattern,
      ruleAction,
      reason,
      new Date(),
      true
    ];

    rulesSheet.appendRow(row);
    Logger.log(`Added rule: ${pattern} -> ${ruleAction}`);

    return { success: true, rule_id: ruleId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// SECTION 7: PHASE 2.4 - IGNORED EMAILS MANAGEMENT
// ============================================

function manageIgnoredEmail(data) {
  try {
    const action = data.sub_action;
    const emailId = data.email_id;

    switch (action) {
      case "approve":
        return approveIgnoredEmail(emailId);
      case "delete":
        return deleteIgnoredEmail(emailId);
      case "whitelist_sender":
        return whitelistSender(data.sender_email, data.sender_name);
      case "create_rule":
        return addRule(data.pattern, data.ruleAction, data.reason);
      default:
        return { success: false, error: "Unknown sub_action" };
    }

  } catch (error) {
    Logger.log(`ERROR in manageIgnoredEmail: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function approveIgnoredEmail(emailId) {
  try {
    const ss = getSpreadsheet();
    const ignoredSheet = ss.getSheetByName("IgnoredEmails");
    const flaggedSheet = ss.getSheetByName("FlaggedEmails");

    if (!ignoredSheet || !flaggedSheet) {
      return { success: false, error: "Required sheets not found" };
    }

    const ignoredData = ignoredSheet.getDataRange().getValues();
    let emailToApprove = null;
    let ignoredRowIndex = -1;

    for (let i = 1; i < ignoredData.length; i++) {
      if (ignoredData[i][0] === emailId) {
        emailToApprove = ignoredData[i];
        ignoredRowIndex = i;
        break;
      }
    }

    if (!emailToApprove) {
      return { success: false, error: "Email not found in IgnoredEmails" };
    }

    const flaggedRow = [
      "email_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      emailToApprove[1], emailToApprove[2], emailToApprove[3],
      "Approved from ignored emails", "User approved", "",
      "normal", "General", "", "unread"
    ];

    flaggedSheet.appendRow(flaggedRow);
    ignoredSheet.getRange(ignoredRowIndex + 1, 7).setValue("approved");

    Logger.log(`Approved ignored email: ${emailToApprove[2]}`);

    return {
      success: true,
      message: "Email approved and moved to flagged emails",
      email_id: emailId
    };

  } catch (error) {
    Logger.log(`ERROR in approveIgnoredEmail: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function deleteIgnoredEmail(emailId) {
  try {
    const ss = getSpreadsheet();
    const ignoredSheet = ss.getSheetByName("IgnoredEmails");

    if (!ignoredSheet) {
      return { success: false, error: "IgnoredEmails sheet not found" };
    }

    const data = ignoredSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === emailId) {
        ignoredSheet.deleteRow(i + 1);
        Logger.log(`Deleted ignored email: ${emailId}`);
        return {
          success: true,
          message: "Email deleted",
          email_id: emailId
        };
      }
    }

    return { success: false, error: "Email not found" };

  } catch (error) {
    Logger.log(`ERROR in deleteIgnoredEmail: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function whitelistSender(senderEmail, senderName) {
  try {
    const ss = getSpreadsheet();
    const rulesSheet = ss.getSheetByName("Rules");

    if (!rulesSheet) {
      return { success: false, error: "Rules sheet not found" };
    }

    const ruleId = "rule_" + Date.now();
    const pattern = `from:${senderEmail}`;
    const action = "flag";
    const reason = `Whitelisted sender: ${senderName || senderEmail}`;

    const row = [
      ruleId,
      pattern,
      action,
      reason,
      new Date(),
      true
    ];

    rulesSheet.appendRow(row);

    Logger.log(`Whitelisted sender: ${senderEmail}`);

    return {
      success: true,
      message: `Whitelisted ${senderEmail} - all future emails will be flagged`,
      rule_id: ruleId
    };

  } catch (error) {
    Logger.log(`ERROR in whitelistSender: ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ============================================
// SECTION 8: SUGGEST ACTION (NEW FEATURE)
// ============================================

function suggestTaskAction(taskId) {
  try {
    const ss = getSpreadsheet();
    const tasksSheet = ss.getSheetByName("Tasks");
    const emailDataSheet = ss.getSheetByName("EmailData");

    if (!tasksSheet || !emailDataSheet) {
      return { success: false, error: "Required sheets not found" };
    }

    // Find the task
    const tasksData = tasksSheet.getDataRange().getValues();
    const tasksHeaders = tasksData[0];
    let taskRow = null;
    let emailDataId = null;

    for (let i = 1; i < tasksData.length; i++) {
      if (tasksData[i][0] === taskId) {
        taskRow = tasksData[i];
        const emailDataIdIndex = tasksHeaders.indexOf("related_email_id");
        emailDataId = taskRow[emailDataIdIndex];
        break;
      }
    }

    if (!taskRow) {
      return { success: false, error: "Task not found" };
    }

    if (!emailDataId) {
      return { success: false, error: "No email data associated with this task" };
    }

    // Find the email data
    const emailDataData = emailDataSheet.getDataRange().getValues();
    const emailDataHeaders = emailDataData[0];
    let emailData = null;

    for (let i = 1; i < emailDataData.length; i++) {
      if (emailDataData[i][0] === emailDataId) {
        emailData = {};
        emailDataHeaders.forEach((header, index) => {
          emailData[header] = emailDataData[i][index];
        });
        break;
      }
    }

    if (!emailData) {
      return { success: false, error: "Email data not found" };
    }

    // Call Claude to suggest action
    const suggestion = generateActionSuggestion(emailData);
    return suggestion;

  } catch (error) {
    Logger.log(`ERROR in suggestTaskAction: ${error}`);
    return { success: false, error: error.toString() };
  }
}

function generateActionSuggestion(emailData) {
  try {
    const prompt = `You are a personal assistant helping someone manage their tasks and emails.

Here's an email they need to take action on:

FROM: ${emailData.from}
SUBJECT: ${emailData.subject}

FULL EMAIL BODY:
${emailData.body}

Based on this email, suggest 1-3 concrete action steps the person should take. Be specific, practical, and direct. Format your response as a numbered list.`;

    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      payload: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      Logger.log(`Claude API error: ${responseCode} - ${errorText}`);
      return { success: false, error: `API error: ${responseCode}` };
    }

    const result = JSON.parse(response.getContentText());
    const suggestion = result.content[0].text;
    const inputTokens = result.usage.input_tokens;
    const outputTokens = result.usage.output_tokens;

    return {
      success: true,
      suggestion: suggestion,
      tokens: { input: inputTokens, output: outputTokens }
    };

  } catch (error) {
    Logger.log(`ERROR in generateActionSuggestion: ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ============================================
// SECTION 9: HELPER FUNCTIONS
// ============================================

function mapRowToTask(headers, row) {
  const task = {};
  headers.forEach((header, index) => {
    task[header] = row[index] || "";
  });
  return task;
}

function mapRowToSubscription(headers, row) {
  const sub = {};
  headers.forEach((header, index) => {
    sub[header] = row[index] || "";
  });
  return sub;
}

function mapRowToEmail(headers, row) {
  const email = {};
  headers.forEach((header, index) => {
    email[header] = row[index] || "";
  });
  return email;
}
