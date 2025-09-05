// Minimal CORS-enabled proxy without external deps
// Proxies /api/* to the upstream BreezyVoice API and sets CORS headers

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Config
const PORT = process.env.PORT ? Number(process.env.PORT) : 8089;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8001';
const UPSTREAM_BASE = process.env.UPSTREAM_BASE || 'https://cloudinfra-services.ubilink.ai/f03b5d13-c6d3-435d-9278-a5929bf9ac69/breezyvoice';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
}

function applyCORSHeadersToHeaderMap(headersMap) {
  const removeKeys = [
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'vary',
  ];
  for (const k of Object.keys(headersMap)) {
    if (removeKeys.includes(k.toLowerCase())) {
      delete headersMap[k];
    }
  }
  headersMap['Access-Control-Allow-Origin'] = FRONTEND_ORIGIN;
  headersMap['Vary'] = 'Origin';
  headersMap['Access-Control-Allow-Credentials'] = 'true';
  headersMap['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
  headersMap['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With';
}

function rewriteSetCookie(headers) {
  const cookies = headers['set-cookie'];
  if (!cookies) return;
  const rewritten = cookies.map((c) => {
    // Ensure cookie domain is localhost; strip Secure for http local if needed
    let out = c
      .replace(/;\s*Domain=[^;]*/i, '; Domain=localhost')
      .replace(/;\s*SameSite=Lax/i, '; SameSite=None') // allow cross-site with credentials
      .replace(/;\s*SameSite=Strict/i, '; SameSite=None');
    // If running proxy over http, drop Secure to allow browser to set cookie in dev
    if (!String(process.env.PROXY_TLS).toLowerCase().startsWith('t')) {
      out = out.replace(/;\s*Secure/i, '');
    }
    return out;
  });
  headers['set-cookie'] = rewritten;
}

function proxy(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCORS(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Only proxy paths under /api
  if (!req.url.startsWith('/api/')) {
    setCORS(res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const upstreamURL = new URL(UPSTREAM_BASE + req.url.replace(/^\/api/, ''));

  // Clone headers but enforce Host of upstream and drop hop-by-hop headers
  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['connection'];
  delete headers['keep-alive'];
  delete headers['proxy-authenticate'];
  delete headers['proxy-authorization'];
  delete headers['te'];
  delete headers['trailers'];
  delete headers['transfer-encoding'];
  delete headers['upgrade'];
  headers['host'] = upstreamURL.host;

  const requestOptions = {
    protocol: upstreamURL.protocol,
    hostname: upstreamURL.hostname,
    port: upstreamURL.port || (upstreamURL.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: upstreamURL.pathname + upstreamURL.search,
    headers,
  };

  const agent = upstreamURL.protocol === 'https:' ? https : http;
  const upstreamReq = agent.request(requestOptions, (upstreamRes) => {
    // Copy status and headers
    const resHeaders = { ...upstreamRes.headers };
    rewriteSetCookie(resHeaders);
    applyCORSHeadersToHeaderMap(resHeaders);
    res.writeHead(upstreamRes.statusCode || 502, resHeaders);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', (err) => {
    setCORS(res);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Upstream error', detail: String(err && err.message || err) }));
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(upstreamReq);
  } else {
    upstreamReq.end();
  }
}

const server = http.createServer(proxy);
server.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT} -> ${UPSTREAM_BASE}`);
  console.log(`Allowing origin: ${FRONTEND_ORIGIN}`);
});
