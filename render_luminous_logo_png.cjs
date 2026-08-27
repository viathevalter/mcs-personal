const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function renderLogo() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 600 },
    deviceScaleFactor: 2 // 2x Retina quality
  });

  const svgPath = 'C:\\Projetos IA\\Luminous\\luminous-alley-premium\\public\\assets\\logo\\luminous-logo.svg';
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 20px; background: transparent; display: flex; align-items: center; justify-content: center; }
          #logo { display: inline-block; }
          svg { width: 500px; height: auto; }
        </style>
      </head>
      <body>
        <div id="logo">${svgContent}</div>
      </body>
    </html>
  `);

  const element = await page.$('#logo');
  const outPath = path.join(__dirname, 'public', 'luminous-logo-official-2026.png');
  await element.screenshot({ path: outPath, omitBackground: true });
  await browser.close();

  console.log('✅ Arquivo PNG 2x Retina gerado com sucesso em:', outPath);
}

renderLogo();
