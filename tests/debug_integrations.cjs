const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen to page errors & console
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));

  await page.goto('http://localhost:3000/login');
  await page.click("button:has-text('المالك')");
  await page.waitForTimeout(300);
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard');
  
  console.log('Navigating to integrations...');
  await page.goto('http://localhost:3000/integrations', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  
  console.log('Current URL:', page.url());
  const h1Text = await page.locator('h1').allInnerTexts();
  console.log('H1 texts:', h1Text);
  const titleCount = await page.locator("text='مركز التكاملات والأدوات الخارجية'").count();
  console.log('Arabic title count:', titleCount);
  await browser.close();
})();
