/* ============ SHIKA'S KITCHEN — ADMIN JS ============ */

const ADMIN_PIN = 'shika2025';
let unlocked = false;

/* ---- PIN gate ---- */
document.getElementById('pinForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const val = document.getElementById('pinInput').value;
  if (val === ADMIN_PIN) {
    unlocked = true;
    document.getElementById('pinGate').style.display = 'none';
    document.getElementById('adminApp').style.display = 'block';
    loadContent().then(initAdmin);
  } else {
    document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
    document.getElementById('pinInput').value = '';
  }
});

/* ---- Tab switching ---- */
document.querySelectorAll('.atab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.atab').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.apanel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
    if (btn.dataset.panel === 'panelAnalytics') renderAnalytics();
  });
});

/* ================================================================
   CONTENT.JSON — single source of truth
   All reads/writes go through CONTENT and the server.
   ================================================================ */

let CONTENT = {
  siteSettings: {},
  closure: { enabled: false, message: '' },
  specials: [],
  testimonials: [],
  faqs: [],
  menuOverrides: {}
};

function loadContent() {
  return fetch('content.json?' + Date.now())
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) { if (data) CONTENT = data; })
    .catch(function() { showAdminToast('Could not load content.json'); });
}

function saveContent() {
  return fetch(SAVE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CONTENT, null, 2)
  })
  .then(function(r) { return r.ok ? r.json() : null; })
  .then(function(res) {
    if (res && res.ok) {
      showAdminToast(res.message || 'Saved!');
    } else {
      showAdminToast('Save failed — ' + ((res && res.error) || 'check Netlify env vars'));
    }
  })
  .catch(function() {
    showAdminToast('Save failed — is server.js running?');
  });
}

/* ---- detect local vs live ---- */
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const SAVE_URL = IS_LOCAL ? '/api/save' : '/.netlify/functions/save';

function applyReadOnlyMode() {
  // Admin panel is fully functional on both local and live (Netlify Blobs)
  const warn = document.getElementById('localWarn');
  if (warn) warn.style.display = 'none';
}

/* ---- INIT ---- */
function initAdmin() {
  applyReadOnlyMode();
  renderMenuEditor();
  renderSpecialsEditor();
  renderClosure();
  renderHistory();
  renderAnalytics();
  renderTestimonialsEditor();
  renderFaqEditor();
  renderSettings();
}

/* ==== TAB 1: MENU EDITOR ==== */
function renderMenuEditor() {
  const ov = CONTENT.menuOverrides || {};
  const tbody = document.getElementById('menuTbody');
  tbody.innerHTML = MENU.map(function(m) {
    const o = ov[m.id] || {};
    const price     = o.price     != null ? o.price     : m.p;
    const available = o.available != null ? o.available : (m.available !== false);
    const hot       = o.hot       != null ? o.hot       : !!m.hot;
    return '<tr data-id="' + m.id + '">'
      + '<td>' + escHtml(m.n) + '</td>'
      + '<td><span class="tag ' + (m.v ? 'veg' : 'nveg') + '">' + (m.v ? 'V' : 'NV') + '</span></td>'
      + '<td><input type="number" class="price-in" value="' + price + '" min="0" step="1" style="width:80px"></td>'
      + '<td><label class="sw"><input type="checkbox" class="avail-in"' + (available ? ' checked' : '') + '><span class="sl"></span></label></td>'
      + '<td><label class="sw"><input type="checkbox" class="hot-in"'  + (hot       ? ' checked' : '') + '><span class="sl"></span></label></td>'
      + '</tr>';
  }).join('');

  tbody.addEventListener('change', function(e) {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = +tr.dataset.id;
    CONTENT.menuOverrides = CONTENT.menuOverrides || {};
    if (!CONTENT.menuOverrides[id]) CONTENT.menuOverrides[id] = {};
    CONTENT.menuOverrides[id].price     = +tr.querySelector('.price-in').value;
    CONTENT.menuOverrides[id].available =  tr.querySelector('.avail-in').checked;
    CONTENT.menuOverrides[id].hot       =  tr.querySelector('.hot-in').checked;
    saveContent();
  });

  document.getElementById('resetOverrides').addEventListener('click', function() {
    if (confirm('Reset all menu overrides to defaults?')) {
      CONTENT.menuOverrides = {};
      saveContent().then(renderMenuEditor);
    }
  });
}

/* ==== TAB 2: SPECIALS ==== */
function renderSpecialsEditor() {
  const specials = CONTENT.specials || [];
  const container = document.getElementById('specialsList');
  container.innerHTML = specials.map(function(s, i) { return specialRow(s, i); }).join('');
  wireSpecialsEvents();
}

function specialRow(s, i) {
  return '<div class="special-row" data-idx="' + i + '">'
    + '<div class="sr-fields">'
    + '<input class="s-name"  placeholder="Dish name"            value="' + escHtml(s.name  || '') + '">'
    + '<input class="s-desc"  placeholder="Short description"    value="' + escHtml(s.desc  || '') + '">'
    + '<input class="s-price" type="number" placeholder="Rs"     value="' + (s.price || '') + '">'
    + '<input class="s-badge" placeholder="Badge (e.g. Chef\'s Pick)" value="' + escHtml(s.badge || '') + '">'
    + '<input class="s-color" type="color" value="' + (s.color || '#C9A84C') + '" title="Badge colour">'
    + '</div>'
    + '<button class="del-special" data-idx="' + i + '">Remove</button>'
    + '</div>';
}

function wireSpecialsEvents() {
  document.querySelectorAll('.del-special').forEach(function(btn) {
    btn.addEventListener('click', function() {
      CONTENT.specials = CONTENT.specials || [];
      CONTENT.specials.splice(+btn.dataset.idx, 1);
      saveContent().then(renderSpecialsEditor);
    });
  });
}

document.getElementById('addSpecial')?.addEventListener('click', function() {
  CONTENT.specials = CONTENT.specials || [];
  if (CONTENT.specials.length >= 5) { showAdminToast('Maximum 5 specials.'); return; }
  CONTENT.specials.push({ name: '', desc: '', price: '', badge: 'This Weekend', color: '#C9A84C', textColor: '#1B3A2D' });
  saveContent().then(renderSpecialsEditor);
});

document.getElementById('saveSpecials')?.addEventListener('click', function() {
  const rows = document.querySelectorAll('.special-row');
  CONTENT.specials = [...rows].map(function(row) {
    return {
      name:      row.querySelector('.s-name').value.trim(),
      desc:      row.querySelector('.s-desc').value.trim(),
      price:    +row.querySelector('.s-price').value || 0,
      badge:     row.querySelector('.s-badge').value.trim() || 'This Weekend',
      color:     row.querySelector('.s-color').value,
      textColor: '#1B3A2D'
    };
  });
  saveContent();
});

/* ==== TAB 3: CLOSURE NOTICE ==== */
function renderClosure() {
  const c  = CONTENT.closure || {};
  const cb = document.getElementById('closureEnabled');
  const cm = document.getElementById('closureMsg');
  if (cb) cb.checked  = !!c.enabled;
  if (cm) cm.value    = c.message || '';
}

document.getElementById('saveClosure')?.addEventListener('click', function() {
  CONTENT.closure = {
    enabled: document.getElementById('closureEnabled')?.checked || false,
    message: (document.getElementById('closureMsg')?.value || '').trim()
  };
  saveContent().then(function() {
    showAdminToast(CONTENT.closure.enabled ? 'Closure notice is now ON.' : 'Closure notice saved (off).');
  });
});

document.getElementById('clearClosure')?.addEventListener('click', function() {
  CONTENT.closure = { enabled: false, message: '' };
  const cb = document.getElementById('closureEnabled');
  const cm = document.getElementById('closureMsg');
  if (cb) cb.checked = false;
  if (cm) cm.value = '';
  saveContent().then(function() { showAdminToast('Closure notice turned off.'); });
});

/* ==== TAB 4: ORDER HISTORY (localStorage — customer data) ==== */
function getHistory() {
  try { return JSON.parse(localStorage.getItem('shika_history') || '[]'); } catch(e) { return []; }
}

function renderHistory() {
  const hist  = getHistory();
  const tbody = document.getElementById('histTbody');
  const empty = document.getElementById('histEmpty');
  if (!hist.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  const rows = [];
  hist.forEach(function(order) {
    order.items.forEach(function(it, i) {
      rows.push('<tr>'
        + (i === 0
          ? '<td rowspan="' + order.items.length + '">' + new Date(order.date).toLocaleDateString('en-MU', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + '</td>'
          + '<td rowspan="' + order.items.length + '">' + escHtml(order.customer || '—') + '</td>'
          + '<td rowspan="' + order.items.length + '">' + escHtml(order.phone    || '—') + '</td>'
          : '')
        + '<td>' + escHtml(it.name) + '</td>'
        + '<td>' + it.qty + '</td>'
        + '<td>' + escHtml(it.note || '—') + '</td>'
        + '<td>Rs ' + it.price + '</td>'
        + '<td>Rs ' + (it.qty * it.price) + '</td>'
        + (i === 0
          ? '<td rowspan="' + order.items.length + '">' + (order.bowls ? 'Yes' : 'No') + '</td>'
          + '<td rowspan="' + order.items.length + '">Rs ' + order.total + '</td>'
          + '<td rowspan="' + order.items.length + '">' + (order.pickupDay  || '—') + '</td>'
          + '<td rowspan="' + order.items.length + '">' + (order.pickupTime || '—') + '</td>'
          : '')
        + '</tr>');
    });
  });
  tbody.innerHTML = rows.join('');
}

document.getElementById('downloadCsv')?.addEventListener('click', function() {
  const hist = getHistory();
  if (!hist.length) { showAdminToast('No orders yet.'); return; }
  const cols = ['Date','Customer','Phone','Dish','Qty','Note','UnitPrice','LineTotal','Bowls','Total','PickupDay','PickupTime'];
  const csvRows = [cols.join(',')];
  hist.forEach(function(order) {
    order.items.forEach(function(it) {
      csvRows.push([
        '"' + new Date(order.date).toLocaleString() + '"',
        '"' + (order.customer || '').replace(/"/g, '""') + '"',
        '"' + (order.phone    || '').replace(/"/g, '""') + '"',
        '"' + it.name.replace(/"/g, '""') + '"',
        it.qty,
        '"' + (it.note || '').replace(/"/g, '""') + '"',
        it.price,
        it.qty * it.price,
        order.bowls ? 'Yes' : 'No',
        order.total,
        order.pickupDay  || '',
        order.pickupTime || ''
      ].join(','));
    });
  });
  const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'shikas-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
});

document.getElementById('clearHistory')?.addEventListener('click', function() {
  if (confirm('Clear all order history? This cannot be undone.')) {
    localStorage.removeItem('shika_history');
    renderHistory();
    showAdminToast('History cleared.');
  }
});

/* ==== TAB 5: ANALYTICS ==== */
function renderAnalytics() {
  const hist    = getHistory();
  const summary = document.getElementById('analyticsSummary');
  if (!hist.length) {
    if (summary) summary.innerHTML = '<p style="color:var(--muted);font-style:italic">No order history yet.</p>';
    return;
  }
  const dishCount  = {};
  const catRevenue = {};
  const dayCount   = { Saturday: 0, Sunday: 0, Other: 0 };
  let totalRevenue = 0;

  hist.forEach(function(order) {
    const day = order.pickupDay || 'Other';
    if (day === 'Saturday') dayCount.Saturday++;
    else if (day === 'Sunday') dayCount.Sunday++;
    else dayCount.Other++;
    totalRevenue += order.total || 0;
    order.items.forEach(function(it) {
      dishCount[it.name] = (dishCount[it.name] || 0) + it.qty;
      const m   = MENU.find(function(x) { return x.id === it.id || x.n === it.name; });
      const cat = m ? m.c : 'other';
      catRevenue[cat] = (catRevenue[cat] || 0) + (it.price * it.qty);
    });
  });

  if (summary) summary.innerHTML =
    '<b>Total Orders:</b> ' + hist.length + '<br>'
    + '<b>Total Revenue:</b> Rs ' + totalRevenue + '<br>'
    + '<b>This Month:</b> Rs ' + hist.filter(function(o) {
        const d = new Date(o.date); const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce(function(s, o) { return s + (o.total || 0); }, 0) + '<br>'
    + '<b>Avg Order Value:</b> Rs ' + Math.round(totalRevenue / hist.length);

  drawBarChart('chartTop', Object.entries(dishCount).sort(function(a,b){return b[1]-a[1];}).slice(0,8), '#C9A84C');
  drawDonutChart('chartCat', Object.entries(catRevenue).sort(function(a,b){return b[1]-a[1];}));
  drawBarChart('chartDay', [['Saturday', dayCount.Saturday], ['Sunday', dayCount.Sunday], ['Other', dayCount.Other]], '#1B3A2D');
}

function drawBarChart(canvasId, data, color) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!data.length) return;
  const max  = Math.max.apply(null, data.map(function(d) { return d[1]; }));
  const barH = Math.floor((H - 30) / data.length) - 6;
  const pad  = 120;
  ctx.fillStyle = '#F5F0E8'; ctx.fillRect(0, 0, W, H);
  data.forEach(function(d, i) {
    const y  = i * (barH + 6) + 8;
    const bw = max > 0 ? Math.round(((W - pad - 10) * d[1]) / max) : 0;
    ctx.fillStyle = color;
    ctx.fillRect(pad, y, bw, barH);
    ctx.fillStyle = '#2A2A24'; ctx.font = '11px Arial,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(d[0].length > 16 ? d[0].slice(0, 14) + '..' : d[0], pad - 6, y + barH / 2 + 4);
    ctx.fillStyle = '#6E6A5E'; ctx.textAlign = 'left';
    ctx.fillText(d[1], pad + bw + 5, y + barH / 2 + 4);
  });
}

function drawDonutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!data.length) return;
  const total = data.reduce(function(s, d) { return s + d[1]; }, 0);
  if (!total) return;
  const colors = ['#C9A84C','#1B3A2D','#A8412F','#5E7D6A','#D9BE74','#2D5A3D','#8FB78A','#F5E3DE'];
  const cx = W / 2 - 40, cy = H / 2, r = Math.min(cx, cy) - 10, ir = r * 0.55;
  let angle = -Math.PI / 2;
  ctx.fillStyle = '#F5F0E8'; ctx.fillRect(0, 0, W, H);
  data.forEach(function(d, i) {
    const slice = (d[1] / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + slice); ctx.closePath();
    ctx.fillStyle = colors[i % colors.length]; ctx.fill();
    angle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.font = '11px Arial,sans-serif';
  data.slice(0, 6).forEach(function(d, i) {
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(W - 75, 14 + i * 20, 12, 12);
    ctx.fillStyle = '#2A2A24'; ctx.textAlign = 'left';
    ctx.fillText((d[0] || '').slice(0, 8), W - 58, 24 + i * 20);
  });
}

/* ==== TAB 6: TESTIMONIALS ==== */
function renderTestimonialsEditor() {
  const container = document.getElementById('testimonialsEditor'); if (!container) return;
  const data = CONTENT.testimonials || [];
  container.innerHTML = data.map(function(t, i) {
    return '<div class="special-row" data-idx="' + i + '" style="margin-bottom:12px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 80px 1fr 44px;gap:10px;align-items:center">'
      + '<input class="t-name"  placeholder="Customer name"  value="' + escHtml(t.name  || '') + '" style="padding:9px 12px;border:1px solid rgba(201,168,76,.4);font-family:\'Lato\',sans-serif;font-size:.9rem;outline:none;width:100%">'
      + '<input class="t-date"  placeholder="e.g. May 2025"  value="' + escHtml(t.date  || '') + '" style="padding:9px 12px;border:1px solid rgba(201,168,76,.4);font-family:\'Lato\',sans-serif;font-size:.9rem;outline:none;width:100%">'
      + '<input class="t-stars" type="number" min="1" max="5" value="' + (t.stars || 5)        + '" style="padding:9px 8px;border:1px solid rgba(201,168,76,.4);font-family:\'Lato\',sans-serif;font-size:.9rem;outline:none;width:100%">'
      + '<input class="t-quote" placeholder="Review text"    value="' + escHtml(t.quote || '') + '" style="padding:9px 12px;border:1px solid rgba(201,168,76,.4);font-family:\'Lato\',sans-serif;font-size:.9rem;outline:none;width:100%">'
      + '<button class="del-special" data-idx="' + i + '">X</button>'
      + '</div></div>';
  }).join('');
  container.querySelectorAll('.del-special').forEach(function(btn) {
    btn.addEventListener('click', function() {
      CONTENT.testimonials = CONTENT.testimonials || [];
      CONTENT.testimonials.splice(+btn.dataset.idx, 1);
      saveContent().then(renderTestimonialsEditor);
    });
  });
}

document.getElementById('addTestimonial')?.addEventListener('click', function() {
  CONTENT.testimonials = CONTENT.testimonials || [];
  CONTENT.testimonials.push({ name: '', quote: '', stars: 5, date: '' });
  saveContent().then(renderTestimonialsEditor);
});

document.getElementById('saveTestimonials')?.addEventListener('click', function() {
  const rows = document.querySelectorAll('#testimonialsEditor .special-row');
  CONTENT.testimonials = [...rows].map(function(r) {
    return {
      name:  r.querySelector('.t-name').value.trim(),
      quote: r.querySelector('.t-quote').value.trim(),
      stars: +r.querySelector('.t-stars').value || 5,
      date:  r.querySelector('.t-date').value.trim()
    };
  });
  saveContent();
});

document.getElementById('resetTestimonials')?.addEventListener('click', function() {
  if (confirm('Clear all reviews?')) {
    CONTENT.testimonials = [];
    saveContent().then(renderTestimonialsEditor);
  }
});

/* ==== TAB 7: FAQ ==== */
function renderFaqEditor() {
  const container = document.getElementById('faqEditor'); if (!container) return;
  const data = CONTENT.faqs || [];
  container.innerHTML = data.map(function(f, i) {
    return '<div class="special-row" data-idx="' + i + '" style="margin-bottom:12px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 44px;gap:10px;align-items:center">'
      + '<input class="fq-q" placeholder="Question" value="' + escHtml(f.q || '') + '" style="padding:9px 12px;border:1px solid rgba(201,168,76,.4);font-family:\'Lato\',sans-serif;font-size:.9rem;outline:none;width:100%">'
      + '<input class="fq-a" placeholder="Answer"   value="' + escHtml(f.a || '') + '" style="padding:9px 12px;border:1px solid rgba(201,168,76,.4);font-family:\'Lato\',sans-serif;font-size:.9rem;outline:none;width:100%">'
      + '<button class="del-special fq-del" data-idx="' + i + '">X</button>'
      + '</div></div>';
  }).join('');
  container.querySelectorAll('.fq-del').forEach(function(btn) {
    btn.addEventListener('click', function() {
      CONTENT.faqs = CONTENT.faqs || [];
      CONTENT.faqs.splice(+btn.dataset.idx, 1);
      saveContent().then(renderFaqEditor);
    });
  });
}

document.getElementById('addFaq')?.addEventListener('click', function() {
  CONTENT.faqs = CONTENT.faqs || [];
  CONTENT.faqs.push({ q: '', a: '' });
  saveContent().then(renderFaqEditor);
});

document.getElementById('saveFaq')?.addEventListener('click', function() {
  const rows = document.querySelectorAll('#faqEditor .special-row');
  CONTENT.faqs = [...rows].map(function(r) {
    return { q: r.querySelector('.fq-q').value.trim(), a: r.querySelector('.fq-a').value.trim() };
  }).filter(function(f) { return f.q; });
  saveContent();
});

document.getElementById('resetFaq')?.addEventListener('click', function() {
  if (confirm('Reset FAQ to defaults from data.js?')) {
    CONTENT.faqs = DEFAULT_FAQS.slice();
    saveContent().then(renderFaqEditor);
  }
});

/* ==== TAB 8: SETTINGS ==== */
function renderSettings() {
  const ss = CONTENT.siteSettings || {};
  const wa  = document.getElementById('settingWA');        if (wa)   wa.value   = ss.waNumber || '';
  const mo  = document.getElementById('settingMinOrder');  if (mo)   mo.value   = ss.minOrder || '';
  const days= document.getElementById('settingDays');      if (days) days.value  = (ss.collectionDays  || []).join(',');
  const times=document.getElementById('settingTimes');     if (times)times.value = (ss.collectionTimes || []).join(',');
  const dotw= document.getElementById('settingDotw');      if (dotw) dotw.value  = ss.dishOfWeekend != null ? ss.dishOfWeekend : '';

  const sl = CONTENT.socialLinks || {};
  const fb = document.getElementById('socialFacebook');  if (fb)  fb.value  = sl.facebook  || '';
  const ig = document.getElementById('socialInstagram'); if (ig)  ig.value  = sl.instagram || '';
  const tt = document.getElementById('socialTiktok');    if (tt)  tt.value  = sl.tiktok    || '';
  const tw = document.getElementById('socialTwitter');   if (tw)  tw.value  = sl.twitter   || '';
}

document.getElementById('saveSettings')?.addEventListener('click', function() {
  const waVal    = (document.getElementById('settingWA')?.value       || '').trim().replace(/\D/g,'');
  const mo       =  document.getElementById('settingMinOrder')?.value;
  const daysVal  = (document.getElementById('settingDays')?.value     || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
  const timesVal = (document.getElementById('settingTimes')?.value    || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
  const dotwVal  =  document.getElementById('settingDotw')?.value;
  CONTENT.siteSettings = {};
  if (waVal)              CONTENT.siteSettings.waNumber       = waVal;
  if (mo)                 CONTENT.siteSettings.minOrder        = +mo;
  if (daysVal.length)     CONTENT.siteSettings.collectionDays  = daysVal;
  if (timesVal.length)    CONTENT.siteSettings.collectionTimes = timesVal;
  if (dotwVal !== '' && dotwVal != null) CONTENT.siteSettings.dishOfWeekend = +dotwVal;

  CONTENT.socialLinks = {
    facebook:  (document.getElementById('socialFacebook')?.value  || '').trim(),
    instagram: (document.getElementById('socialInstagram')?.value || '').trim(),
    tiktok:    (document.getElementById('socialTiktok')?.value    || '').trim(),
    twitter:   (document.getElementById('socialTwitter')?.value   || '').trim()
  };

  saveContent();
});

document.getElementById('resetSettings')?.addEventListener('click', function() {
  if (confirm('Reset all site settings to defaults?')) {
    CONTENT.siteSettings = {};
    saveContent().then(renderSettings);
  }
});

/* ---- helpers ---- */
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showAdminToast(msg) {
  const t = document.getElementById('adminToast'); if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(function() { t.style.opacity = '0'; }, 2600);
}
