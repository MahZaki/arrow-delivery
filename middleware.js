export const config = {
  matcher: '/api/zr/:path*',
};

export default async function handler(request) {
  const fullPath = request.nextUrl.pathname.replace('/api/zr/', '');
  const targetUrl = `https://api.zrexpress.app/api/v1.0/${fullPath}${request.nextUrl.search}`;

  const headers = new Headers({ Accept: 'application/json' });
  if (request.headers.get('x-tenant')) headers.set('X-Tenant', request.headers.get('x-tenant'));
  if (request.headers.get('x-api-key')) headers.set('X-Api-Key', request.headers.get('x-api-key'));

  let body;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
    if (body) headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(targetUrl, { method: request.method, headers, body: body || undefined });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
