const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]: ${err.toString()}`);
  });

  try {
    console.log('Navigating to http://localhost:3000/dashboard ...');
    await page.goto('http://localhost:3000/dashboard');
    
    // Inject mock Admin authentication into localStorage
    await page.evaluate(() => {
      localStorage.setItem('copa26_user', 'Jefferson');
      localStorage.setItem('copa26_role', 'Admin');
    });

    console.log('Authentication injected. Navigating to Jogadores tab...');
    await page.goto('http://localhost:3000/dashboard?tab=jogadores', { waitUntil: 'networkidle0' });
    
    console.log('Jogadores tab loaded. Waiting 3 seconds for client exceptions...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('Error during navigation:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
