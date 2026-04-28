require('dotenv').config();
const { createSingleAccount } = require('./creator');
const { sendToWebhook } = require('./webhook');

// Use env variable or fallback to your provided webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://discord.com/api/webhooks/1498621566274109600/gYEkpZwMsV2KOy7ayjAkSUskfCBaftNdUTiMs6E2dDMPIf6J0GpklAGySgd5OKTbF8Fw';
const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;

if (!CAPSOLVER_API_KEY) {
  console.error('[FATAL] Missing CAPSOLVER_API_KEY environment variable');
  process.exit(1);
}

console.log('[Factory] Starting Roblox account generator – MAXIMUM SPEED mode');
console.log(`[Factory] Webhook target: ${WEBHOOK_URL.slice(0, 60)}...`);

let consecutiveErrors = 0;

async function run() {
  while (true) {
    try {
      const account = await createSingleAccount(CAPSOLVER_API_KEY);
      if (account) {
        await sendToWebhook(WEBHOOK_URL, account.username, account.password, account.cookie);
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
        console.log(`[Factory] Creation failed (${consecutiveErrors} consecutive errors)`);
        if (consecutiveErrors > 5) {
          console.log('[Factory] Too many failures – waiting 30 seconds');
          await new Promise(r => setTimeout(r, 30000));
          consecutiveErrors = 0;
        }
      }
      // No delay – as soon as one account finishes, start the next one
    } catch (err) {
      console.error('[Factory] Unexpected loop error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

run();
