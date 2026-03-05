const tenantId = 'YOUR_TENANT_ID';
const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';

async function getGraphAccessToken(): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const formData = new URLSearchParams();
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('scope', 'https://graph.microsoft.com/.default');
    formData.append('grant_type', 'client_credentials');

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    });

    if (!response.ok) {
        console.error("Token error:", await response.text());
        throw new Error("Failed to get token");
    }

    const data = await response.json();
    return data.access_token;
}

async function run() {
    try {
        console.log("Obtendo Access Token do Microsoft Entra ID...");
        const token = await getGraphAccessToken();
        console.log("✅ Token Obtido!");

        // 1. Procurar o Site 'CIERREDEHORAS'
        console.log("\nProcurando Site 'CIERREDEHORAS'...");
        const siteHostname = "kotrik.sharepoint.com";
        const sitePath = "/sites/CIERREDEHORAS";

        // Fazendo requisição para a Graph API para encontrar o ID do site
        const siteUrl = `https://graph.microsoft.com/v1.0/sites/${siteHostname}:${sitePath}`;
        let siteRes = await fetch(siteUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!siteRes.ok) {
            console.log("❌ Erro ao achar o site. Verifique se o caminho /sites/CIERREDEHORAS está correto.");
            console.log(await siteRes.text());
            return;
        }

        const siteData = await siteRes.json();
        const siteId = siteData.id;
        console.log(`✅ Site Encontrado! ID do Site: ${siteId}`);

        // 2. Listar as Bibliotecas de Documentos (Drives) dentro desse site
        console.log("\nListando Drives (Bibliotecas) dentro do site...");
        const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
        let drivesRes = await fetch(drivesUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const drivesData = await drivesRes.json();
        console.log("Drives encontrados:");
        let targetDriveId = null;

        for (const drive of drivesData.value) {
            console.log(`- Nome: ${drive.name} | ID: ${drive.id}`);
            // Geralmente a biblioteca padrão se chama "Documentos" ou "Documentos Partilhados"
            if (drive.name === "Documentos" || drive.name === "Documents" || drive.name === "Documentos Partilhados" || drive.name === "Shared Documents") {
                targetDriveId = drive.id;
            }
        }

        if (!targetDriveId && drivesData.value.length > 0) {
            targetDriveId = drivesData.value[0].id; // Fallback pro primeiro drive
        }

        if (!targetDriveId) {
            console.log("❌ Nenhum drive encontrado no site.");
            return;
        }

        console.log(`\nUsando Drive Principal ID: ${targetDriveId}`);

        // 3. Listar conteúdo da raiz desse Drive para achar 'Geral' e '3. HOJAS TRABAJADORES'
        console.log("\nListando pastas na raiz do Drive...");
        const rootUrl = `https://graph.microsoft.com/v1.0/drives/${targetDriveId}/root/children`;
        let rootRes = await fetch(rootUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const rootData = await rootRes.json();
        for (const item of rootData.value) {
            console.log(`- [${item.folder ? 'Pasta' : 'Arquivo'}] ${item.name} | ID: ${item.id}`);
        }

        console.log("\n=== SALVE ESSES IDS PARA CONFIGURARMOS O SUPABASE ===");
        console.log(`SHAREPOINT_SITE_ID = ${siteId}`);
        console.log(`SHAREPOINT_DRIVE_ID = ${targetDriveId}`);

    } catch (e) {
        console.error("Erro:", e.message);
    }
}

run();
