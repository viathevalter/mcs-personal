const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const searchTerms = ['E1481', 'EDINSON', 'TORO', 'MIRANDA'];
const searchDir = 'dados_sharepoint';

const files = fs.readdirSync(searchDir)
    .filter(file => file.endsWith('.xlsx'))
    .map(file => path.join(searchDir, file));

console.log('Searching in files:', files);

const results = [];

files.forEach(file => {
    try {
        const workbook = xlsx.readFile(file);
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);
            
            data.forEach((row, idx) => {
                const values = Object.values(row).map(String).join(' ').toUpperCase();
                searchTerms.forEach(term => {
                    if (values.includes(term.toUpperCase())) {
                        results.push({
                            file,
                            sheetName,
                            rowNumber: idx + 2, // 1-based index plus header
                            term,
                            row
                        });
                    }
                });
            });
        });
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});

console.log('Search completed.');
console.log('Results:', JSON.stringify(results, null, 2));
