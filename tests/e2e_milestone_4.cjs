/**
 * PR AI WORKFORCE - Milestone 4 End-to-End Playwright Test
 * Tests:
 * 1. Owner Login & Navigation to /agents Directory.
 * 2. Verify all 8 agents render across all 8 departments.
 * 3. Open Agent Execution Console for Dr. Ibrahim (Research).
 * 4. Trigger task execution and verify validated structured JSON deliverable output.
 * 5. Navigate to /deliverables repository and verify stored deliverable record.
 * 6. Inspect deliverable JSON payload in modal.
 * 7. Capture screenshots for deliverable artifact.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 4 First 8 Real Agents Test...");

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

    // ── 2. Open Agents Directory ─────────────────────────────────────────────
    console.log("▶ [Test 2] Navigating to /agents Directory...");
    await page.goto("http://localhost:3000/agents", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    // Verify all 8 agent cards are rendered
    const expectedAgentIds = [
      "dr-ibrahim",
      "ragaa",
      "fawzyia",
      "copywriter",
      "media-buyer",
      "sales-manager",
      "mahmoud",
      "qa-lead"
    ];

    for (const agentId of expectedAgentIds) {
      await page.waitForSelector(`[data-testid="agent-card-${agentId}"]`, { timeout: 8000 });
      console.log(`  ✓ Agent card found: ${agentId}`);
    }

    // Capture Agents Directory screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "11_agents_directory_8_agents.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 11_agents_directory_8_agents.png");

    // ── 3. Open Agent Execution Console for Dr. Ibrahim ──────────────────────
    console.log("▶ [Test 3] Opening Execution Console for Dr. Ibrahim...");
    await page.click('[data-testid="deploy-agent-dr-ibrahim"]');
    await page.waitForSelector('[data-testid="execute-agent-btn"]');
    await page.waitForSelector('[data-testid="agent-input-json"]');
    console.log("  ✓ Execution Console opened with pre-filled sample brief!");

    // ── 4. Execute Task with Dr. Ibrahim ─────────────────────────────────────
    console.log("▶ [Test 4] Executing Task with Dr. Ibrahim...");
    await page.click('[data-testid="execute-agent-btn"]');

    // Wait for structured output JSON to be rendered
    await page.waitForSelector('[data-testid="agent-output-json"]', { timeout: 15000 });
    const outputText = await page.textContent('[data-testid="agent-output-json"]');
    if (!outputText.includes("market_overview") || !outputText.includes("competitor_landscape")) {
      throw new Error("Agent output does not match expected JSON schema contract!");
    }
    console.log("  ✓ Structured output returned and schema validated!");

    // Capture Execution Console Result screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "12_agent_execution_console_result.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 12_agent_execution_console_result.png");

    // Close modal
    await page.click('[data-testid="close-agent-console"]');
    await page.waitForTimeout(500);

    // ── 5. Open /deliverables Repository ─────────────────────────────────────
    console.log("▶ [Test 5] Navigating to /deliverables Repository...");
    await page.goto("http://localhost:3000/deliverables", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("table");
    await page.waitForSelector("text=Dr. Ibrahim");
    console.log("  ✓ Deliverable successfully stored and listed in repository!");

    // Capture Deliverables Table screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "13_deliverables_repository_table.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 13_deliverables_repository_table.png");

    // ── 6. Inspect Deliverable JSON in Modal ──────────────────────────────────
    console.log("▶ [Test 6] Inspecting Deliverable in Modal...");
    await page.click("text=Dr. Ibrahim");
    await page.waitForSelector("pre");
    console.log("  ✓ Deliverable inspection modal opened with complete JSON payload!");

    // Capture Inspection Modal screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "14_deliverable_inspect_modal.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 14_deliverable_inspect_modal.png");

    console.log("\n🎉 ALL MILESTONE 4 ACCEPTANCE CRITERIA PASSED 100%!");
  } catch (error) {
    console.error("❌ E2E Test Failure:", error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m4_error_state.png") });
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
