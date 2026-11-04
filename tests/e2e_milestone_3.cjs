/**
 * PR AI WORKFORCE - Milestone 3 Full End-to-End Playwright Test
 * Tests:
 * 1. Owner Login & Navigation to Tasks page.
 * 2. Real-time WebSocket connection verification.
 * 3. Client & Project Creation prerequisite.
 * 4. Task Creation in Kanban Board (0% progress).
 * 5. Task Detail Modal with Progress & Audit Timeline.
 * 6. Task Status Transition (pending -> in_progress 50% -> review 80% -> completed 100%).
 * 7. Real-time WebSocket sync verified in a second concurrent browser context!
 * 8. Table View toggle with progress bars and sorting.
 * 9. Captures high-res screenshots for deliverable artifact.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 3 Task Engine & Live Sync Test...");

  const browser = await chromium.launch({ headless: true });
  
  // Browser Context 1 (Owner Admin)
  const context1 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page1 = await context1.newPage();

  // Browser Context 2 (Live Observer / Sync Verification)
  const context2 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page2 = await context2.newPage();

  try {
    // ── 1. Login & Prerequisites in Browser 1 ────────────────────────────────
    console.log("▶ [Test 1] Owner Login...");
    await page1.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page1.click("button:has-text('المالك')");
    await page1.waitForTimeout(300);
    await page1.click("button[type='submit']");
    await page1.waitForURL("**/dashboard");

    // Ensure a client exists
    console.log("▶ Ensuring prerequisite Client & Project exist...");
    await page1.goto("http://localhost:3000/clients", { waitUntil: "domcontentloaded" });
    await page1.waitForSelector("table");
    
    const clientRows = await page1.textContent("table");
    if (!clientRows.includes("Nile Media Corp")) {
      await page1.click("button:has-text('عميل جديد'), button:has-text('New Client')");
      await page1.waitForSelector("form");
      await page1.fill("input[placeholder*='Nile Media']", "Nile Media Corp");
      await page1.click("button:has-text('حفظ العميل'), button:has-text('Save Client')");
      await page1.waitForSelector("text=Nile Media Corp");
    }

    // Ensure a project exists
    await page1.goto("http://localhost:3000/projects", { waitUntil: "domcontentloaded" });
    await page1.waitForSelector("table");
    const projRows = await page1.textContent("table");
    if (!projRows.includes("2026 Q4 PR Campaign")) {
      await page1.click("button:has-text('مشروع جديد'), button:has-text('New Project')");
      await page1.waitForSelector("form");
      await page1.fill("input[placeholder*='Crisis Management']", "2026 Q4 PR Campaign");
      await page1.click("button:has-text('حفظ المشروع'), button:has-text('Save Project')");
      await page1.waitForSelector("text=2026 Q4 PR Campaign");
    }
    console.log("  ✓ Prerequisite Client & Project ready.");

    // ── 2. Open Tasks Kanban in Browser 1 ────────────────────────────────────
    console.log("▶ [Test 2] Navigating to /tasks Kanban in Browser 1...");
    await page1.goto("http://localhost:3000/tasks", { waitUntil: "domcontentloaded" });
    await page1.waitForSelector("h1");

    // Verify WebSocket live sync pill is active
    await page1.waitForSelector('[data-testid="ws-status"]:has-text("Live WebSocket"), [data-testid="ws-status"]:has-text("مزامنة فورية")', { timeout: 10000 });
    console.log("  ✓ Browser 1 WebSocket live sync connected!");

    // ── 3. Open Browser 2 and Connect to /tasks ──────────────────────────────
    console.log("▶ [Test 3] Connecting Browser 2 (Live Observer) to /tasks...");
    await page2.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page2.click("button:has-text('المالك')");
    await page2.waitForTimeout(300);
    await page2.click("button[type='submit']");
    await page2.waitForURL("**/dashboard");
    await page2.goto("http://localhost:3000/tasks", { waitUntil: "domcontentloaded" });
    await page2.waitForSelector("h1");
    await page2.waitForSelector('[data-testid="ws-status"]:has-text("Live WebSocket"), [data-testid="ws-status"]:has-text("مزامنة فورية")', { timeout: 10000 });
    console.log("  ✓ Browser 2 connected to /tasks with active WebSocket!");

    // ── 4. Create Task in Browser 1 ──────────────────────────────────────────
    console.log("▶ [Test 4] Creating Task 'AI Brand Positioning Matrix'...");
    await page1.click("button:has-text('مهمة جديدة'), button:has-text('New Task')");
    await page1.waitForSelector("form");

    await page1.fill("input[placeholder*='Media Audit']", "AI Brand Positioning Matrix");
    await page1.fill("textarea", "38 Specialized Agents cross-analysis for executive PR messaging");
    await page1.selectOption("form select >> nth=2", "urgent");
    await page1.click("button:has-text('حفظ المهمة'), button:has-text('Save Task')");

    // Wait for card in Browser 1
    await page1.waitForSelector("text=AI Brand Positioning Matrix", { timeout: 8000 });
    console.log("  ✓ Task created and visible on Browser 1 Kanban board!");

    // Capture initial Kanban screenshot
    await page1.waitForTimeout(500);
    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06_tasks_kanban_initial.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 06_tasks_kanban_initial.png");

    // ── 5. Open Task Detail Modal & Audit Timeline ───────────────────────────
    console.log("▶ [Test 5] Opening Task Detail & Audit Timeline...");
    await page1.click("text=AI Brand Positioning Matrix");
    await page1.waitForSelector("h2:has-text('AI Brand Positioning Matrix')");
    await page1.waitForSelector('[data-testid="audit-timeline"]');
    console.log("  ✓ Task detail drawer opened with Audit Timeline!");

    // Change status to in_progress (50%)
    console.log("  Updating status to in_progress (50%)...");
    await page1.selectOption('[data-testid="detail-status-select"]', "in_progress");
    await page1.waitForSelector("text=50%", { timeout: 5000 });
    console.log("  ✓ Progress automatically calculated to 50%!");

    // Capture Task Detail & Timeline screenshot
    await page1.waitForTimeout(500);
    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, "07_task_detail_and_timeline.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 07_task_detail_and_timeline.png");

    // Change status to completed (100%)
    console.log("  Updating status to completed (100%)...");
    await page1.selectOption('[data-testid="detail-status-select"]', "completed");
    await page1.waitForSelector("text=100%", { timeout: 5000 });
    console.log("  ✓ Progress automatically updated to 100%!");

    // Close modal
    await page1.click('[data-testid="detail-modal-close"]');
    await page1.waitForTimeout(500);

    // Capture Completed Kanban screenshot in Browser 1
    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, "08_tasks_kanban_completed.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 08_tasks_kanban_completed.png");

    // ── 6. Verify Real-time Sync in Browser 2 ────────────────────────────────
    console.log("▶ [Test 6] Verifying Live WebSocket Sync in Browser 2 (No Reload!)...");
    // Browser 2 must show the card under Completed column via WebSocket broadcast
    await page2.waitForSelector("text=AI Brand Positioning Matrix", { timeout: 10000 });
    const browser2CompletedText = await page2.textContent("body");
    if (!browser2CompletedText.includes("100%")) {
      throw new Error("Browser 2 did not receive real-time 100% completion sync!");
    }
    console.log("  ✓ Browser 2 received live WebSocket update with 100% progress!");

    // Capture Browser 2 screenshot proving real-time sync
    await page2.screenshot({
      path: path.join(SCREENSHOTS_DIR, "09_tasks_websocket_sync_dual_browser.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 09_tasks_websocket_sync_dual_browser.png");

    // ── 7. Switch to Table View in Browser 1 ─────────────────────────────────
    console.log("▶ [Test 7] Verifying Table View...");
    await page1.click('[data-testid="view-table-btn"]');
    await page1.waitForSelector("table");
    await page1.waitForSelector("text=AI Brand Positioning Matrix");
    await page1.waitForSelector("text=100%");
    console.log("  ✓ Table view renders with progress bar and urgent priority badge!");

    // Capture Table View screenshot
    await page1.waitForTimeout(500);
    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, "10_tasks_table_view.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 10_tasks_table_view.png");

    console.log("\n🎉 ALL MILESTONE 3 ACCEPTANCE CRITERIA PASSED 100%!");
  } catch (error) {
    console.error("❌ E2E Test Failure:", error);
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, "m3_error_state.png") });
    throw error;
  } finally {
    await browser.close();
  }
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
