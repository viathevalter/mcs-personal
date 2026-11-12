export default async function handler(req, res) {
  try {
    const rawAsset = Array.isArray(req.query.asset)
      ? req.query.asset.join('/')
      : String(req.query.asset || 'assets/images/wiseowe-logo.png');

    const cleanAsset = rawAsset.replace(/^\/+/, '');
    const isSafeAsset =
      cleanAsset.length > 0 &&
      !cleanAsset.includes('..') &&
      /^[a-zA-Z0-9/_.-]+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(cleanAsset);

    const finalAsset = isSafeAsset ? cleanAsset : 'assets/images/wiseowe-logo.png';
    const lid = String(req.query.lid || '').trim();
    const cid = String(req.query.cid || '').trim();
    const ua = String(req.headers['user-agent'] || '');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lid);
    const isBotUa =
      /HeadlessChrome|PhantomJS|Barracuda|SpamAssassin|Proofpoint|Mimecast|Libraesva|curl|wget|python|Go-http-client/i.test(
        ua
      );

    const originUrl = `https://mcs.gestaologinpro.com/${finalAsset}`;

    const tasks = [fetch(originUrl)];

    if (isUuid && !isBotUa) {
      const supabaseUrl =
        process.env.VITE_SUPABASE_URL || 'https://unbepkdzvsfvylnysrcq.supabase.co';
      const webhookUrl = `${supabaseUrl}/functions/v1/resend-webhook?event=pixel_open&lead_id=${encodeURIComponent(
        lid
      )}&campaign_id=${encodeURIComponent(cid)}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      tasks.push(
        fetch(webhookUrl, {
          method: 'GET',
          headers: { 'x-original-ua': ua },
          signal: controller.signal,
        })
          .catch(() => null)
          .finally(() => clearTimeout(timer))
      );
    }

    const [imgResult] = await Promise.allSettled(tasks);

    if (imgResult.status === 'fulfilled' && imgResult.value && imgResult.value.ok) {
      const contentType = imgResult.value.headers.get('content-type') || 'image/png';
      const arrayBuf = await imgResult.value.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.status(200).send(Buffer.from(arrayBuf));
    }

    // Fallback: redirect to static asset
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.redirect(302, originUrl);
  } catch {
    return res.redirect(302, 'https://mcs.gestaologinpro.com/assets/images/wiseowe-logo.png');
  }
}
