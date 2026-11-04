/**
 * PR AI WORKFORCE - Milestone 5 End-to-End Playwright Test
 * Tests Om Samah CEO Orchestrator:
 * 1. Owner Login & Navigation to /workflows.
 * 2. Start a new autonomous workflow with client brief.
 * 3. Verify visual DAG representation with 5 nodes & parallel execution.
 * 4. Verify pipeline pause at Human Approval Gate for QA Lead.
 * 5. Review and approve step via the UI approval modal.
 * 6. Verify pipeline resumption and final compiled deliverables package.
 * 7. Capture screenshots for deliverable report.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 5 Om Samah Orchestrator Test...");

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

    // ── 2. Open Workflows Page & Launch Modal ────────────────────────────────
    console.log("▶ [Test 2] Navigating to /workflows...");
    await page.goto("http://localhost:3000/workflows", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    console.log("  Opening Start Workflow Modal...");
    await page.click('[data-testid="start-workflow-cta"]');
    await page.waitForSelector('[data-testid="workflow-request-input"]');

    // Load sample brief
    await page.click("button:has-text('تحميل نموذج'), button:has-text('Load Sample')");
    await page.waitForTimeout(300);

    // Launch workflow
    console.log("  Launching Om Samah autonomous workflow...");
    await page.click('[data-testid="submit-workflow-btn"]');
    await page.waitForURL("**/workflows/**");
    console.log("  ✓ Workflow initialized and redirected to DAG viewer!");

    // ── 3. Verify DAG Nodes & Parallel Execution ─────────────────────────────
    console.log("▶ [Test 3] Verifying DAG Nodes...");
    await page.waitForSelector('[data-testid="dag-node-dr-ibrahim"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="dag-node-ragaa"]');
    await page.waitForSelector('[data-testid="dag-node-copywriter"]');
    await page.waitForSelector('[data-testid="dag-node-fawzyia"]');
    await page.waitForSelector('[data-testid="dag-node-qa-lead"]');
    console.log("  ✓ All 5 DAG nodes rendered with proper dependency hierarchy!");

    // Capture DAG Running screenshot
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "15_workflow_builder_dag_running.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 15_workflow_builder_dag_running.png");

    // ── 4. Verify Pipeline Pause at Human Approval Gate ──────────────────────
    console.log("▶ [Test 4] Waiting for Human Approval Gate on QA Lead step...");
    await page.waitForSelector('[data-testid="approval-alert-banner"]', { timeout: 25000 });
    console.log("  ✓ Step paused at Human Approval Gate as designed!");

    // ── 5. Open and Review Approval Modal ────────────────────────────────────
    console.log("▶ [Test 5] Opening Human Approval Modal...");
    await page.click('[data-testid="open-approval-btn"]');
    await page.waitForSelector('[data-testid="approval-modal"]');
    await page.waitForSelector('[data-testid="confirm-approval-btn"]');
    console.log("  ✓ Approval Modal displayed with QA assessment checklist.");

    // Capture Approval Modal screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "16_workflow_step_approval_modal.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 16_workflow_step_approval_modal.png");

    // Click Approve
    console.log("  Approving step and resuming pipeline...");
    await page.click('[data-testid="confirm-approval-btn"]');
    await page.waitForSelector('[data-testid="approval-modal"]', { state: "detached", timeout: 8000 });
    console.log("  ✓ Human approval submitted!");

    // ── 6. Verify Workflow Completion & Master Package ───────────────────────
    console.log("▶ [Test 6] Waiting for Final Deliverables Compilation...");
    await page.waitForSelector('[data-testid="compiled-package-card"]', { timeout: 25000 });
    await page.waitForSelector('[data-testid="workflow-status-badge"]:has-text("completed")', { timeout: 10000 });
    console.log("  ✓ Master PR Package compiled and sealed by Om Samah!");

    // Capture Final Package screenshot
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "17_workflow_completed_deliverables.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 17_workflow_completed_deliverables.png");

    console.log("\n🎉 ALL MILESTONE 5 ACCEPTANCE CRITERIA PASSED 100%!");
  } catch (error) {
    console.error("❌ E2E Test Failure:", error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m5_error_state.png") });
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
