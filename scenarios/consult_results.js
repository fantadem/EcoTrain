const visit = async (page) => {
    await page.goto('http://127.0.0.1/trips?departure=Troyes&arrival=Paris&date=2025-01-01&time=00h&passengers=1', {
        waitUntil: 'networkidle',
    });
    await page.waitForTimeout(10000);
    await page.scrollToEnd();
    await page.waitForNetworkIdle();
    await page.waitForTimeout(7000);
  };
  
  module.exports = visit;
