const visit = async (page) => {
    // Consulter les détails du trajet avec l'ID "0"
    await page.goto('http://localhost/trips/0', {
        waitUntil: 'networkidle',
    });
    await page.waitForTimeout(10000);
    await page.scrollToEnd();
    await page.waitForNetworkIdle();
    await page.waitForTimeout(7000);
};

module.exports = visit;