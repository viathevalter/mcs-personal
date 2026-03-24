const process = require('process');

const urlsToCheck = {
    PROD: 'unbepkdzvsfvylnysrcq',
    DEV: 'pyahcgorkvwfwmlzspnv'
};

const run = async () => {
    try {
        console.log("Fetching Vercel app...");
        const res = await fetch('https://mcs-personal.vercel.app/');
        const html = await res.text();
        
        let foundDev = false;
        let foundProd = false;

        const regex = /<script type="module" crossorigin src="([^"]+)"><\/script>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            const bundleUrl = 'https://mcs-personal.vercel.app' + match[1];
            console.log("Fetching JS bundle:", bundleUrl);
            const bundleRes = await fetch(bundleUrl);
            const bundleCode = await bundleRes.text();
            
            if (bundleCode.includes(urlsToCheck.PROD)) {
                foundProd = true;
            }
            if (bundleCode.includes(urlsToCheck.DEV)) {
                foundDev = true;
            }
        }
        
        console.log("Prod URL found?", foundProd);
        console.log("Dev URL found?", foundDev);

    } catch(e) {
        console.error("Error:", e.message);
    }
}
run();
