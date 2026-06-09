const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function run() {
  const logPath = path.resolve('C:\\Users\\User03\\.gemini\\antigravity\\brain\\8763fb99-66e0-4e6d-adf0-a9b05884bef3\\.system_generated\\logs\\transcript.jsonl');
  if (!fs.existsSync(logPath)) {
    console.log("Log file not found at:", logPath);
    return;
  }
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes("supabase") || line.includes("CommandLine") || line.includes("deploy")) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.name === 'run_command' && tc.args && tc.args.CommandLine) {
              console.log("Found run_command:", tc.args.CommandLine);
            }
          }
        }
      } catch (e) {
        // Not JSON
      }
    }
  }
}
run();
