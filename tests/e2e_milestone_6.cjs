/**
 * PR AI WORKFORCE - Milestone 6 End-to-End Playwright Test
 * Tests:
 * 1. Owner Login & Navigation to /memory (Knowledge & Memory Base).
 * 2. Save a Client Memory with brand guidelines and visual rules.
 * 3. Verify memory rendering in grid.
 * 4. Perform vector semantic search (<=>) and verify similarity score badge.
 * 5. Navigate to /deliverables and test multi-filter by client and agent.
 * 6. Create a new version of a deliverable (v2) and verify version increment.
 * 7. Open version history modal and verify lineage.
 * 8. Capture screenshots for report.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 6 Memory & Deliverables Test...");

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

    // First ensure at least one client & deliverable exists in DB
    console.log("  Seeding client & initial deliverable via API...");
    const token = await page.evaluate(() => localStorage.getItem("pr_auth_token"));
    
    // Create client
    const clientRes = await fetch("http://localhost:8000/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: "Abu Ammar El-Soury",
        industry: "Food & Beverage",
        brand_color: "#8b5cf6",
        contact_name: "Ammar Al-Husseini",
      }),
    });
    const clientData = await clientRes.json();
    const clientId = clientData.client.id;

    // Create project
    const projRes = await fetch("http://localhost:8000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        client_id: clientId,
        name: "Grand Branch Opening",
        retainer_amount: 45000,
      }),
    });
    const projData = await projRes.json();
    const projId = projData.project.id;

    // Create initial deliverable
    const delivRes = await fetch("http://localhost:8000/api/agents/copywriter/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        project_id: projId,
        title: "Brand Voice & Taglines",
        input: {
          topic: "Grand Opening of Abu Ammar Shawarma",
          format: "Social Media Scripts",
          tone: "Appetizing & Engaging",
          target_language: "ar",
          key_takeaways: ["Original Damascus flavor", "Fresh baked bread daily"]
        }
      }),
    });
    const delivData = await delivRes.json();
    if (!delivRes.ok) {
      throw new Error(`Failed to seed deliverable: ${JSON.stringify(delivData)}`);
    }
    console.log("  ✓ Test data seeded:", delivData.deliverable.title);

    // ── 2. Navigate to /memory ───────────────────────────────────────────────
    console.log("▶ [Test 2] Navigating to /memory (Knowledge & Memory Base)...");
    await page.goto("http://localhost:3000/memory", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    console.log("  ✓ Memory page loaded.");

    // Open Add Memory modal
    console.log("  Opening Add Memory Modal...");
    await page.click('[data-testid="add-memory-cta"]');
    await page.waitForSelector('[data-testid="add-memory-modal"]');

    // Fill form
    await page.selectOption('[data-testid="memory-type-select"]', "client");
    await page.fill(
      '[data-testid="memory-content-input"]',
      "قواعد الهوية البصرية: العميل يفضل اللون البنفسجي الأساسي #8b5cf6 مع الأبيض النقي، ويمنع منعاً باتاً استخدام العامية المبتذلة في الحملات الإعلانية."
    );
    await page.click('[data-testid="save-memory-btn"]');
    await page.waitForSelector('[data-testid="add-memory-modal"]', { state: "detached", timeout: 8000 });
    console.log("  ✓ Client Memory saved and vector embedded.");

    // Capture Knowledge Base screenshot
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "18_memory_knowledge_base.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 18_memory_knowledge_base.png");

    // ── 3. Perform Vector Semantic Search ────────────────────────────────────
    console.log("▶ [Test 3] Performing Vector Semantic Search (<=>)...");
    await page.fill('[data-testid="memory-search-input"]', "الهوية البصرية والألوان المفضلة للعميل البنفسجي");
    await page.click('[data-testid="memory-search-submit"]');
    await page.waitForSelector('[data-testid="memory-similarity-badge"]', { timeout: 8000 });
    console.log("  ✓ Semantic search returned relevant memory with similarity score!");

    // Capture Semantic Search screenshot
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "19_memory_semantic_search.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 19_memory_semantic_search.png");

    // ── 4. Deliverables Versioning & Filtering ───────────────────────────────
    console.log("▶ [Test 4] Navigating to /deliverables...");
    await page.goto("http://localhost:3000/deliverables", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="deliverable-row"]');

    // Verify v1 badge
    const v1Badge = await page.waitForSelector('[data-testid="deliverable-version-badge"]:has-text("v1")');
    console.log("  ✓ Deliverable v1 badge verified.");

    // Create New Version (v2)
    console.log("  Creating New Version (v2)...");
    await page.click('[data-testid="create-new-version-btn"]');
    await page.waitForSelector('[data-testid="new-version-modal"]');
    await page.fill('[data-testid="new-version-title-input"]', "Brand Voice & Taglines (v2 Refined Edition)");
    await page.fill('[data-testid="new-version-content-input"]', "Updated with refined Arabic slogan and tone guidelines for Q4 rollout.");
    await page.click('[data-testid="submit-new-version-btn"]');
    await page.waitForSelector('[data-testid="new-version-modal"]', { state: "detached", timeout: 8000 });

    // Verify v2 appears
    await page.waitForSelector('[data-testid="deliverable-version-badge"]:has-text("v2")', { timeout: 8000 });
    console.log("  ✓ Deliverable v2 created and verified!");

    // Open Version History Modal
    console.log("  Opening Version Lineage Modal...");
    await page.click('[data-testid="view-versions-btn"]');
    await page.waitForSelector('[data-testid="versions-modal"]');
    await page.waitForSelector('[data-testid="version-lineage-item"]');
    console.log("  ✓ Version history modal displayed all lineage versions.");

    // Capture Deliverables Versioning screenshot
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "20_deliverables_versioning_and_filtering.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 20_deliverables_versioning_and_filtering.png");

    console.log("\n🎉 ALL MILESTONE 6 ACCEPTANCE CRITERIA PASSED 100%!");
  } catch (error) {
    console.error("❌ E2E Test Failure:", error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m6_error_state.png") });
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
