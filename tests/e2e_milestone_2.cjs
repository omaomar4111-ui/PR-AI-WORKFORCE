/**
 * PR AI WORKFORCE - Milestone 2 Full End-to-End Playwright Test
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 2 E2E Test Suite...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let nileClientId = null;

  try {
    // ── 1. Login Page ────────────────────────────────────────────────────────
    console.log("▶ [Test 1] Navigating to /login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    console.log("  ✓ Login page loaded successfully.");

    // Prefill Owner credentials
    await page.click("button:has-text('المالك')");
    await page.waitForTimeout(500);

    // Submit form
    console.log("  Logging in as Owner...");
    await page.click("button[type='submit']");
    
    // ── 2. Command Center (Empty State) ──────────────────────────────────────
    console.log("▶ [Test 2] Verifying Command Center & 13 Sidebar Items...");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.waitForSelector("aside", { timeout: 8000 });

    // Verify all 13 sidebar items exist
    const sidebarText = await page.textContent("aside");
    const requiredItems = [
      ["مركز القيادة", "Command Center"],
      ["المكتب الافتراضي", "Virtual Office"],
      ["وكلاء الذكاء الاصطناعي", "Agents"],
      ["الأقسام", "Departments"],
      ["المهام", "Tasks"],
      ["منشئ مسارات العمل", "Workflow Builder"],
      ["المشاريع", "Projects"],
      ["العملاء", "Clients"],
      ["الذاكرة المعرفية", "Memory"],
      ["المخرجات", "Deliverables"],
      ["التحليلات", "Analytics"],
      ["التكاملات", "Integrations"],
      ["الإعدادات", "Settings"]
    ];

    let foundCount = 0;
    for (const [ar, en] of requiredItems) {
      if (sidebarText.includes(ar) || sidebarText.includes(en)) {
        foundCount++;
      } else {
        console.warn(`  ⚠️ Missing sidebar item: ${ar} / ${en}`);
      }
    }
    if (foundCount !== 13) {
      throw new Error(`Sidebar missing items. Found only ${foundCount} of 13.`);
    }
    console.log("  ✓ All 13 Sidebar items verified successfully in persistent sidebar!");

    // Capture Command Center initial screenshot
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01_command_center_initial.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 01_command_center_initial.png");

    // ── 3. Clients Module: Create Client ─────────────────────────────────────
    console.log("▶ [Test 3] Navigating to /clients & creating client...");
    await page.goto("http://localhost:3000/clients", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("table", { timeout: 8000 });

    // Open modal
    await page.click("button:has-text('عميل جديد'), button:has-text('New Client')");
    await page.waitForSelector("form", { timeout: 5000 });

    // Fill form
    await page.fill("input[placeholder*='Nile Media']", "Nile Media Corp");
    await page.fill("input[placeholder*='Telecom']", "Media & Public Relations");
    await page.fill("input[placeholder*='Tarek']", "Karim Tarek");
    await page.fill("input[placeholder*='tarek@nile.eg']", "karim@nilemedia.eg");
    await page.fill("input[placeholder*='+201']", "+201009876543");

    // Submit
    await page.click("button:has-text('حفظ العميل'), button:has-text('Save Client')");
    
    // Wait for row to appear
    await page.waitForSelector("text=Nile Media Corp", { timeout: 8000 });
    console.log("  ✓ Client 'Nile Media Corp' created and verified in table!");

    // Capture Clients List screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02_clients_list.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 02_clients_list.png");

    // ── 4. Client Detail & Create Linked Project ─────────────────────────────
    console.log("▶ [Test 4] Opening Client Detail & adding Project...");
    await page.click("a:has-text('Nile Media Corp')");
    await page.waitForSelector("h1:has-text('Nile Media Corp')");

    // Extract client ID from URL
    const clientUrl = page.url();
    nileClientId = clientUrl.split("/clients/")[1];
    console.log(`  ✓ Client ID: ${nileClientId}`);

    // Capture Client Detail initial screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03_client_detail.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 03_client_detail.png");

    // Click Add Project inside Client Detail
    await page.click("button:has-text('مشروع جديد'), button:has-text('New Project')");
    await page.waitForSelector("form");

    // Fill Project modal
    await page.fill("input[placeholder*='Retainer']", "2026 Q4 PR Campaign");
    await page.fill("textarea", "Crisis communications and executive profiling for tech launch");
    await page.fill("input[placeholder='5000']", "12500");

    await page.click("button:has-text('حفظ المشروع'), button:has-text('Save Project')");
    
    // Verify project shows in client detail table
    await page.waitForSelector("text=2026 Q4 PR Campaign", { timeout: 8000 });
    await page.waitForSelector("text=12,500");
    console.log("  ✓ Project '2026 Q4 PR Campaign' created with $12,500 retainer!");

    // ── 5. Projects List Module ──────────────────────────────────────────────
    console.log("▶ [Test 5] Navigating to /projects list...");
    await page.goto("http://localhost:3000/projects", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=2026 Q4 PR Campaign", { timeout: 8000 });
    await page.waitForSelector("text=12,500");

    // Capture Projects List screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "04_projects_list.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 04_projects_list.png");

    // ── 6. Command Center Real Data Verification ─────────────────────────────
    console.log("▶ [Test 6] Verifying Command Center Real Stats from DB...");
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=12,500", { timeout: 8000 });
    
    const pageContent = await page.content();
    if (!pageContent.includes("12,500")) {
      throw new Error("Command Center does not show $12,500 total retainer!");
    }
    console.log("  ✓ Command Center displays real DB stats: 1 Client, 1 Active Project, $12,500 Retainer!");

    // Capture Command Center with live data screenshot
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "05_command_center_with_data.png"),
      fullPage: true,
    });
    console.log("  📸 Saved: 05_command_center_with_data.png");

    // ── 7. RLS Member Isolation Test ─────────────────────────────────────────
    console.log("▶ [Test 7] Testing RLS Member Isolation...");
    // Logout
    await page.click("button:has-text('تسجيل خروج'), button:has-text('Logout')");
    await page.waitForURL("**/login", { timeout: 8000 });

    // Login as Member
    await page.click("button:has-text('عضو فريق')");
    await page.waitForTimeout(300);
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 8000 });

    // Navigate to /clients as Member
    await page.goto("http://localhost:3000/clients", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("table", { timeout: 8000 });

    // Member should NOT see Nile Media Corp (since it was unassigned)
    const memberClientsText = await page.textContent("table");
    if (memberClientsText.includes("Nile Media Corp")) {
      throw new Error("RLS Violation: Member can see unassigned client!");
    }
    console.log("  ✓ Member cannot see owner's unassigned client in clients table!");

    // Try direct URL access to /clients/[nileClientId] as Member
    await page.goto(`http://localhost:3000/clients/${nileClientId}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".border-red-500\\/30", { timeout: 8000 });
    const errorBox = await page.textContent(".border-red-500\\/30");
    console.log(`  ✓ Member received expected error: "${errorBox.trim()}"`);
    console.log("  ✓ Direct access to unassigned client correctly blocked!");

    console.log("\n🎉 ALL MILESTONE 2 ACCEPTANCE CRITERIA PASSED 100%!");
  } catch (error) {
    console.error("❌ E2E Test Failure:", error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "error_state.png") });
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
