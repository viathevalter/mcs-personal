const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/theva/Downloads';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

files.sort((a, b) => fs.statSync(path.join(dir, b)).mtime.getTime() - fs.statSync(path.join(dir, a)).mtime.getTime());

// only check the top 20 most recent
const recent = files.slice(0, 20);

for (const f of recent) {
    const fullPath = path.join(dir, f);
    try {
        const workbook = xlsx.readFile(fullPath);
        for (const sheetName of workbook.SheetNames) {
            const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            for (let i = 0; i < rawData.length; i++) {
                if (rawData[i].join('|').toUpperCase().includes('LUCAS VINICIUS FRANCO')) {
                    console.log('FOUND IN FILE:', f, 'SHEET:', sheetName);
                }
            }
        }
    } catch (e) { }
}
