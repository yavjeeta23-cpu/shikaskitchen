/* Netlify Function — POST /.netlify/functions/review
   Appends a customer review to testimonials in Netlify Blobs.
*/
const { getStore } = require('@netlify/blobs');
const fs   = require('fs');
const path = require('path');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const review = JSON.parse(event.body);
    const store  = getStore('site-content');

    // Load current content (blobs first, then static fallback)
    let content;
    const existing = await store.get('content');
    if (existing) {
      content = JSON.parse(existing);
    } else {
      const staticPath = path.join(__dirname, 'content.json');
      content = JSON.parse(fs.readFileSync(staticPath, 'utf8'));
    }

    content.testimonials = content.testimonials || [];
    content.testimonials.unshift(review);

    await store.set('content', JSON.stringify(content, null, 2));

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
