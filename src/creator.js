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
    headless: 'new', // Use new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  let page = await browser.newPage();
  const username = generateUsername();
  const password = generatePassword();

  try {
    console.log(`[Creator] Trying: ${username}`);
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Go to signup page
    await page.goto('https://www.roblox.com/account/signupredir', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Log page title to debug
    const title = await page.title();
    console.log(`[Creator] Page title: ${title}`);
    
    // Take a screenshot of the page for debugging (optional)
    await page.screenshot({ path: `/tmp/page-${username}.png` });
    
    // Try multiple selectors for username field
    let usernameSelector = 'input[name="username"]';
    let passwordSelector = 'input[name="password"]';
    let signupButtonSelector = 'button[type="submit"], span[data-testid="sign-up-button"], input[type="submit"]';
    
    // Wait for either username field or a signup form
    try {
      await page.waitForSelector(usernameSelector, { timeout: 10000 });
    } catch (err) {
      // If not found, try to find any input field
      console.log(`[Creator] Username selector not found, trying fallback...`);
      const inputs = await page.$$('input');
      console.log(`[Creator] Found ${inputs.length} input elements`);
      if (inputs.length > 0) {
        // Assume first input is username? Risky but better than failing
        usernameSelector = 'input';
      } else {
        throw new Error('No input fields found on page');
      }
    }
    
    await page.type(usernameSelector, username);
    await page.type(passwordSelector, password);
    
    // Birthday
    await page.select('select#Month', 'Jan');
    await page.select('select#Day', '15');
    await page.select('select#Year', '2000');
    
    // Click sign-up button
    await page.click(signupButtonSelector);
    
    // Wait for CAPTCHA iframe
    await page.waitForSelector('iframe[title*="captcha"], iframe[src*="funcaptcha"]', { timeout: 20000 });
    
    const captchaToken = await solveFunCaptcha(page, capsolverApiKey);
    console.log(`[Creator] CAPTCHA solved, token length: ${captchaToken.length}`);
    
    // Submit token
    await page.evaluate((token) => {
      const captchaInput = document.querySelector('input[name="captcha-solution"]');
      if (captchaInput) {
        captchaInput.value = token;
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) submitBtn.click();
      } else {
        // Try to find the form and submit
        const form = document.querySelector('form');
        if (form) form.submit();
      }
    }, captchaToken);
    
    // Wait for navigation to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 });
    
    // Get cookies
    const cookies = await page.cookies();
    const robloxCookie = cookies.find(c => c.name === '.ROBLOSECURITY')?.value;
    
    if (!robloxCookie) {
      throw new Error('.ROBLOSECURITY cookie not found');
    }
    
    console.log(`[Success] ${username} | ${password}`);
    return { username, password, cookie: robloxCookie };
    
  } catch (err) {
    console.error(`[Creator] Failed for ${username}:`, err.message);
    // Save screenshot on error
    try {
      await page.screenshot({ path: `/tmp/error-${username}.png` });
      console.log(`[Creator] Error screenshot saved`);
    } catch (ssErr) {}
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { createSingleAccount };
