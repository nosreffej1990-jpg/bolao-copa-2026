const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('Starting puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 450, height: 800 });

  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });

  try {
    console.log('Visiting landing page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: path.join(__dirname, 'landing_page.png') });
    console.log('Saved landing_page.png');

    console.log('Waiting for loading splash screen (6s)...');
    await delay(6000);

    console.log('Clicking ENTRAR action card...');
    const divs = await page.$$('div');
    let entrarCard = null;
    for (const div of divs) {
      const text = await page.evaluate(el => el.textContent, div);
      if (text.trim() === 'ENTRAR') {
        entrarCard = div;
        break;
      }
    }

    if (entrarCard) {
      await entrarCard.click();
      await delay(1000); // Wait for modal to pop up
    } else {
      console.log('ENTRAR card not found, assuming form is already open or skipping...');
    }

    console.log('Filling login form...');
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'Jefferson');
    
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', '060199');

    const buttons = await page.$$('button');
    let loginBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.toLowerCase().includes('entrar') || text.toLowerCase().includes('login')) {
        loginBtn = btn;
        break;
      }
    }

    if (loginBtn) {
      console.log('Clicking login button...');
      await loginBtn.click();
    } else {
      console.log('Login button not found, pressing Enter...');
      await page.keyboard.press('Enter');
    }

    console.log('Waiting for dashboard navigation...');
    // wait for network to be idle or URL to change
    await delay(5000); 

    console.log('Current URL:', page.url());

    await page.screenshot({ path: path.join(__dirname, 'dashboard_home.png') });
    console.log('Saved dashboard_home.png');

    console.log('Attempting to click "Apostar" tab...');
    const tabSpans = await page.$$('span');
    let apostarTab = null;
    for (const span of tabSpans) {
      const text = await page.evaluate(el => el.textContent, span);
      if (text.toLowerCase().trim() === 'apostar') {
        apostarTab = span;
        break;
      }
    }

    if (apostarTab) {
      console.log('Clicking "Apostar" tab...');
      await apostarTab.click();
      await delay(3000); // Wait for tab transition and sync
      
      await page.screenshot({ path: path.join(__dirname, 'dashboard_apostar.png') });
      console.log('Saved dashboard_apostar.png');
    } else {
      console.log('"Apostar" tab not found!');
    }

    const localConfsRaw = await page.evaluate(() => localStorage.getItem('copa26_confrontos'));
    console.log('copa26_confrontos in LocalStorage:', localConfsRaw ? localConfsRaw.slice(0, 500) + '...' : 'NULL');

  } catch (err) {
    console.error('Error during browser script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
