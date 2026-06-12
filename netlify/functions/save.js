/* Netlify Function — POST /.netlify/functions/save
   Writes the full content JSON to Netlify Blobs.
   Called by the admin panel on every save.
*/
const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    JSON.parse(event.body); // validate JSON before storing
    const store = getStore('site-content');
    await store.set('content', event.body);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
