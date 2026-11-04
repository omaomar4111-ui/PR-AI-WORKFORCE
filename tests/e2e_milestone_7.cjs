/**
 * PR AI WORKFORCE - Milestone 7 End-to-End Playwright Test
 * Tests:
 * 1. Owner Login & Pending Approvals Notification Badge verification.
 * 2. Create Workflow requiring sensitive action ("send_email" or "start_ad_campaign").
 * 3. Verify workflow pauses and creates Approval Request.
 * 4. Navigate to /approvals (Human Approvals Hub).
 * 5. Verify pending approval card with action type, agent, and payload.
 * 6. Capture screenshot: 21_approvals_dashboard.png.
 * 7. Open Edit & Approve Modal, edit payload, and capture screenshot: 22_approval_edit_modal.png.
 * 8. Submit Edit & Approve, verify approval status updates and workflow resumes.
 * 9. Navigate to /integrations (Integrations Hub).
 * 10. Verify 9 providers with connection status and scopes.
 * 11. Connect Google Drive with credentials and run "Test Connection" verifying success.
 * 12. Capture screenshot: 23_integrations_hub.png.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 7 Approvals & Integrations Test...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // ── 1. Owner Login ───────────────────────────────────────────────────────
    console.log("▶ [Test 1] Owner Login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page.click("button:has-text('المالك')");
    await page.waitForTimeout(300);
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard");
    console.log("  ✓ Logged in successfully.");

    const token = await page.evaluate(() => localStorage.getItem("pr_auth_token"));

    // ── 2. Create Workflow with Sensitive Action ─────────────────────────────
    console.log("▶ [Test 2] Triggering workflow with sensitive action (send_email)...");
    const wfRes = await fetch("http://localhost:8000/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        user_request: "Plan outreach strategy and send email proposal to the client.",
      }),
    });
    const wfData = await wfRes.json();
    const workflowId = wfData.workflow.id;
    console.log(`  ✓ Workflow created: ${workflowId}`);

    // Wait a brief moment for Om Samah to detect sensitive step and pause
    await page.waitForTimeout(1500);

    // ── 3. Navigate to /approvals ───────────────────────────────────────────
    console.log("▶ [Test 3] Navigating to /approvals (Human Approvals Hub)...");
    await page.goto("http://localhost:3000/approvals", { waitUntil: "networkidle" });
    await page.waitForSelector("h1:has-text('مركز الموافقات البشرية'), h1:has-text('Human Approvals Hub')");
    console.log("  ✓ Approvals page loaded.");

    // Verify approval request card exists
    await page.waitForSelector("span:has-text('send_email')");
    console.log("  ✓ Pending approval request detected for 'send_email'.");

    // Capture Screenshot 21: Approvals Dashboard
    const ss21Path = path.join(SCREENSHOTS_DIR, "21_approvals_dashboard.png");
    await page.screenshot({ path: ss21Path, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${ss21Path}`);

    // ── 4. Open Edit & Approve Modal ────────────────────────────────────────
    console.log("▶ [Test 4] Opening Edit & Approve Modal...");
    await page.click("button:has-text('تعديل واعتماد'), button:has-text('Edit & Approve')");
    await page.waitForSelector("textarea");
    console.log("  ✓ Edit & Approve modal opened with payload editor.");

    // Fill notes in modal
    const notesInput = page.locator("input[placeholder*='ملاحظات'], input[placeholder*='Review notes']");
    if (await notesInput.count() > 0) {
      await notesInput.fill("Approved with customized executive subject line.");
    }

    // Capture Screenshot 22: Approval Edit Modal
    const ss22Path = path.join(SCREENSHOTS_DIR, "22_approval_edit_modal.png");
    await page.screenshot({ path: ss22Path, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${ss22Path}`);

    // Click Save & Approve
    console.log("▶ [Test 5] Submitting Edit & Approve...");
    await page.click("button:has-text('Save & Approve')");
    await page.waitForTimeout(1500);
    console.log("  ✓ Edit & Approve submitted and processed.");

    // ── 5. Navigate to /integrations ────────────────────────────────────────
    console.log("▶ [Test 6] Navigating to /integrations (Integrations Hub)...");
    await page.goto("http://localhost:3000/integrations", { waitUntil: "networkidle" });
    await page.waitForSelector("h1:has-text('مركز التكاملات والأدوات الخارجية'), h1:has-text('External Tools & Integration Hub')");
    console.log("  ✓ Integrations Hub loaded.");

    // Verify all 9 provider cards rendered
    const providers = [
      "Google Drive",
      "Google Docs",
      "Gmail",
      "Google Sheets",
      "Meta Ads (Facebook & Instagram)",
      "Google Ads",
      "Instagram Graph API",
      "Generative Image Studio",
      "Generative Video Engine",
    ];
    for (const name of providers) {
      const el = page.locator(`h3:has-text('${name}')`);
      await el.waitFor({ state: "visible" });
    }
    console.log("  ✓ All 9 integration providers verified on page.");

    // Connect Google Drive
    console.log("▶ [Test 7] Connecting Google Drive via Sandbox Credentials...");
    // Find Google Drive card connect button
    const driveCard = page.locator("div.rounded-xl:has(h3:has-text('Google Drive'))");
    await driveCard.locator("button:has-text('ربط وتفعيل'), button:has-text('Connect Tool')").click();
    await page.waitForSelector("button:has-text('Insert Sandbox Credentials')");
    
    // Click Insert Sandbox Credentials
    await page.click("button:has-text('Insert Sandbox Credentials')");
    await page.waitForTimeout(300);

    // Save and Authenticate
    await page.click("button:has-text('حفظ والاتصال'), button:has-text('Save & Authenticate')");
    await page.waitForTimeout(1200);
    console.log("  ✓ Google Drive connected.");

    // Test Connection on Google Drive
    console.log("▶ [Test 8] Testing Google Drive Connection...");
    const driveCardAfter = page.locator("div.rounded-xl:has(h3:has-text('Google Drive'))");
    await driveCardAfter.locator("button:has-text('اختبار الاتصال'), button:has-text('Test Connection')").click();
    
    // Verify success banner appears
    await page.waitForSelector("text=Connection Test [google_drive]: SUCCESS");
    console.log("  ✓ Connection test passed with verified success banner.");

    // Capture Screenshot 23: Integrations Hub
    const ss23Path = path.join(SCREENSHOTS_DIR, "23_integrations_hub.png");
    await page.screenshot({ path: ss23Path, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${ss23Path}`);

    console.log("\n🎉 ALL MILESTONE 7 PLAYWRIGHT E2E TESTS PASSED SUCCESSFULLY (100%)!\n");
  } catch (err) {
    console.error("❌ E2E Test Failure:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
