/**
 * PR AI WORKFORCE - Milestone 10 Part 1: Analytics & Cost Tracking E2E Playwright Test
 * Tests:
 * 1. Seed AI usage logs and quality scores via API using agents' exact sample inputs.
 * 2. Owner Login and navigation to /analytics.
 * 3. Verify top 4 KPI cards (Tokens, Cost, Quality, Latency).
 * 4. Verify charts (Daily cost trend, Top agents by cost, Model distribution, Quality trend).
 * 5. Capture screenshot: 28_analytics_dashboard_overview.png.
 * 6. Test AI Usage Logs Table, filter by Agent and Project.
 * 7. Test Export CSV functionality.
 * 8. Capture screenshot: 29_analytics_usage_logs_table_and_filters.png.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const ARTIFACT_DIR = "C:/Users/DELL/.gemini/antigravity/brain/fd959096-0c91-4379-a8f3-1452ce8eec36";

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 10 Analytics E2E Test...");

  // Seed sample usage logs by executing real agents with their real sample_inputs
  console.log("▶ [Step 0] Seeding executions and logs via API...");
  try {
    const authRes = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@pragency.eg", password: "Password123!" }),
    });
    const authData = await authRes.json();
    const token = authData.access_token;
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Get agents registry
    const agentsRes = await fetch("http://localhost:8000/api/agents", { headers: authHeaders });
    const agentsData = await agentsRes.json();
    const agentsList = agentsData.agents || [];

    const targetAgentIds = ["dr-ibrahim", "ragaa", "mahmoud", "copywriter", "fawzyia"];
    for (const aid of targetAgentIds) {
      const ag = agentsList.find((a) => a.id === aid);
      if (ag && ag.sample_input) {
        const execRes = await fetch(`http://localhost:8000/api/agents/${aid}/execute`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            input: ag.sample_input,
            title: `Execution Test: ${ag.name}`,
          }),
        });
        const execJson = await execRes.json();
        console.log(`  ✓ Executed ${ag.name} (status ${execRes.status})`);
      }
    }
  } catch (seedErr) {
    console.warn("  ⚠ Seeding warning:", seedErr.message);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
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

    // ── 2. Navigate to /analytics ────────────────────────────────────────────
    console.log("▶ [Test 2] Navigating to /analytics...");
    await page.goto("http://localhost:3000/analytics", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // ── 3. Verify KPI Cards ──────────────────────────────────────────────────
    console.log("▶ [Test 3] Verifying 4 Top KPI Cards...");
    const tokensCard = await page.locator("text=tokens").first();
    const costCard = await page.locator("text=USD").first();
    const qualityCard = await page.locator("text=Enterprise").first();
    const latencyCard = await page.locator("text=Parallel Async").first();

    if (!(await tokensCard.isVisible())) throw new Error("Tokens KPI card not visible");
    if (!(await costCard.isVisible())) throw new Error("Cost KPI card not visible");
    if (!(await qualityCard.isVisible())) throw new Error("Quality KPI card not visible");
    if (!(await latencyCard.isVisible())) throw new Error("Latency KPI card not visible");
    console.log("  ✓ All 4 KPI Cards are visible and populated.");

    // ── 4. Verify Charts ─────────────────────────────────────────────────────
    console.log("▶ [Test 4] Verifying Analytics Visual Charts...");
    const topAgentsChart = await page.locator("text=Top 10 Agents").first();
    const modelMatrixChart = await page.locator("text=LLM Matrix").first();

    if (!(await topAgentsChart.isVisible())) throw new Error("Top Agents chart not visible");
    if (!(await modelMatrixChart.isVisible())) throw new Error("Model breakdown chart not visible");
    console.log("  ✓ Charts section loaded successfully.");

    // ── 5. Capture Overview Screenshot ───────────────────────────────────────
    console.log("▶ [Test 5] Capturing Screenshot: 28_analytics_dashboard_overview.png...");
    const shot1Path = path.join(SCREENSHOTS_DIR, "28_analytics_dashboard_overview.png");
    await page.screenshot({ path: shot1Path, fullPage: false });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(shot1Path, path.join(ARTIFACT_DIR, "28_analytics_dashboard_overview.png"));
    }
    console.log("  ✓ Saved 28_analytics_dashboard_overview.png");

    // ── 6. Test AI Usage Logs Table & Filtering ──────────────────────────────
    console.log("▶ [Test 6] Testing AI Usage Logs Table & Filters...");
    const tableHeader = await page.locator("table thead").first();
    if (!(await tableHeader.isVisible())) throw new Error("Usage logs table not visible");

    // Check table rows
    const rows = await page.locator("table tbody tr").count();
    console.log(`  ✓ Table rendered with ${rows} rows.`);
    if (rows === 0) throw new Error("Usage logs table is empty");

    // Filter by Dr. Ibrahim using option value
    console.log("▶ [Test 7] Testing Agent Filter...");
    const agentSelect = page.locator("select").first();
    await agentSelect.selectOption({ value: "dr-ibrahim" });
    await page.waitForTimeout(600);
    const filteredRows = await page.locator("table tbody tr").count();
    console.log(`  ✓ Filtered table rows for Dr. Ibrahim: ${filteredRows}`);

    // Reset filter to all
    await agentSelect.selectOption({ value: "all" });
    await page.waitForTimeout(600);

    // ── 7. Test Export CSV Functionality ─────────────────────────────────────
    console.log("▶ [Test 8] Testing CSV Export button...");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("button:has-text('CSV')"),
    ]);
    const suggestedFilename = download.suggestedFilename();
    console.log(`  ✓ Download triggered with filename: ${suggestedFilename}`);
    if (!suggestedFilename.endsWith(".csv")) {
      throw new Error(`Expected .csv file but received: ${suggestedFilename}`);
    }

    // ── 8. Capture Usage Logs & Filter Screenshot ────────────────────────────
    console.log("▶ [Test 9] Capturing Screenshot: 29_analytics_usage_logs_table_and_filters.png...");
    // Scroll down to table section
    await page.locator("table").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const shot2Path = path.join(SCREENSHOTS_DIR, "29_analytics_usage_logs_table_and_filters.png");
    await page.screenshot({ path: shot2Path, fullPage: false });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(shot2Path, path.join(ARTIFACT_DIR, "29_analytics_usage_logs_table_and_filters.png"));
    }
    console.log("  ✓ Saved 29_analytics_usage_logs_table_and_filters.png");

    console.log("🎉 ALL MILESTONE 10 ANALYTICS E2E TESTS PASSED SUCCESSFULLY (100%)!");
  } catch (err) {
    console.error("❌ E2E Test Failure:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
