const geminiApiKey = 'AIzaSyC8dq9DOXLX9ubNaZYWNi3aFyAbrKAUhHM';

async function run() {
    console.log("Listing models in v1...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiApiKey}`);
        const data = await res.json();
        console.log("v1 models:", (data.models || []).map(m => m.name));
    } catch (err) {
        console.error("v1 error:", err);
    }
    
    console.log("\nListing models in v1beta...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const data = await res.json();
        console.log("v1beta models:", (data.models || []).map(m => m.name));
    } catch (err) {
        console.error("v1beta error:", err);
    }
}

run();
