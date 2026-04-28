const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { solveFunCaptcha } = require('./captcha');

puppeteer.use(StealthPlugin());

function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateUsername() {
  const prefix = ['Cool', 'Pro', 'Mega', 'Super', 'Ultra', 'Fast', 'Epic', 'King'];
  const suffix = randomString(5);
  return `${prefix[Math.floor(Math.random() * prefix.length)]}${suffix}`;
}

function generatePassword() {
  return randomString(12) + 'A1!';
}

async function createSingleAccount(capsolverApiKey) {
  // Use new headless mode to avoid deprecation warning
  const browser = await puppeteer.launch({
    headless: 'new',  // fixes the warning
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  let page = await browser.newPage();
  const username = generateUsername();
  const password = generatePassword();

  try {
    console.log(`[Creator] Trying: ${username}`);
    await page.goto('https://www.roblox.com/account/signupredir', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for username field
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);

    // Birthday (over 13)
    await page.select('select#Month', 'Jan');
    await page.select('select#Day', '15');
    await page.select('select#Year', '2000');

    // Click sign-up button
    await page.click('span[data-testid="sign-up-button"]');

    // Wait for CAPTCHA iframe
    await page.waitForSelector('iframe[title*="captcha"]', { timeout: 20000 });

    // Solve CAPTCHA
    const captchaToken = await solveFunCaptcha(page, capsolverApiKey);
    console.log(`[Creator] CAPTCHA solved, token length: ${captchaToken.length}`);

    // Inject token and submit
    await page.evaluate((token) => {
      const captchaInput = document.querySelector('input[name="captcha-solution"]');
      if (captchaInput) {
        captchaInput.value = token;
        const submitBtn = document.querySelector('input[type="submit"]');
        if (submitBtn) submitBtn.click();
      } else {
        // Alternative: try to find the submit button inside the CAPTCHA iframe's parent
        document.querySelector('form')?.submit();
      }
    }, captchaToken);

    // Wait for navigation to dashboard/home page
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 });

    // Extract cookie
    const cookies = await page.cookies();
    const robloxCookie = cookies.find(c => c.name === '.ROBLOSECURITY')?.value;

    if (!robloxCookie) {
      // Dump cookies for debugging
      console.error(`[Creator] Cookies found: ${cookies.map(c => c.name).join(', ')}`);
      throw new Error('.ROBLOSECURITY cookie not found after signup');
    }

    console.log(`[Success] ${username} | ${password}`);
    return { username, password, cookie: robloxCookie };

  } catch (err) {
    console.error(`[Creator] Failed for ${username}:`, err.message);
    console.error(`[Creator] Stack:`, err.stack);
    // Take screenshot for debugging (optional, can be removed if disk space is low)
    try {
      const screenshotPath = `/tmp/error-${username}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`[Creator] Screenshot saved: ${screenshotPath}`);
    } catch (ssErr) {
      // Ignore screenshot errors
    }
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { createSingleAccount };
