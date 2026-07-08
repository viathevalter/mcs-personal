const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\User03\\.gemini\\antigravity\\brain';
const outputFile = path.join(__dirname, 'scratch', 'audio_search_results.txt');

// Ensure scratch directory exists
if (!fs.existsSync(path.dirname(outputFile))) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
}

async function searchTranscripts() {
    try {
        const folders = fs.readdirSync(brainDir);
        let outputContent = `Search results for Gravando.m4a:\n==============================\n\n`;

        for (const folder of folders) {
            const logDir = path.join(brainDir, folder, '.system_generated', 'logs');
            if (!fs.existsSync(logDir)) continue;

            const files = fs.readdirSync(logDir);
            for (const file of files) {
                if (file !== 'transcript_full.jsonl') continue; // use full transcript
                const filePath = path.join(logDir, file);
                
                const fileStream = fs.createReadStream(filePath);
                const rl = readline.createInterface({
                    input: fileStream,
                    crlfDelay: Infinity
                });

                let lineNum = 0;
                for await (const line of rl) {
                    lineNum++;
                    if (line.includes('Gravando.m4a')) {
                        outputContent += `Folder: ${folder}\nFile: ${file}\nLine: ${lineNum}\n`;
                        try {
                            const parsed = JSON.parse(line);
                            outputContent += `Type: ${parsed.type || 'unknown'}\n`;
                            outputContent += `Content:\n${JSON.stringify(parsed.content || parsed.tool_calls || parsed.thinking, null, 2)}\n`;
                        } catch (e) {
                            outputContent += `Raw Line:\n${line}\n`;
                        }
                        outputContent += `\n------------------------------------------------------------\n\n`;
                    }
                }
            }
        }
        
        fs.writeFileSync(outputFile, outputContent);
        console.log(`Saved results to ${outputFile}`);
    } catch (err) {
        console.error('Error during search:', err);
    }
}

searchTranscripts();
