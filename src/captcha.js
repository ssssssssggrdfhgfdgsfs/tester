const axios = require('axios');

async function solveFunCaptcha(page, apiKey) {
  // Extract FunCaptcha public key and blob from the page
  const captchaMeta = await page.evaluate(() => {
    const iframe = document.querySelector('iframe[src*="funcaptcha"]');
    if (!iframe) throw new Error('FunCaptcha iframe not found');
    const src = iframe.src;
    const pkeyMatch = src.match(/pkey=([^&]+)/);
    const blobMatch = src.match(/blob=([^&]+)/);
    return {
      publicKey: pkeyMatch ? pkeyMatch[1] : '476068BF-9607-4799-B53D-966BE98E2B81',
      blob: blobMatch ? decodeURIComponent(blobMatch[1]) : ''
    };
  });

  const taskData = {
    clientKey: apiKey,
    task: {
      type: 'FunCaptchaTaskProxyless',
      websiteURL: 'https://www.roblox.com/',
      websitePublicKey: captchaMeta.publicKey,
      data: JSON.stringify({ blob: captchaMeta.blob })
    }
  };

  // Create task
  const createRes = await axios.post('https://api.capsolver.com/createTask', taskData, { timeout: 15000 });
  const taskId = createRes.data.taskId;

  // Poll for result (usually 5-12 seconds)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const getRes = await axios.post('https://api.capsolver.com/getTaskResult', {
      clientKey: apiKey,
      taskId
    });
    if (getRes.data.status === 'ready') {
      return getRes.data.solution.token;
    }
  }
  throw new Error('CAPTCHA solving timeout');
}

module.exports = { solveFunCaptcha };
