/* Netlify Function — POST /.netlify/functions/save
   Updates content.json in GitHub, which triggers Netlify to redeploy.
   Requires GITHUB_TOKEN env var set in Netlify site settings.
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
      body: JSON.stringify({ ok: false, error: 'GITHUB_TOKEN not set in environment variables' })
    };
  }

  try {
    // Validate JSON
    const newContent = JSON.parse(event.body);

    // Get current file SHA (required for update)
    const current = await githubRequest('GET',
      '/repos/' + OWNER + '/' + REPO + '/contents/' + FILE,
      null, token);

    if (current.status !== 200) {
      throw new Error('Could not fetch current file: ' + current.status);
    }

    const sha = current.body.sha;
    const encoded = Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64');

    // Update file
    const update = await githubRequest('PUT',
      '/repos/' + OWNER + '/' + REPO + '/contents/' + FILE,
      { message: 'Admin update via panel', content: encoded, sha: sha },
      token);

    if (update.status !== 200 && update.status !== 201) {
      throw new Error('GitHub update failed: ' + update.status + ' ' + JSON.stringify(update.body));
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: 'Saved — site will update in ~1 minute' })
    };
  } catch (e) {
    return {
      statusCode: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
