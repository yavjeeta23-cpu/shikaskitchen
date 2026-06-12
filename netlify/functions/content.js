/* Netlify Function — GET /.netlify/functions/content
   Returns the current content.json from Netlify Blobs,
   falling back to the static content.json if nothing has been saved yet.
*/
const { getStore } = require('@netlify/blobs');
const fs   = require('fs');
const path = require('path');

exports.handler = async function() {
  try {
    const store = getStore('site-content');
    const data  = await store.get('content');
    if (data) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: data
      };
    }
    // First-time fallback: serve the static content.json bundled with the deploy
    const staticPath = path.join(__dirname, 'content.json');
    const staticData = fs.readFileSync(staticPath, 'utf8');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: staticData
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
