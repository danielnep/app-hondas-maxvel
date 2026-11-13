import {chromium} from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
page.on('response', res => {
  if (res.status() >= 400) console.log('HTTP ERROR:', res.status(), res.url());
});
console.log('Navigating to https://maxvel.hzsys.tech/central.html...');
await page.goto('https://maxvel.hzsys.tech/central.html', {waitUntil: 'networkidle'});
await new Promise(r => setTimeout(r, 1000));
const html = await page.evaluate(() => document.querySelector('#central-root')?.innerHTML);
console.log('HTML in #central-root:', html?.slice(0, 300));
await browser.close();
