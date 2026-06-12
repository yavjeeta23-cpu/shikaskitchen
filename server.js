/* Shika's Kitchen — local dev server (Node.js built-ins only, no npm install needed)
   Run: node server.js
   Then open: http://localhost:3000
*/
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise(function(resolve, reject) {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end',  function() { resolve(body); });
    req.on('error', reject);
  });
}

const server = http.createServer(function(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  /* ---- POST /api/save  — write full content.json ---- */
  if (req.method === 'POST' && url === '/api/save') {
    readBody(req).then(function(body) {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(path.join(ROOT, 'content.json'), JSON.stringify(data, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }).catch(function(e) {
      res.writeHead(500); res.end('Error: ' + e.message);
    });
    return;
  }

  /* ---- POST /api/review  — append a customer review ---- */
  if (req.method === 'POST' && url === '/api/review') {
    readBody(req).then(function(body) {
      try {
        const review = JSON.parse(body);
        const contentPath = path.join(ROOT, 'content.json');
        const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
        content.testimonials = content.testimonials || [];
        content.testimonials.unshift(review);
        fs.writeFileSync(contentPath, JSON.stringify(content, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }).catch(function(e) {
      res.writeHead(500); res.end('Error: ' + e.message);
    });
    return;
  }

  /* ---- Serve static files ---- */
  let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + url);
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, function() {
  console.log('');
  console.log('  Shika\'s Kitchen is running!');
  console.log('');
  console.log('  Customer page : http://localhost:' + PORT);
  console.log('  Admin panel   : http://localhost:' + PORT + '/admin.html');
  console.log('');
  console.log('  Press Ctrl+C to stop the server.');
  console.log('');
});
