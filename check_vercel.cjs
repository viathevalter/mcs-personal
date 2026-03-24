const process = require('process');

const urlsToCheck = [
    'https://unbepkdzvsfvylnysrcq.supabase.co', // PROD
    'https://pyahcgorkvwfwmlzspnv.supabase.co' // DEV
];

const run = async () => {
    try {
        console.log("Fetching Vercel app...");
        const res = await fetch('https://mcs-personal.vercel.app/');
        const html = await res.text();
        
        // Find main JS bundle
        const regex = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
        const match = html.match(regex);
        
        if (match && match[1]) {
            const bundleUrl = 'https://mcs-personal.vercel.app' + match[1];
            console.log("Fetching JS bundle:", bundleUrl);
            const bundleRes = await fetch(bundleUrl);
            const bundleCode = await bundleRes.text();
            
            if (bundleCode.includes(urlsToCheck[0])) {
                console.log("✅ The Vercel app is pointing to PROD.");
            } else if (bundleCode.includes(urlsToCheck[1])) {
                console.log("❌ The Vercel app is STILL pointing to DEV.");
            } else {
                console.log("⚠️ Could not find any of the known URLs in the JS bundle.");
            }
        } else {
            console.log("Could not find JS bundle in HTML.");
        }
        
    } catch(e) {
        console.error("Error:", e.message);
    }
}
run();
