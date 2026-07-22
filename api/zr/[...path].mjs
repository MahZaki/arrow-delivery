export default async function handler(req, res) {
  const urlPath = req.url.replace(/^\/api\/zr\//, '');
  const targetUrl = `https://api.zrexpress.app/api/v1.0/${urlPath}`;

  const headers = { Accept: 'application/json' };
  if (req.headers['x-tenant']) headers['X-Tenant'] = req.headers['x-tenant'];
  if (req.headers['x-api-key']) headers['X-Api-Key'] = req.headers['x-api-key'];

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data || undefined));
    });
    if (body) headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(targetUrl, { method: req.method, headers, body });
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const text = await response.text();
    res.end(text);
  } catch (err) {
    res.statusCode = 502;
    res.end(`ZR proxy error: ${err.message}`);
  }
}
