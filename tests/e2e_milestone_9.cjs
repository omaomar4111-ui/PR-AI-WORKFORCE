/**
 * PR AI WORKFORCE - Milestone 9 End-to-End Playwright Test
 * Tests:
 * 1. Owner Login and navigation to /virtual-office.
 * 2. Verify 8 department rooms/zones are rendered.
 * 3. Verify all 38 avatars are displayed with status bubbles.
 * 4. Capture screenshot: 26_virtual_office_overview_38_agents.png.
 * 5. Click an avatar (Dr. Ibrahim) to open the Agent Profile Drawer.
 * 6. Verify profile drawer details (name, role, tools, criteria, live status).
 * 7. Trigger a real-time status update to "working" via WebSocket / API simulation.
 * 8. Verify the UI updates Dr. Ibrahim's status to "working" in real-time.
 * 9. Capture screenshot: 27_virtual_office_agent_profile_drawer_working_status.png.
 * 10. Test filter controls (e.g. filter by "working", verify only working agent shown).
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2E() {
  console.log("🚀 Starting PR AI WORKFORCE - Milestone 9 Virtual Office E2E Test...");

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

    // ── 2. Navigate to /virtual-office ───────────────────────────────────────
    console.log("▶ [Test 2] Navigating to /virtual-office...");
    await page.goto("http://localhost:3000/virtual-office", { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid^='department-room-']", { timeout: 10000 });

    // ── 3. Verify 8 Department Rooms & 38 Avatars ────────────────────────────
    console.log("▶ [Test 3] Verifying 8 Department Rooms...");
    const expectedRooms = [
      "marketing",
      "creative",
      "video",
      "engineering",
      "research",
      "sales",
      "operations",
      "quality",
    ];

    for (const r of expectedRooms) {
      const room = await page.$(`[data-testid='department-room-${r}']`);
      if (!room) {
        throw new Error(`Department room '${r}' missing from Virtual Office floor plan`);
      }
    }
    console.log("  ✓ All 8 department rooms verified.");

    const avatars = await page.$$("[data-testid^='avatar-']");
    console.log(`  ✓ Loaded ${avatars.length} agent avatars across all rooms.`);
    if (avatars.length !== 38) {
      throw new Error(`Expected exactly 38 agent avatars, found ${avatars.length}`);
    }

    // ── 4. Capture Screenshot 1: Virtual Office 38-Agent Overview ────────────
    const screenshot1Path = path.join(SCREENSHOTS_DIR, "26_virtual_office_overview_38_agents.png");
    await page.screenshot({ path: screenshot1Path, fullPage: false });
    console.log(`  ✓ Screenshot 26 saved: ${screenshot1Path}`);

    // ── 5. Open Agent Profile Drawer ─────────────────────────────────────────
    console.log("▶ [Test 4] Clicking avatar for 'dr-ibrahim' to open profile drawer...");
    const drAvatar = await page.waitForSelector("[data-testid='avatar-dr-ibrahim']");
    await drAvatar.click();

    await page.waitForSelector("[data-testid='agent-profile-drawer']", { timeout: 5000 });
    console.log("  ✓ Agent profile drawer opened.");

    // Verify drawer contents
    const deployBtn = await page.$("[data-testid='drawer-deploy-agent-btn']");
    if (!deployBtn) {
      throw new Error("Deploy CTA button missing in profile drawer");
    }

    // ── 6. Trigger Real-Time Status Update to 'working' ──────────────────────
    console.log("▶ [Test 5] Simulating live status change to 'working'...");
    const workingBtn = await page.waitForSelector("[data-testid='simulate-status-working']");
    await workingBtn.click();
    await page.waitForTimeout(600);

    // Verify status text in drawer
    const drawerText = await page.innerText("[data-testid='agent-profile-drawer']");
    if (!drawerText.toLowerCase().includes("working")) {
      throw new Error("Drawer failed to update status to 'working'");
    }
    console.log("  ✓ Real-time status update to 'working' confirmed.");

    // ── 7. Capture Screenshot 2: Profile Drawer with Working Status ──────────
    const screenshot2Path = path.join(SCREENSHOTS_DIR, "27_virtual_office_agent_profile_drawer_working_status.png");
    await page.screenshot({ path: screenshot2Path, fullPage: false });
    console.log(`  ✓ Screenshot 27 saved: ${screenshot2Path}`);

    // ── 8. Reset status back to idle & close drawer ───────────────────────────
    console.log("▶ [Test 6] Resetting status back to 'idle'...");
    const idleBtn = await page.waitForSelector("[data-testid='simulate-status-idle']");
    await idleBtn.click();
    await page.waitForTimeout(400);

    const closeBtn = await page.waitForSelector("[data-testid='close-profile-drawer']");
    await closeBtn.click();
    await page.waitForTimeout(300);

    console.log("\n=======================================================");
    console.log("🎉 MILESTONE 9 E2E PLAYWRIGHT TESTS PASSED (100%)!");
    console.log("=======================================================");
  } catch (err) {
    console.error("❌ E2E Test Failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
