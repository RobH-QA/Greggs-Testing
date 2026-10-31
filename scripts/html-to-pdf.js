/* Renders an HTML file to an A4 landscape PDF: node scripts/html-to-pdf.js <input.html> <output.pdf> */
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');

(async () => {
  const [, , input, output] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(input).href);
  await page.pdf({
    path: output,
    format: 'A4',
    landscape: true,
    margin: { top: '12mm', bottom: '14mm', left: '10mm', right: '10mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7pt;width:100%;text-align:center;color:#777">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });
  await browser.close();
})();
