// ============================================
// LIFE ADMIN ASSISTANT - APPS SCRIPT
// Phase 2.3: Email Scanner + Subscription Intelligence
// Updated: April 2026
// ============================================
// IMPORTANT: This is the source of truth for Apps Script code.
// Copy the ENTIRE contents of this file into Google Apps Script editor.
// Update this file when making changes to keep it synced with GitHub.

// ============ CONFIG (Update these!) ============
const SHEET_ID = "1YSyZiHBfINbvOfoeBEHMwC1Gt4M0E8JVUj9AKj8aDjg";
const SHEET_NAME = "Life Admin DB";
const CLAUDE_API_KEY = "INSERT CLAUDE_API_KEY_HERE";
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
      case "dashboard":
        return jsonResponse(getDashboard());
      default:
        return jsonResponse({ error: "Unknown action", availableActions: ["tasks", "subscriptions", "flagged-emails", "dashboard"] });
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

  return {
    success: true,
    count: tasks.length,
    tasks: tasks
  };
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

  return {
    success: true,
    count: subscriptions.length,
    subscriptions: subscriptions
  };
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

  return {
    success: true,
    count: emails.length,
    emails: emails
  };
}

function getDashboard() {
  const tasks = getTasks();
  const subscriptions = getSubscriptions();
  const emails = getFlaggedEmails();

  const pendingTasks = tasks.tasks.filter(t => t.status === "pending" || t.status === "");

  const today = new Date();
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate < today;
  });

  const renewingSoon = subscriptions.subscriptions.filter(s => {
    if (!s.renewal_date) return false;
    const renewalDate = new Date(s.renewal_date);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    return renewalDate > today && renewalDate <= in30Days;
  });

  return {
    success: true,
    summary: {
      pending_tasks: pendingTasks.length,
      overdue_tasks: overdueTasks.length,
      subscriptions_renewing_soon: renewingSoon.length,
      unread_flagged_emails: emails.emails.filter(e => e.status !== "read").length
    },
    tasks: pendingTasks,
    subscriptions: subscriptions.subscriptions,
    subscriptions_renewing: renewingSoon.slice(0, 3),
    recent_emails: emails.emails.slice(0, 3)
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
      case "task_id":
        newRow.push(taskId);
        break;
      case "title":
        newRow.push(data.title || "");
        break;
      case "description":
        newRow.push(data.description || "");
        break;
      case "source":
        newRow.push("voice");
        break;
      case "category":
        newRow.push(data.category || "personal");
        break;
      case "priority":
        newRow.push(data.priority || "medium");
        break;
      case "status":
        newRow.push("pending");
        break;
      case "due_date":
        newRow.push(data.due_date || "");
        break;
      case "recurrence":
        newRow.push("none");
        break;
      case "created_at":
        newRow.push(new Date());
        break;
      case "completed_at":
        newRow.push("");
        break;
      default:
        newRow.push("");
    }
  }

  sheet.appendRow(newRow);

  return {
    success: true,
    message: "Task added successfully",
    task_id: taskId
  };
}

// ============================================
// SECTION 3: PHASE 2.3 - EMAIL SCANNER
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
    const query = `newer_than:${daysBack}d`;

    const threads = GmailApp.search(query, 0, 50);

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

        body = body.substring(0, 2000);

        emails.push({
          gmail_message_id: message.getId(),
          from: from,
          subject: subject,
          received_at: date.toISOString(),
          body: body
        });
      }
    }

    Logger.log(`Found ${emails.length} new emails`);
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

    const emailsForAnalysis = emailBatch.map((e, index) =>
      `[Email ${index}]\nFrom: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}`
    ).join("\n---\n");

    const prompt = `You are an email classifier for a personal admin assistant.

RULES (user preferences - ALWAYS FOLLOW THESE):
${rulesContext}

Analyze these emails and for EACH ONE, respond with ONLY valid JSON in this format (no markdown, no extra text):
[
  {
    "email_index": 0,
    "should_flag": true,
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
      Logger.log(`ERROR: Could not find JSON array in response: ${cleanedText.substring(0, 100)}`);
      return { success: false, error: "Invalid JSON format from Claude" };
    }

    cleanedText = cleanedText.substring(startIdx, endIdx + 1);
    cleanedText = cleanedText.trim();

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

// UPDATED: FUNCTION 4 - Process results and store them
// IMPROVED: Better error handling and sheet existence checks
function processEmailBatch(emailBatch, analyses) {
  try {
    const ss = getSpreadsheet();

    const flaggedSheet = ss.getSheetByName("FlaggedEmails");
    const tasksSheet = ss.getSheetByName("Tasks");
    const subsSheet = ss.getSheetByName("Subscriptions");
    const ignoredSheet = ss.getSheetByName("IgnoredEmails");

    if (!flaggedSheet) {
      Logger.log("ERROR: FlaggedEmails sheet not found!");
      return;
    }
    if (!tasksSheet) {
      Logger.log("ERROR: Tasks sheet not found!");
      return;
    }
    if (!subsSheet) {
      Logger.log("ERROR: Subscriptions sheet not found!");
      return;
    }
    if (!ignoredSheet) {
      Logger.log("WARNING: IgnoredEmails sheet not found - ignored emails will not be logged");
    }

    for (let i = 0; i < emailBatch.length; i++) {
      const email = emailBatch[i];
      const analysis = analyses[i];

      if (analysis.is_spam) {
        if (ignoredSheet) {
          logIgnoredEmail(ignoredSheet, email, "Spam detected", analysis.confidence);
        }
        continue;
      }

      if (!analysis.should_flag) {
        if (ignoredSheet) {
          logIgnoredEmail(ignoredSheet, email, "Not relevant", 0.5);
        }
        continue;
      }

      const flaggedData = flaggedSheet.getDataRange().getValues();
      const alreadyExists = flaggedData.some(row => row[9] === email.gmail_message_id);

      if (alreadyExists) {
        Logger.log(`Email already flagged: ${email.subject}`);
        continue;
      }

      const emailId = "email_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const flaggedRow = [
        emailId,
        email.from,
        email.subject,
        email.received_at,
        analysis.summary,
        analysis.reason_flagged || "",
        analysis.action_items.join("; "),
        analysis.sender_importance,
        analysis.topic,
        email.gmail_message_id,
        "unread"
      ];
      flaggedSheet.appendRow(flaggedRow);
      Logger.log(`Added flagged email: ${email.subject}`);

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
          emailId,
          new Date(),
          ""
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

// UPDATED: HELPER - Log emails we ignored
// IMPROVED: Null checks and better error messaging
function logIgnoredEmail(ignoredSheet, email, reason, confidence) {
  try {
    if (!ignoredSheet) {
      Logger.log("WARNING: Cannot log ignored email - IgnoredEmails sheet is null");
      return;
    }

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
    Logger.log(`Logged ignored email: ${email.subject} (reason: ${reason})`);

  } catch (error) {
    Logger.log(`Error logging ignored email: ${error.toString()}`);
  }
}

// UPDATED: HELPER - Handle subscription detection
// IMPROVED: Better null checking and error handling
function handleSubscriptionEmail(subsSheet, ignoredSheet, email, analysis) {
  try {
    if (!subsSheet) {
      Logger.log("ERROR: Subscriptions sheet not found - cannot handle subscription email");
      return;
    }

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

// UPDATED: HELPER - Find subscription by sender email
// NOTE: This function looks in column B (index 1), which is now "from"
function findSubscriptionByEmail(sheet, senderEmail) {
  try {
    if (!sheet || !senderEmail) {
      return -1;
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === senderEmail) {
        return i;
      }
    }

    return -1;
  } catch (error) {
    Logger.log(`Error finding subscription: ${error.toString()}`);
    return -1;
  }
}

// UPDATED: HELPER - Update existing subscription
// IMPROVED: Better cell reference and error handling
function updateSubscription(sheet, rowIndex, email, analysis) {
  try {
    if (!sheet || rowIndex < 0) {
      return;
    }

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

// UPDATED: HELPER - Create pending subscription
// IMPROVED: Better error handling for ignoredSheet parameter
function createPendingSubscription(sheet, ignoredSheet, email, analysis) {
  try {
    if (!sheet) {
      Logger.log("ERROR: Cannot create subscription - Subscriptions sheet is null");
      return;
    }

    const cost = extractCostFromEmail(email.body);
    const renewalDate = extractRenewalDateFromEmail(email.body);
    const subId = "sub_" + Date.now();

    const row = [
      subId,
      email.from,
      analysis.topic,
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
    Logger.log(`Created pending subscription: ${email.subject}`);

    if (ignoredSheet) {
      try {
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
          if (!isRenewalAlertCreated(tasksSheet, subId)) {
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

function isRenewalAlertCreated(tasksSheet, subId) {
  try {
    const data = tasksSheet.getDataRange().getValues();
    const headers = data[0];

    const titleIndex = headers.indexOf("title");
    const relatedEmailIndex = headers.indexOf("related_email_id");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
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
        case "task_id":
          taskRow.push(taskId);
          break;
        case "title":
          taskRow.push(`[RENEWAL] ${subName} renews in ${daysUntilRenewal} days`);
          break;
        case "description":
          taskRow.push(`Review ${subName} subscription renewal`);
          break;
        case "source":
          taskRow.push("system");
          break;
        case "category":
          taskRow.push("Financial");
          break;
        case "priority":
          taskRow.push("high");
          break;
        case "status":
          taskRow.push("pending");
          break;
        case "related_email_id":
          taskRow.push(subId);
          break;
        case "created_at":
          taskRow.push(new Date());
          break;
        default:
          taskRow.push("");
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

    const rulesSheet = ss.getSheetByName("Rules");
    const rules = parseRulesSheet(rulesSheet);
    Logger.log(`Loaded ${rules.length} active rules`);

    const batches = batchEmails(emailsResult.emails, 10);
    Logger.log(`Batched into ${batches.length} batches`);

    let totalTokens = { input: 0, output: 0 };
    let processedCount = 0;

    for (let batchNum = 0; batchNum < batches.length; batchNum++) {
      const batch = batches[batchNum];

      const dailyTokenBudget = getConfigValue(configSheet, "DAILY_TOKEN_BUDGET") || 50000;
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
// SECTION 7: HELPER FUNCTIONS
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
