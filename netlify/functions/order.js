/* Netlify Function — POST /.netlify/functions/order
   Appends a customer order to content.json orders[] via GitHub API.
*/
const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const OWNER = 'yavjeeta23-cpu';
const REPO  = 'shikaskitchen';
const FILE  = 'content.json';

function githubRequest(method, path, body, token) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': 'shikaskitchen-admin',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, function(res) {
      let raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'GITHUB_TOKEN not configured' })
    };
  }

  try {
    const order = JSON.parse(event.body);

    const current = await githubRequest('GET',
      '/repos/' + OWNER + '/' + REPO + '/contents/' + FILE + '?ref=main&t=' + Date.now(),
      null, token);

    if (current.status !== 200) throw new Error('Could not fetch file');

    const sha = current.body.sha;
    const content = JSON.parse(Buffer.from(current.body.content, 'base64').toString('utf8'));

    content.orders = content.orders || [];
    content.orders.unshift(order);

    const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

    await githubRequest('PUT',
      '/repos/' + OWNER + '/' + REPO + '/contents/' + FILE,
      { message: 'New customer order', content: encoded, sha: sha },
      token);

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return {
      statusCode: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
