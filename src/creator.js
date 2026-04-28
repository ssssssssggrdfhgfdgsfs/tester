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
  const browser = await puppeteer.launch({
    headless: true,
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
    await page.goto('https://www.roblox.com/account/signupredir', { waitUntil: 'networkidle2' });

    // Fill the form
    await page.waitForSelector('input[name="username"]', { timeout: 8000 });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);

    // Random birthday (over 13)
    await page.select('select#Month', 'Jan');
    await page.select('select#Day', '15');
    await page.select('select#Year', '2000');

    // Click sign-up
    await page.click('span[data-testid="sign-up-button"]');

    // Wait for CAPTCHA iframe
    await page.waitForSelector('iframe[title*="captcha"]', { timeout: 15000 });

    // Solve CAPTCHA using external service
    const captchaToken = await solveFunCaptcha(page, capsolverApiKey);

    // Inject token and submit
    await page.evaluate((token) => {
      const captchaInput = document.querySelector('input[name="captcha-solution"]');
      if (captchaInput) captchaInput.value = token;
      const submitBtn = document.querySelector('input[type="submit"]');
      if (submitBtn) submitBtn.click();
    }, captchaToken);

    // Wait for redirect to home page (account creation success)
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Extract .ROBLOSECURITY cookie
    const cookies = await page.cookies();
    const robloxCookie = cookies.find(c => c.name === '.ROBLOSECURITY')?.value;

    if (!robloxCookie) throw new Error('No .ROBLOSECURITY cookie found');

    console.log(`[Success] ${username} | ${password}`);
    return { username, password, cookie: robloxCookie };

  } catch (err) {
    console.error(`[Creator] Failed for ${username}:`, err.message);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { createSingleAccount };
