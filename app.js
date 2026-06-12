/* ============ SHIKA'S KITCHEN — APP JS ============ */

/* ---- constants ---- */
const WA_DEFAULT = '23058290809';
const MIN_ORDER   = 200;
const MAX_PORTIONS = 25;

/* ---- site settings (overridable from admin) ---- */
/* ---- content source ---- */
let _siteContent = null;
const _isLocal   = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const _saveUrl   = _isLocal ? '/api/save'   : '/.netlify/functions/save';
const _reviewUrl = _isLocal ? '/api/review' : '/.netlify/functions/review';
const _orderUrl  = _isLocal ? '/api/order'  : '/.netlify/functions/order';

function getSiteSettings(){
  return (_siteContent && _siteContent.siteSettings) || {};
}
function getOverridesFromContent(){
  return (_siteContent && _siteContent.menuOverrides) || {};
}

/* ---- utility ---- */
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function qs(sel,ctx){ return (ctx||document).querySelector(sel); }
function qsa(sel,ctx){ return [...(ctx||document).querySelectorAll(sel)]; }
function showToast(msg,dur){
  dur = dur||2600;
  const t=qs('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._to); t._to=setTimeout(()=>t.classList.remove('show'),dur);
}

/* ---- language ---- */

/* ---- dark mode ---- */

/* ---- overrides from admin ---- */
function getOverrides(){ return getOverridesFromContent(); }


/* ---- specials ---- */
function initSpecials(){
  const specials = (_siteContent && _siteContent.specials) || [];
  const sec = qs('#specials'); if(!sec) return;
  if(!specials.length){ sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  const strip = qs('#specialsStrip'); if(!strip) return;
  strip.innerHTML = specials.filter(function(s){return s.name;}).map(function(s){
    return '<div class="special-card">'
      +'<div class="special-badge" style="background:'+escHtml(s.color||'#C9A84C')+';color:'+escHtml(s.textColor||'#1B3A2D')+'">'+escHtml(s.badge||'This Weekend')+'</div>'
      +'<h3>'+escHtml(s.name)+'</h3>'
      +'<p>'+escHtml(s.desc||'')+'</p>'
      +(s.price?'<div class="sp">Rs '+s.price+'</div>':'')
      +'</div>';
  }).join('');
}

/* ---- cart state ---- */
let picked = new Map();
function saveCart(){
  const obj={};
  picked.forEach(function(v,k){ obj[k]=v; });
  localStorage.setItem('shika_cart', JSON.stringify({ts:Date.now(),items:obj}));
}
function loadCart(){
  try{
    const raw = JSON.parse(localStorage.getItem('shika_cart')||'null');
    if(!raw) return;
    if(Date.now()-raw.ts > 7*86400000){ localStorage.removeItem('shika_cart'); return; }
    Object.entries(raw.items||{}).forEach(function(entry){ picked.set(+entry[0],entry[1]); });
  }catch(e){}
}

/* ---- order history ---- */
function getHistory(){ try{ return JSON.parse(localStorage.getItem('shika_history')||'[]'); }catch(e){ return[]; } }
function getPrevIds(){ return new Set(getHistory().flatMap(function(o){return o.items.map(function(i){return i.id;});})); }

/* ---- search & filter state ---- */
let searchQ = '';
let activeTab = 'all';
let activeAllergens = new Set();
let showVegOnly = false;
let dotw = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

/* ---- build merged menu with overrides ---- */
function buildMergedMenu(){
  const ov = getOverrides();
  const ss = getSiteSettings();
  dotw = ss.dishOfWeekend != null ? +ss.dishOfWeekend : null;
  return MENU.map(function(m){
    const o = ov[m.id]||{};
    return Object.assign({},m,{
      p: o.price != null ? o.price : m.p,
      available: o.available != null ? o.available : (m.available !== false),
      hot: o.hot != null ? o.hot : !!m.hot,
    });
  });
}

let mergedMenu = [];

/* ---- tabs ---- */
function buildTabs(){
  const tabsEl = qs('#menuTabs'); if(!tabsEl) return;
  const tabData = [{id:'all', name:'All'}].concat(CATS);
  tabsEl.innerHTML = tabData.map(function(c){
    return '<button class="tab'+(c.id==='all'?' active':'')+'" data-cat="'+c.id+'">'
      +'<span class="tab-label">'+escHtml(c.name)+'</span>'
      +'<span class="tcount" id="tc_'+c.id+'"></span></button>';
  }).join('');
  tabsEl.addEventListener('click',function(e){
    const btn = e.target.closest('.tab'); if(!btn) return;
    activeTab = btn.dataset.cat;
    currentPage = 1;
    qsa('.tab',tabsEl).forEach(function(b){ b.classList.toggle('active',b.dataset.cat===activeTab); });
    renderGrid();
  });
}

function updateTabCounts(filtered){
  const all = qs('#tc_all');
  if(all) all.textContent = filtered.length ? ' ('+filtered.length+')' : '';
  CATS.forEach(function(c){
    const el = qs('#tc_'+c.id);
    if(!el) return;
    const n = filtered.filter(function(m){return m.c===c.id;}).length;
    el.textContent = ' ('+n+')';
  });
}

/* ---- allergen filter ---- */
function buildAllergenFilter(){
  const af = qs('#allergenFilter'); if(!af) return;
  const tags = ['dairy','gluten','seafood','spicy','nuts'];
  af.innerHTML = tags.map(function(t){
    return '<button class="atag-btn" data-tag="'+t+'">'+t.charAt(0).toUpperCase()+t.slice(1)+'-free</button>';
  }).join('');
  af.addEventListener('click',function(e){
    const btn = e.target.closest('.atag-btn'); if(!btn) return;
    const tag = btn.dataset.tag;
    if(activeAllergens.has(tag)){ activeAllergens.delete(tag); btn.classList.remove('active'); }
    else { activeAllergens.add(tag); btn.classList.add('active'); }
    renderGrid();
  });
}

/* ---- search highlight ---- */
function hlText(text, q){
  if(!q) return escHtml(text);
  const re = new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')', 'gi');
  return escHtml(text).replace(re,'<mark class="hl">$1</mark>');
}

/* ---- filter menu ---- */
function filterMenu(){
  return mergedMenu.filter(function(m){
    if(activeTab!=='all' && m.c!==activeTab) return false;
    if(showVegOnly && !m.v) return false;
    if(activeAllergens.size>0){
      const tags = m.tags||[];
      for(const a of activeAllergens){ if(tags.includes(a)) return false; }
    }
    if(searchQ){
      const q = searchQ.toLowerCase();
      const hit = m.n.toLowerCase().includes(q)||(m.d||'').toLowerCase().includes(q);
      if(!hit) return false;
    }
    return true;
  });
}

/* ---- category banner ---- */
function catBannerHtml(catId){
  if(catId==='all') return '';
  const cat = CATS.find(function(c){return c.id===catId;}); if(!cat) return '';
  return '<div class="cat-banner" style="background:'+(cat.color||'#1B3A2D')+'">'
    +'<div class="cat-banner-abbr">'+escHtml(cat.abbr||cat.name.slice(0,2).toUpperCase())+'</div>'
    +'<div class="cat-banner-text"><h3>'+escHtml(cat.name)+'</h3><em>'+escHtml(cat.tag||'')+'</em></div>'
    +'</div>';
}

/* ---- dish card ---- */
function dishCard(m, prevIds){
  const inCart = picked.has(m.id);
  const qty = inCart ? picked.get(m.id).qty : 0;
  const isWeekend = m.id===dotw;
  const isPrev = prevIds.has(m.id);
  const serves = m.serves ? '<span class="dish-serves">Serves '+escHtml(m.serves)+'</span>' : '';
  const tags = m.tags||[];
  const isSpicy = tags.includes('spicy');
  const otherTags = tags.filter(function(t){ return t!=='spicy'; });
  const allergenHtml = otherTags.length
    ? '<div class="dish-allergens">'+otherTags.map(function(t){return '<span class="allergen-tag at-'+t+'">'+t+'</span>';}).join('')+'</div>'
    : '';
  const badgeHtml = [
    isWeekend ? '<div class="badge-weekend">Weekend Pick</div>' : '',
    isPrev ? '<div class="badge-prev">Ordered before</div>' : '',
  ].filter(Boolean).join('');
  const currentSpice = (picked.get(m.id)||{}).spice||'medium';
  const spiceHtml = isSpicy
    ? '<div class="spice-picker" data-id="'+m.id+'">'
      +'<span class="spice-label">Spice:</span>'
      +'<button class="spice-btn'+(currentSpice==='mild'?' active':'')+'" data-spice="mild" data-id="'+m.id+'">Mild</button>'
      +'<button class="spice-btn'+(currentSpice==='medium'?' active':'')+'" data-spice="medium" data-id="'+m.id+'">Medium</button>'
      +'<button class="spice-btn'+(currentSpice==='hot'?' active':'')+'" data-spice="hot" data-id="'+m.id+'">Hot</button>'
      +'</div>'
    : '';
  const qtyHtml = qty>0
    ? '<div class="qty"><button class="q-dec" data-id="'+m.id+'">-</button><span>'+qty+'</span><button class="q-inc" data-id="'+m.id+'">+</button></div>'
    : '<button class="add-btn" data-id="'+m.id+'">Add</button>';
  const nameHl = hlText(m.n, searchQ);
  const descHl = hlText(m.d||'', searchQ);
  return '<div class="dish'+(inCart?' picked':'')+(m.available===false?' unavailable':'')+(isWeekend?' weekend-pick':'')+' reveal" data-id="'+m.id+'" data-cat="'+m.c+'">'
    +badgeHtml
    +'<div class="dish-inner">'
    +'<div class="dish-top"><div>'
    +'<div class="dish-name">'+nameHl+'</div>'
    +serves+allergenHtml
    +'</div>'
    +'<span class="vnv '+(m.v?'v':'nv')+'">'+(m.v?'V':'NV')+'</span>'
    +'</div>'
    +'<p class="dish-desc">'+descHl+'</p>'
    +spiceHtml
    +'<div class="dish-bottom">'
    +'<span class="dish-price'+(m.from?' from':'')+'">Rs '+m.p+'</span>'
    +'<div class="dish-actions">'+qtyHtml+'</div>'
    +'</div></div></div>';
}

/* ---- skeleton cards ---- */
function skeletonCards(n){
  n=n||6;
  return Array.from({length:n},function(){
    return '<div class="skeleton-card reveal"><div class="skel-img"></div><div class="skel-line"></div><div class="skel-line short"></div></div>';
  }).join('');
}

/* ---- render grid ---- */
function renderGrid(delay){
  const grid = qs('#menuGrid'); if(!grid) return;
  const filtered = filterMenu();
  updateTabCounts(filtered);
  const countEl = qs('#searchCount');
  if(countEl){
    countEl.textContent = searchQ ? filtered.length+' dish'+(filtered.length!==1?'es':'')+' found' : '';
  }
  const prevIds = getPrevIds();
  const bannerHtml = catBannerHtml(activeTab);

  function doRender(){
    if(!filtered.length){
      grid.innerHTML = bannerHtml+'<div class="no-results">No dishes found. Try adjusting your search or filters.</div>';
      renderPagination(0, 0);
      return;
    }
    let html = bannerHtml;
    if(activeTab==='all'){
      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
      if(currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage-1)*ITEMS_PER_PAGE;
      const pageItems = filtered.slice(start, start+ITEMS_PER_PAGE);
      html += pageItems.map(function(m){return dishCard(m,prevIds);}).join('');
      renderPagination(currentPage, totalPages);
    } else {
      html += filtered.map(function(m){return dishCard(m,prevIds);}).join('');
      renderPagination(0, 0);
    }
    grid.innerHTML = html;
    requestAnimationFrame(function(){
      qsa('.dish.reveal, .skeleton-card.reveal',grid).forEach(function(el,i){
        setTimeout(function(){el.classList.add('shown');},Math.min(i*40,400));
      });
    });
    attachReveal();
    updateCartHighlight();
  }
  if(delay){
    grid.innerHTML = skeletonCards(6);
    setTimeout(doRender, delay);
  } else {
    doRender();
  }
}

/* ---- pagination ---- */
function renderPagination(page, total){
  const el = qs('#menuPagination'); if(!el) return;
  if(total <= 1){ el.innerHTML = ''; return; }
  let html = '';
  html += '<button class="pg-btn" data-pg="'+(page-1)+'"'+(page<=1?' disabled':'')+'>Prev</button>';
  for(var i=1;i<=total;i++){
    html += '<button class="pg-btn'+(i===page?' active':'')+'" data-pg="'+i+'">'+i+'</button>';
  }
  html += '<button class="pg-btn" data-pg="'+(page+1)+'"'+(page>=total?' disabled':'')+'>Next</button>';
  el.innerHTML = html;
}

function initPagination(){
  const el = qs('#menuPagination'); if(!el) return;
  el.addEventListener('click', function(e){
    const btn = e.target.closest('.pg-btn');
    if(!btn || btn.disabled) return;
    const pg = +btn.dataset.pg;
    if(pg < 1) return;
    currentPage = pg;
    renderGrid();
    qs('#menu')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
}

/* ---- cart highlight ---- */
function updateCartHighlight(){
  qsa('.dish').forEach(function(el){
    const id=+el.dataset.id;
    el.classList.toggle('picked',picked.has(id));
    const qty = picked.has(id)?picked.get(id).qty:0;
    const actions = qs('.dish-actions',el); if(!actions) return;
    if(qty>0){
      actions.innerHTML='<div class="qty"><button class="q-dec" data-id="'+id+'">-</button><span>'+qty+'</span><button class="q-inc" data-id="'+id+'">+</button></div>';
    } else {
      actions.innerHTML='<button class="add-btn" data-id="'+id+'">Add</button>';
    }
  });
}

/* ---- grid click delegation ---- */
function attachGridEvents(){
  const grid = qs('#menuGrid'); if(!grid) return;
  grid.addEventListener('click',function(e){
    const add = e.target.closest('.add-btn');
    if(add){ cartAdd(+add.dataset.id); return; }
    const inc = e.target.closest('.q-inc');
    if(inc){ cartInc(+inc.dataset.id); return; }
    const dec = e.target.closest('.q-dec');
    if(dec){ cartDec(+dec.dataset.id); return; }
    const spiceBtn = e.target.closest('.spice-btn');
    if(spiceBtn){
      const id = +spiceBtn.dataset.id;
      const spice = spiceBtn.dataset.spice;
      const entry = picked.get(id);
      if(entry){ entry.spice = spice; saveCart(); }
      const picker = spiceBtn.closest('.spice-picker');
      if(picker) picker.querySelectorAll('.spice-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.spice===spice); });
      return;
    }
    const gallery = e.target.closest('[data-gallery]');
    if(gallery){ openGallery(+gallery.dataset.gallery); return; }
  });
  grid.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key===' '){
      const gallery = e.target.closest('[data-gallery]');
      if(gallery){ e.preventDefault(); openGallery(+gallery.dataset.gallery); }
    }
  });
}

/* ---- cart operations ---- */
function cartAdd(id){
  const m = mergedMenu.find(function(x){return x.id===id;}); if(!m) return;
  if(picked.has(id)){ cartInc(id); return; }
  const isSpicy = (m.tags||[]).includes('spicy');
  picked.set(id,{qty:1,note:'',spice:isSpicy?'medium':null});
  saveCart(); renderDrawer(); updateCartHighlight(); bumpBadge();
  suggestCombo(id);
}
function totalPortions(){
  return [...picked.values()].reduce(function(s,v){return s+v.qty;},0);
}
function cartInc(id){
  if(!picked.has(id)){ cartAdd(id); return; }
  const item=picked.get(id);
  if(item.qty>=MAX_PORTIONS){ showToast('Maximum of '+MAX_PORTIONS+' portions of the same dish reached.'); return; }
  item.qty++;
  saveCart(); renderDrawer(); updateCartHighlight(); bumpBadge();
}
function cartDec(id){
  if(!picked.has(id)) return;
  const item=picked.get(id);
  if(item.qty<=1){ picked.delete(id); }
  else { item.qty--; }
  saveCart(); renderDrawer(); updateCartHighlight(); bumpBadge();
}
function cartRemove(id){ picked.delete(id); saveCart(); renderDrawer(); updateCartHighlight(); bumpBadge(); }

function bumpBadge(){
  const badge=qs('#cartBadge'); if(!badge) return;
  const total=[...picked.values()].reduce(function(s,v){return s+v.qty;},0);
  badge.textContent=total||'';
  badge.classList.remove('bump');
  void badge.offsetWidth;
  if(total) badge.classList.add('bump');
  updateStickyCart();
}

/* ---- combo suggestions ---- */
function suggestCombo(id){
  const m = mergedMenu.find(function(x){return x.id===id;}); if(!m) return;
  const pairs = (PAIRINGS[m.c]||[]).filter(function(pid){return pid!==id && !picked.has(pid);});
  if(!pairs.length) return;
  const suggestions = pairs.slice(0,3).map(function(pid){return mergedMenu.find(function(x){return x.id===pid;});}).filter(Boolean);
  if(!suggestions.length) return;
  const existing = qs('#comboSuggest');
  if(existing) existing.remove();
  const div = document.createElement('div');
  div.className='combo-suggest'; div.id='comboSuggest';
  div.innerHTML='<p>Pairs well with:</p><div class="combo-items">'
    +suggestions.map(function(s){return '<button class="combo-add" data-id="'+s.id+'">'+escHtml(s.n)+' — Rs '+s.p+'</button>';}).join('')
    +'</div>';
  const cartItems = qs('#cartItems');
  if(cartItems) cartItems.after(div);
  div.addEventListener('click',function(e){
    const btn=e.target.closest('.combo-add'); if(!btn) return;
    const sid=+btn.dataset.id;
    cartAdd(sid);
    div.remove();
    const sm=mergedMenu.find(function(x){return x.id===sid;});
    showToast((sm?sm.n:'Item')+' added to order.');
  });
}

/* ---- cart drawer ---- */
let selectedDay='', selectedTime='';
function openCart(){
  qs('#backdrop')?.classList.add('show');
  qs('#cartDrawer')?.classList.add('open');
  document.body.style.overflow='hidden';
  renderDrawer();
}
function closeCart(){
  qs('#backdrop')?.classList.remove('show');
  qs('#cartDrawer')?.classList.remove('open');
  document.body.style.overflow='';
}

function renderDrawer(){
  const body=qs('#drawerBody'); if(!body) return;
  const itemsHtml=[...picked.entries()].map(function(entry){
    const id=entry[0], v=entry[1];
    const m=mergedMenu.find(function(x){return x.id===id;}); if(!m) return '';
    return '<li data-id="'+id+'">'
      +'<div class="ci-top">'
      +'<div class="ci-name">'+escHtml(m.n)+' <span class="vnv '+(m.v?'v':'nv')+'">'+(m.v?'V':'NV')+'</span></div>'
      +'<div class="ci-sub">Rs '+(m.p*v.qty)+'</div>'
      +'</div>'
      +'<p class="ci-desc">'+escHtml(m.d||'')+'</p>'
      +'<div class="ci-bottom">'
      +'<div class="qty-pill">'
      +'<button class="ci-dec" data-id="'+id+'">-</button>'
      +'<span>'+v.qty+'</span>'
      +'<button class="ci-inc" data-id="'+id+'">+</button>'
      +'</div>'
      +'<button class="ci-trash" data-id="'+id+'" aria-label="Remove">'
      +'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
      +'</button>'
      +'</div>'
      +'<button class="ci-note-toggle" data-id="'+id+'">'+(v.note?'Edit note':'Add note')+'</button>'
      +(v.note?'<textarea class="ci-note" data-id="'+id+'" rows="2">'+escHtml(v.note)+'</textarea>':'')
      +'</li>';
  }).join('');

  let subtotal=0;
  picked.forEach(function(v,id){
    const m=mergedMenu.find(function(x){return x.id===id;}); if(m) subtotal+=m.p*v.qty;
  });
  const bowlChecked = qs('#bowlToggle')?.checked;
  const bowlFee = bowlChecked ? 25 * totalPortions() : 0;
  const total = subtotal+bowlFee;
  const under = (subtotal+bowlFee)<MIN_ORDER;
  const portions = totalPortions();
  const atMax = false;

  if(!picked.size){
    const hist=getHistory();
    const reorderBtn = hist.length ? '<div class="quick-reorder"><button id="reorderBtn">Reorder last order</button></div>' : '';
    body.innerHTML='<div class="cart-empty">'
      +'<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'
      +'<p>Your order is empty.</p>'
      +'<a href="#menu" onclick="closeCart()">Browse the menu</a>'
      +'</div>'+reorderBtn;
    qs('#reorderBtn')?.addEventListener('click',quickReorder);
  } else {
    body.innerHTML='<ul class="cart-items" id="cartItems">'+itemsHtml+'</ul>';
    wireCartItemEvents();
  }
  const mn=qs('#minOrderNotice');
  if(mn) mn.classList.toggle('show', under && picked.size>0);
  const mx=qs('#maxPortionNotice');
  if(mx){ mx.classList.toggle('show', atMax); mx.textContent='Maximum of '+MAX_PORTIONS+' portions reached. Remove an item to continue.'; }
  const pc=qs('#portionCount');
  if(pc && picked.size>0) pc.textContent=portions+' / '+MAX_PORTIONS+' portions';
  const sumSub=qs('#sumSub'); if(sumSub) sumSub.textContent='Rs '+subtotal;
  const sumBowlRow=qs('#sumBowlRow'); if(sumBowlRow) sumBowlRow.style.display=bowlFee?'':'none';
  const sumBowl=qs('#sumBowl'); if(sumBowl) sumBowl.textContent='Rs '+bowlFee;
  const sumTotal=qs('#sumTotal'); if(sumTotal) sumTotal.textContent='Rs '+total;
  const sendBtn=qs('#sendWA');
  if(sendBtn){
    const ok=picked.size>0 && !under && !atMax;
    sendBtn.disabled=!ok;
    sendBtn.classList.toggle('ready',ok);
  }
  updateStickyCart();
}

function wireCartItemEvents(){
  const body=qs('#drawerBody'); if(!body) return;
  body.addEventListener('click',function(e){
    const inc=e.target.closest('.ci-inc'); if(inc){ cartInc(+inc.dataset.id); return; }
    const dec=e.target.closest('.ci-dec'); if(dec){ cartDec(+dec.dataset.id); return; }
    const tr=e.target.closest('.ci-trash'); if(tr){ cartRemove(+tr.dataset.id); return; }
    const nt=e.target.closest('.ci-note-toggle');
    if(nt){
      const id=+nt.dataset.id;
      const li=nt.closest('li');
      let ta=qs('.ci-note',li);
      if(ta){ ta.remove(); nt.textContent='Add note'; }
      else {
        ta=document.createElement('textarea');
        ta.className='ci-note'; ta.dataset.id=id; ta.rows=2;
        ta.value=picked.get(id)?.note||'';
        nt.after(ta); ta.focus();
        nt.textContent='Hide note';
        ta.addEventListener('input',function(){
          const item=picked.get(id); if(item){ item.note=ta.value; saveCart(); }
        });
      }
      return;
    }
  });
}

/* ---- quick reorder ---- */
function quickReorder(){
  const hist=getHistory(); if(!hist.length) return;
  const last=hist[hist.length-1];
  picked.clear();
  last.items.forEach(function(it){
    const m=mergedMenu.find(function(x){return x.id===it.id||x.n===it.name;});
    if(m && m.available!==false) picked.set(m.id,{qty:it.qty,note:it.note||''});
  });
  saveCart(); renderDrawer(); updateCartHighlight(); bumpBadge();
  showToast('Last order restored.');
}

/* ---- slot selection ---- */
function initSlots(){
  const grid=qs('#slotGrid'); if(!grid) return;
  const ss=getSiteSettings();
  const days = ss.collectionDays || ['Saturday','Sunday'];
  const times = ss.collectionTimes || ['11:30 AM – 12:30 PM','12:30 PM – 1:30 PM','5:30 PM – 6:30 PM','6:30 PM – 7:30 PM','7:30 PM – 8:00 PM'];
  const pillsHtml = days.reduce(function(acc,day){
    return acc + times.map(function(t){
      return '<button class="pill" data-day="'+day+'" data-time="'+t+'">'+day+' '+t+'</button>';
    }).join('');
  },'');
  grid.innerHTML=pillsHtml;
  grid.addEventListener('click',function(e){
    const pill=e.target.closest('.pill'); if(!pill) return;
    qsa('.pill',grid).forEach(function(p){p.classList.remove('active');});
    pill.classList.add('active');
    selectedDay=pill.dataset.day; selectedTime=pill.dataset.time;
    renderDrawer();
  });
}

/* ---- WhatsApp send ---- */
function buildWAMessage(){
  const name=qs('#custName')?.value.trim()||'';
  const phone=qs('#custPhone')?.value.trim()||'';
  const bowls=qs('#bowlToggle')?.checked;
  const lines=['Hello Shika\'s Kitchen!','','Name: '+(name||'(not provided)'),'Phone: '+(phone||'(not provided)'),'','My Order:'];
  let subtotal=0;
  picked.forEach(function(v,id){
    const m=mergedMenu.find(function(x){return x.id===id;}); if(!m) return;
    var extras = [];
    if(v.spice) extras.push('Spice: '+v.spice);
    if(v.note) extras.push(v.note);
    lines.push('- '+m.n+' x'+v.qty+' - Rs '+(m.p*v.qty)+(extras.length?' ('+extras.join(', ')+')':''));
    subtotal+=m.p*v.qty;
  });
  const portions=totalPortions();
  const bowlFee=bowls?25*portions:0;
  lines.push('','Subtotal: Rs '+subtotal);
  if(bowls) lines.push('Takeaway bowls: Yes (Rs 25 × '+portions+' portions = +Rs '+bowlFee+')');
  if(selectedDay) lines.push('Pickup: '+selectedDay+' at '+selectedTime);
  lines.push('','Total: Rs '+(subtotal+bowlFee));
  return lines.join('\n');
}

function sendToWhatsApp(){
  const ss=getSiteSettings();
  const waNum=ss.waNumber||WA_DEFAULT;
  const msg=buildWAMessage();
  const name=qs('#custName')?.value.trim()||'';
  const phone=qs('#custPhone')?.value.trim()||'';
  const bowls=qs('#bowlToggle')?.checked||false;
  const items=[...picked.entries()].map(function(entry){
    const id=entry[0], v=entry[1];
    const m=mergedMenu.find(function(x){return x.id===id;});
    return {id:id,name:m?m.n:'?',qty:v.qty,price:m?m.p:0,note:v.note||''};
  });
  let total=0;
  picked.forEach(function(v,id){ const m=mergedMenu.find(function(x){return x.id===id;}); if(m) total+=m.p*v.qty; });
  total+=bowls?25*totalPortions():0;
  const order={date:Date.now(),customer:name,phone:phone,items:items,bowls:bowls,total:total,pickupDay:selectedDay,pickupTime:selectedTime};
  const hist=getHistory();
  hist.push(order);
  localStorage.setItem('shika_history',JSON.stringify(hist));
  fetch(_orderUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(order)}).catch(function(){});
  window.open('https://wa.me/'+waNum+'?text='+encodeURIComponent(msg),'_blank');
  showToast('Opening WhatsApp...');
}

/* ---- full menu WhatsApp message ---- */
function buildMenuWAMessage(){
  const lines=[
    "Shika's Kitchen — Weekend Menu",
    "Order by Friday 9 AM | Collection Sat & Sun 11:30 AM–8:00 PM",
    "Min order: Rs 200 | Reply with your choices",
    ""
  ];
  CATS.forEach(function(cat){
    const dishes = mergedMenu.filter(function(m){ return m.c===cat.id && m.available!==false; });
    if(!dishes.length) return;
    lines.push("— "+cat.name.toUpperCase()+" —");
    dishes.forEach(function(m){
      var line = (m.v?"[V]":"[NV]")+" "+m.n+" — Rs "+m.p;
      if(m.hot) line += " *";
      lines.push(line);
    });
    lines.push("");
  });
  lines.push("* = Popular dish");
  lines.push("[V] = Vegetarian   [NV] = Non-Veg");
  lines.push("");
  lines.push("To order, reply with dish names and quantities.");
  lines.push("WhatsApp: +230 5829 0809");
  return lines.join("\n");
}

function openMenuWA(){
  const ss=getSiteSettings();
  const waNum=ss.waNumber||WA_DEFAULT;
  const msg=buildMenuWAMessage();
  window.open('https://wa.me/'+waNum+'?text='+encodeURIComponent(msg),'_blank');
}

/* ---- print summary ---- */
function printOrder(){ window.print(); }

/* ---- share cart as URL ---- */
function shareCart(){
  const obj={};
  picked.forEach(function(v,k){obj[k]=v;});
  try{
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    const url=location.href.split('#')[0]+'#cart='+b64;
    navigator.clipboard.writeText(url).then(function(){showToast('Cart link copied!');}).catch(function(){showToast('Could not copy link.');});
  }catch(e){ showToast('Could not share cart.'); }
}

function loadCartFromHash(){
  const h=location.hash;
  if(!h.startsWith('#cart=')) return;
  try{
    const b64=h.slice(6);
    const obj=JSON.parse(decodeURIComponent(escape(atob(b64))));
    Object.entries(obj).forEach(function(entry){ picked.set(+entry[0],entry[1]); });
    history.replaceState(null,'',location.pathname);
  }catch(e){}
}

/* ---- share as image (canvas) ---- */
function shareAsImage(){
  const canvas=document.createElement('canvas');
  canvas.width=600; canvas.height=400;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#1B3A2D';
  ctx.fillRect(0,0,600,400);
  ctx.fillStyle='#C9A84C';
  ctx.font='bold 28px Georgia,serif';
  ctx.textAlign='center';
  ctx.fillText("Shika's Kitchen — My Order", 300, 54);
  ctx.fillStyle='rgba(201,168,76,0.4)';
  ctx.fillRect(40,74,520,1);
  ctx.fillStyle='#F5F0E8';
  ctx.font='16px Arial,sans-serif';
  ctx.textAlign='left';
  let y=110, total=0;
  picked.forEach(function(v,id){
    const m=mergedMenu.find(function(x){return x.id===id;}); if(!m) return;
    const price='Rs '+(m.p*v.qty);
    ctx.fillText(m.n+' x'+v.qty, 56, y);
    ctx.textAlign='right'; ctx.fillText(price, 544, y); ctx.textAlign='left';
    total+=m.p*v.qty; y+=30;
  });
  ctx.fillStyle='rgba(201,168,76,0.4)';
  ctx.fillRect(40,y+4,520,1);
  ctx.fillStyle='#C9A84C';
  ctx.font='bold 20px Arial,sans-serif';
  ctx.textAlign='right';
  ctx.fillText('Total: Rs '+total, 544, y+30);
  ctx.fillStyle='rgba(245,240,232,0.5)';
  ctx.font='13px Arial,sans-serif';
  ctx.textAlign='center';
  ctx.fillText('Order via WhatsApp: wa.me/'+WA_DEFAULT, 300, 385);
  const link=document.createElement('a');
  link.href=canvas.toDataURL('image/png');
  link.download='shikas-kitchen-order.png';
  link.click();
}

/* ---- downloadable menu PDF ---- */
function downloadMenuPDF(){
  var logoSrc = qs('#_logoData')?.textContent.trim() || '';
  var today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  var catSections = '';
  CATS.forEach(function(cat){
    var dishes = mergedMenu.filter(function(m){ return m.c===cat.id && m.available!==false; });
    if(!dishes.length) return;
    var rows = dishes.map(function(m){
      return '<tr>'
        +'<td>'+escHtml(m.n)+(m.hot?' <span class="pop">Popular</span>':'')+'</td>'
        +'<td><span class="vnv-dot '+(m.v?'v':'nv')+'">'+(m.v?'V':'NV')+'</span></td>'
        +'<td style="color:#555;font-size:.8rem">'+escHtml(m.d||'')+'</td>'
        +'<td class="price">Rs '+(m.from?'from ':'')+m.p+'</td>'
        +'</tr>';
    }).join('');
    catSections += '<div class="cat-section">'
      +'<div class="cat-head" style="background:'+cat.color+'22;border-left:4px solid '+cat.color+'"><span class="cat-abbr" style="background:'+cat.color+'">'+escHtml(cat.abbr)+'</span><span class="cat-name">'+escHtml(cat.name)+'</span></div>'
      +'<table><thead><tr><th>Dish</th><th>Diet</th><th>Description</th><th>Price</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'</div>';
  });
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shika\'s Kitchen — Menu</title>'
    +'<style>'
    +'*{margin:0;padding:0;box-sizing:border-box}'
    +'body{font-family:Georgia,serif;color:#1B3A2D;background:#fff;padding:32px}'
    +'.page{max-width:800px;margin:0 auto}'
    +'.header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #C9A84C;padding-bottom:16px;margin-bottom:8px}'
    +'.logo{width:68px;height:68px;border-radius:10px;object-fit:cover}'
    +'.biz h1{font-size:1.6rem;color:#1B3A2D}'
    +'.biz p{font-size:.78rem;color:#666;margin-top:3px}'
    +'.meta-bar{display:flex;gap:24px;font-size:.72rem;color:#888;margin:10px 0 22px;padding:10px 14px;background:#faf8f2;border:1px solid #e8e0cc;border-radius:4px}'
    +'.meta-bar span{display:flex;align-items:center;gap:5px}'
    +'.cat-section{margin-bottom:24px;page-break-inside:avoid}'
    +'.cat-head{display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:6px;border-radius:3px}'
    +'.cat-abbr{color:#fff;font-weight:700;font-size:.7rem;padding:3px 8px;border-radius:3px;letter-spacing:.06em}'
    +'.cat-name{font-size:.95rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1B3A2D}'
    +'table{width:100%;border-collapse:collapse;font-size:.82rem}'
    +'th{background:#1B3A2D;color:#C9A84C;padding:6px 10px;text-align:left;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}'
    +'td{padding:7px 10px;border-bottom:1px solid #ede8da;vertical-align:top}'
    +'tr:last-child td{border-bottom:none}'
    +'.price{font-weight:700;white-space:nowrap;color:#1B3A2D}'
    +'.vnv-dot{font-size:.65rem;font-weight:700;padding:2px 6px;border-radius:3px}'
    +'.vnv-dot.v{background:#d4edda;color:#155724}'
    +'.vnv-dot.nv{background:#f8d7da;color:#721c24}'
    +'.pop{font-size:.62rem;background:#C9A84C;color:#1B3A2D;padding:1px 6px;border-radius:3px;margin-left:4px;font-family:Arial,sans-serif;font-weight:700}'
    +'.footer{margin-top:28px;border-top:1px solid #e8e0cc;padding-top:12px;font-size:.72rem;color:#999;text-align:center}'
    +'@media print{body{padding:16px}}'
    +'</style></head><body><div class="page">'
    +'<div class="header">'
    +(logoSrc?'<img class="logo" src="'+logoSrc+'" alt="Logo">':'')
    +'<div class="biz"><h1>Shika\'s Kitchen</h1><p>Home-cooked weekend meals · Mauritius · WhatsApp: +230 5829 0809</p><p style="margin-top:4px;color:#C9A84C;font-weight:700">Menu as of '+today+'</p></div>'
    +'</div>'
    +'<div class="meta-bar">'
    +'<span>Orders by Friday 9 AM</span>'
    +'<span>Collection: Sat &amp; Sun 11:30 AM–8:00 PM</span>'
    +'<span>Min order: Rs 200</span>'
    +'<span>No delivery — collection only</span>'
    +'</div>'
    +catSections
    +'<div class="footer">Shika\'s Kitchen · +230 5829 0809 · Orders every Friday before 9 AM · [V] Vegetarian &nbsp;|&nbsp; [NV] Non-Vegetarian</div>'
    +'</div></body></html>';

  var win = window.open('','_blank','width=900,height=960');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(function(){ win.print(); }, 600);
}

/* ---- invoice / receipt generator ---- */
function generateDoc(type){
  var isInvoice = type === 'invoice';
  var name = (qs('#custName')?.value||'').trim() || 'Customer';
  var phone = (qs('#custPhone')?.value||'').trim();
  var slot = qs('.pill.active')?.textContent || '';
  var bowlFee = qs('#bowlToggle')?.checked ? 25 * totalPortions() : 0;
  var subtotal = 0;
  var rows = '';
  var num = 'SK-' + Date.now().toString().slice(-6);
  var today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  picked.forEach(function(v,id){
    var m = mergedMenu.find(function(x){return x.id===id;}); if(!m) return;
    var line = m.p * v.qty;
    subtotal += line;
    rows += '<tr><td>'+escHtml(m.n)+(v.note?'<br><small style="color:#888">'+escHtml(v.note)+'</small>':'')+'</td>'
      +'<td style="text-align:center">'+v.qty+'</td>'
      +'<td style="text-align:right">Rs '+m.p+'</td>'
      +'<td style="text-align:right">Rs '+line+'</td></tr>';
  });
  var total = subtotal + bowlFee;
  var logoSrc = qs('#_logoData')?.textContent.trim() || '';

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">'
    +'<title>Shika\'s Kitchen — '+(isInvoice?'Invoice':'Receipt')+'</title>'
    +'<style>'
    +'*{margin:0;padding:0;box-sizing:border-box}'
    +'body{font-family:Georgia,serif;color:#1B3A2D;background:#fff;padding:40px}'
    +'.page{max-width:680px;margin:0 auto}'
    +'.header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #C9A84C;padding-bottom:18px;margin-bottom:24px}'
    +'.logo{width:72px;height:72px;border-radius:12px;object-fit:cover}'
    +'.biz h1{font-size:1.55rem;color:#1B3A2D;letter-spacing:.02em}'
    +'.biz p{font-size:.8rem;color:#666;margin-top:2px}'
    +'.doc-title{font-size:1.1rem;font-weight:bold;color:#C9A84C;text-transform:uppercase;letter-spacing:.12em;margin-bottom:18px}'
    +'.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:.82rem;margin-bottom:22px}'
    +'.meta .label{color:#888}'
    +'.meta .val{font-weight:700}'
    +'table{width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:20px}'
    +'th{background:#1B3A2D;color:#C9A84C;padding:8px 10px;text-align:left}'
    +'td{padding:8px 10px;border-bottom:1px solid #e8e2d0}'
    +'tr:last-child td{border-bottom:none}'
    +'.totals{border-top:2px solid #C9A84C;padding-top:12px;text-align:right;font-size:.9rem}'
    +'.totals .row{display:flex;justify-content:flex-end;gap:40px;padding:3px 0}'
    +'.totals .grand{font-size:1.15rem;font-weight:bold;color:#1B3A2D;border-top:1px solid #C9A84C;margin-top:6px;padding-top:8px}'
    +'.footer{margin-top:32px;border-top:1px solid #e8e2d0;padding-top:14px;font-size:.75rem;color:#999;text-align:center}'
    +(isInvoice?'.note{background:#fffbf0;border:1px solid #e8d88a;padding:10px 14px;border-radius:6px;font-size:.8rem;margin-bottom:18px}':'')
    +'@media print{body{padding:20px}button{display:none}}'
    +'</style></head><body><div class="page">'
    +'<div class="header">'
    +(logoSrc?'<img class="logo" src="'+logoSrc+'" alt="Logo">':'')
    +'<div class="biz"><h1>Shika\'s Kitchen</h1><p>Home-cooked weekend meals · Mauritius</p><p>WhatsApp: +230 5829 0809</p></div>'
    +'</div>'
    +'<div class="doc-title">'+(isInvoice?'Invoice':'Receipt')+'</div>'
    +'<div class="meta">'
    +'<span class="label">'+(isInvoice?'Invoice':'Receipt')+' No.</span><span class="val">'+num+'</span>'
    +'<span class="label">Date</span><span class="val">'+today+'</span>'
    +'<span class="label">Customer</span><span class="val">'+escHtml(name)+'</span>'
    +(phone?'<span class="label">Phone</span><span class="val">'+escHtml(phone)+'</span>':'')
    +(slot?'<span class="label">Pickup Slot</span><span class="val">'+escHtml(slot)+'</span>':'')
    +'</div>'
    +(isInvoice?'<div class="note">Payment is due upon collection. Please present this invoice when picking up your order.</div>':'')
    +'<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>'
    +'<div class="totals">'
    +'<div class="row"><span>Subtotal</span><span>Rs '+subtotal+'</span></div>'
    +(bowlFee?'<div class="row"><span>Takeaway Bowls</span><span>Rs '+bowlFee+'</span></div>':'')
    +'<div class="row grand"><span>Total</span><span>Rs '+total+'</span></div>'
    +'</div>'
    +'<div class="footer">Thank you for ordering from Shika\'s Kitchen! · Orders accepted every Friday before 9 AM</div>'
    +'</div></body></html>';

  var win = window.open('','_blank','width=780,height=900');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(function(){ win.print(); }, 600);
}

/* ---- sticky mobile cart bar ---- */
function updateStickyCart(){
  const bar=qs('#stickyCart'); if(!bar) return;
  let total=0, subtotal=0;
  picked.forEach(function(v){ total+=v.qty; });
  picked.forEach(function(v,id){ const m=mergedMenu.find(function(x){return x.id===id;}); if(m) subtotal+=m.p*v.qty; });
  if(total>0 && window.innerWidth<481){
    bar.classList.add('show');
    const info=qs('#stickyCartInfo',bar);
    if(info) info.innerHTML=total+' item'+(total!==1?'s':'')+' &bull; <b>Rs '+subtotal+'</b>';
  } else {
    bar.classList.remove('show');
  }
}

/* ---- gallery modal ---- */
function openGallery(id){
  const m=mergedMenu.find(function(x){return x.id===id;}); if(!m) return;
  const modal=qs('#galleryModal'); if(!modal) return;
  const cat=CATS.find(function(c){return c.id===m.c;})||{};
  const abbr=cat.abbr||m.n.slice(0,2).toUpperCase();
  const gImg=qs('#galleryImg',modal);
  if(gImg){ gImg.style.background=cat.color||'#1B3A2D'; gImg.innerHTML='<div class="gallery-img-abbr">'+escHtml(abbr)+'</div>'; }
  const gName=qs('#galleryName',modal); if(gName) gName.textContent=m.n;
  const gDesc=qs('#galleryDesc',modal); if(gDesc) gDesc.textContent=m.d||'';
  const gPrice=qs('#galleryPrice',modal); if(gPrice) gPrice.textContent='Rs '+m.p;
  const gAdd=qs('#galleryAdd',modal);
  if(gAdd){
    gAdd.textContent='Add to Order';
    gAdd.onclick=function(){ cartAdd(id); closeGallery(); showToast(m.n+' added.'); };
  }
  modal.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeGallery(){
  qs('#galleryModal')?.classList.remove('open');
  document.body.style.overflow='';
}

/* ---- countdowns ---- */
function getNextOrderDeadline(){
  const now=new Date();
  const day=now.getDay();
  let d=new Date(now);
  const diffToFri=(5-day+7)%7 || (now.getHours()<9?0:7);
  d.setDate(d.getDate()+diffToFri);
  d.setHours(9,0,0,0);
  return d;
}
function getNextCollection(){
  const now=new Date();
  const day=now.getDay();
  let d=new Date(now);
  const isSat=day===6, beforeOpen=now.getHours()<17;
  d.setDate(d.getDate()+(isSat&&beforeOpen?0:(6-day+7)%7||7));
  d.setHours(17,0,0,0);
  return d;
}
function formatCountdown(ms){
  if(ms<=0) return null;
  const s=Math.floor(ms/1000);
  return {days:Math.floor(s/86400),hrs:Math.floor((s%86400)/3600),mins:Math.floor((s%3600)/60),secs:s%60};
}
function renderCountdown(elId, target){
  const wrap=qs('#'+elId); if(!wrap) return;
  const ms=target-Date.now();
  const t=formatCountdown(ms);
  if(!t){ wrap.innerHTML='<span class="count-closed">Orders are now closed for this week.</span>'; return; }
  wrap.innerHTML='<div class="count-row">'
    +['days','hrs','mins','secs'].map(function(k){
      return '<div class="count-cell"><b>'+String(t[k]).padStart(2,'0')+'</b><small>'+k+'</small></div>';
    }).join('')
    +'</div>';
}
function startCountdowns(){
  const deadline=getNextOrderDeadline();
  const collection=getNextCollection();
  renderCountdown('countdown1',deadline);
  renderCountdown('countdown2',collection);
  setInterval(function(){
    renderCountdown('countdown1',deadline);
    renderCountdown('countdown2',collection);
  },1000);
}

/* ---- stats counter ---- */
function animateCounter(el, target, duration){
  duration=duration||1400;
  const suffix=el.dataset.suffix||'';
  const start=Date.now();
  function tick(){
    const p=Math.min((Date.now()-start)/duration,1);
    const eased=1-Math.pow(1-p,3);
    el.textContent=Math.round(eased*target)+suffix;
    if(p<1) requestAnimationFrame(tick);
    else el.textContent=target+suffix;
  }
  tick();
}
function initStats(){
  const dishStat = qs('#stat0');
  if(dishStat){
    const count = mergedMenu.filter(function(m){ return m.available!==false; }).length;
    dishStat.dataset.val = count;
    dishStat.textContent = count;
  }
  const items=qsa('.stat-item');
  if(!items.length) return;
  const obs=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      const el=en.target.querySelector('.stat-num');
      const val=+el.dataset.val;
      if(val) animateCounter(el,val);
      obs.unobserve(en.target);
    });
  },{threshold:.5});
  items.forEach(function(i){obs.observe(i);});
}

/* ---- testimonials ---- */
function renderTestimonials(){
  const el=qs('#testimonialsGrid'); if(!el) return;
  const list=(_siteContent && _siteContent.testimonials) || DEFAULT_TESTIMONIALS;
  if(!list.length){
    el.innerHTML='<p class="reviews-empty">No reviews yet — be the first to leave one below.</p>';
    return;
  }
  el.innerHTML=list.map(function(t){
    const stars=Array.from({length:5},function(_,i){
      return '<svg class="star'+(i<(t.stars||5)?'':' empty')+'" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }).join('');
    return '<div class="tcard"><div class="star-row">'+stars+'</div>'
      +'<p class="tcard-quote">'+escHtml(t.quote||'')+'</p>'
      +'<div class="tcard-footer"><span class="tcard-name">'+escHtml(t.name||'')+'</span>'
      +'<span class="tcard-date">'+escHtml(t.date||'')+'</span></div></div>';
  }).join('');
}

/* ---- review form ---- */
function initReviewForm(){
  const form = qs('#reviewForm'); if(!form) return;
  const stars = qsa('.star-pick', form);
  const textarea = qs('#revMsg', form);
  const charCount = qs('#revCharCount');
  let selectedStars = 5;

  // highlight stars up to hovered/selected
  function litStars(n){
    stars.forEach(function(s){ s.classList.toggle('lit', +s.dataset.val <= n); });
  }
  litStars(5);

  stars.forEach(function(s){
    s.addEventListener('mouseenter', function(){ litStars(+s.dataset.val); });
    s.addEventListener('click', function(){
      selectedStars = +s.dataset.val;
      litStars(selectedStars);
    });
  });
  form.querySelector('.star-input').addEventListener('mouseleave', function(){
    litStars(selectedStars);
  });

  if(textarea && charCount){
    textarea.addEventListener('input', function(){
      charCount.textContent = textarea.value.length;
    });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const name = qs('#revName')?.value.trim();
    const msg = textarea?.value.trim();
    if(!name || !msg){ showToast('Please enter your name and review.'); return; }

    const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const newReview = {name: name, quote: msg, stars: selectedStars, date: today};

    form.reset();
    selectedStars = 5;
    litStars(5);
    if(charCount) charCount.textContent = '0';

    fetch(_reviewUrl, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(newReview)
    }).then(function(r){ return r.ok ? r.json() : null; }).then(function(res){
      if(res && res.ok){
        if(_siteContent){ _siteContent.testimonials = _siteContent.testimonials || []; _siteContent.testimonials.unshift(newReview); }
        renderTestimonials();
        showToast('Thank you for your review!');
        qs('#testimonialsGrid')?.scrollIntoView({behavior:'smooth', block:'nearest'});
      } else {
        showToast('Could not save review — server not running.');
      }
    }).catch(function(){
      showToast('Could not save review — server not running.');
    });
  });
}

/* ---- FAQ ---- */
function renderFAQ(){
  const el=qs('#faqList'); if(!el) return;
  const list=(_siteContent && _siteContent.faqs) || DEFAULT_FAQS;
  el.innerHTML=list.map(function(f){
    return '<details><summary>'+escHtml(f.q)+'</summary><div class="faq-ans">'+escHtml(f.a)+'</div></details>';
  }).join('');
}


/* ---- social share ---- */
function initSocialShare(){
  qs('#shareWA')?.addEventListener('click',function(){
    window.open('https://wa.me/?text='+encodeURIComponent("Check out Shika's Kitchen! Order fresh home-cooked Mauritian food this weekend. "+location.href),'_blank');
  });
  qs('#shareFB')?.addEventListener('click',function(){
    window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank');
  });
  qs('#shareCopy')?.addEventListener('click',function(){
    navigator.clipboard.writeText(location.href).then(function(){showToast('Link copied!');}).catch(function(){showToast('Could not copy.');});
  });
}

/* ---- scroll progress bar ---- */
function initScrollProgress(){
  const bar=qs('#scrollProgress'); if(!bar) return;
  window.addEventListener('scroll',function(){
    const h=document.documentElement.scrollHeight-window.innerHeight;
    bar.style.width=(h>0?(window.scrollY/h*100):0)+'%';
  },{passive:true});
}

/* ---- back to top ---- */
function initBackToTop(){
  const btn=qs('#backToTop'); if(!btn) return;
  window.addEventListener('scroll',function(){
    btn.classList.toggle('show',window.scrollY>400);
  },{passive:true});
  btn.addEventListener('click',function(){ window.scrollTo({top:0,behavior:'smooth'}); });
}

/* ---- nav spy & mobile burger ---- */
function initNavSpy(){
  const links=qsa('.nav-links a[href^="#"]');
  const sections=links.map(function(l){return qs(l.getAttribute('href'));}).filter(Boolean);
  const obs=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){
        const id=en.target.id;
        links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+id);});
      }
    });
  },{rootMargin:'-40% 0px -55% 0px'});
  sections.forEach(function(s){obs.observe(s);});
}

function initBurger(){
  const burger=qs('#burger');
  const menu=qs('#navLinks');
  if(!burger||!menu) return;
  burger.addEventListener('click',function(){
    burger.classList.toggle('open');
    menu.classList.toggle('open');
  });
  qsa('.nav-links a').forEach(function(a){
    a.addEventListener('click',function(){
      burger.classList.remove('open');
      menu.classList.remove('open');
    });
  });
}

/* ---- reveal on scroll ---- */
function attachReveal(){
  const els=qsa('.reveal:not(.visible):not(.shown)');
  if(!els.length) return;
  const obs=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){ en.target.classList.add('visible'); obs.unobserve(en.target); }
    });
  },{threshold:.12});
  els.forEach(function(el){obs.observe(el);});
}

/* ---- swipe to close drawer ---- */
function initSwipe(){
  const drawer=qs('#cartDrawer'); if(!drawer) return;
  let sx=0;
  drawer.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
  drawer.addEventListener('touchend',function(e){ if(e.changedTouches[0].clientX-sx>65) closeCart(); },{passive:true});
}

/* ---- keyboard shortcuts ---- */
function initKeyboard(){
  document.addEventListener('keydown',function(e){
    const tag=e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||e.target.isContentEditable) return;
    if(e.key==='/'){ e.preventDefault(); qs('#menuSearch')?.focus(); }
    if(e.key.toLowerCase()==='c' && !e.ctrlKey && !e.metaKey){ openCart(); }
    if(e.key==='Escape'){ closeCart(); closeGallery(); }
  });
  if(!sessionStorage.getItem('shika_kbd')){
    sessionStorage.setItem('shika_kbd','1');
    const hint=qs('#kbdHint');
    if(hint){ setTimeout(function(){ hint.classList.add('show'); setTimeout(function(){hint.classList.remove('show');},5000); },3000); }
  }
}

/* ---- cookie consent ---- */
function initCookieBanner(){
  const banner=qs('#cookieBanner'); if(!banner) return;
  if(localStorage.getItem('shika_cookies_ok')){ banner.setAttribute('hidden',''); return; }
  qs('#cookieOk')?.addEventListener('click',function(){
    localStorage.setItem('shika_cookies_ok','1');
    banner.setAttribute('hidden','');
  });
}

/* ---- search ---- */
function initSearch(){
  const inp=qs('#menuSearch');
  const clr=qs('#searchClear');
  if(!inp) return;
  inp.addEventListener('input',function(){
    searchQ=inp.value.trim();
    currentPage=1;
    clr?.classList.toggle('show',!!searchQ);
    renderGrid();
  });
  clr?.addEventListener('click',function(){
    inp.value=''; searchQ=''; currentPage=1;
    clr.classList.remove('show');
    inp.focus(); renderGrid();
  });
  qs('#vegFilter')?.addEventListener('change',function(e){
    showVegOnly=e.target.checked; renderGrid();
  });
}

/* ---- QR code ---- */
function initQR(){
  var canvas = qs('#qrCanvas'); if(!canvas) return;
  var ss = getSiteSettings();
  var waNum = ss.waNumber || WA_DEFAULT;
  var url = 'https://wa.me/' + waNum;
  if(window._generateQR){ window._generateQR(url, canvas, '#1B3A2D', '#F5F0E8'); return; }
  // fallback: load image directly
  var img = new Image();
  img.width = 140; img.height = 140;
  img.alt = 'Scan to order on WhatsApp';
  img.style.display = 'block';
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(url) + '&color=1B3A2D&bgcolor=F5F0E8&margin=2';
  canvas.replaceWith(img);
}

/* ---- init ---- */
/* ---- content.json loader (single source of truth) ---- */
function loadContentJson(){
  return fetch('content.json?_=' + Date.now())
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){ if(data) _siteContent = data; })
    .catch(function(){});
}

function applySocialLinks(){
  var links = (_siteContent && _siteContent.socialLinks) || {};
  Object.keys(links).forEach(function(platform){
    var url = links[platform];
    document.querySelectorAll('[data-social="' + platform + '"]').forEach(function(el){
      if(url){ el.href = url; el.style.display = ''; }
      else { el.style.display = 'none'; }
    });
  });
}

function applyClosureBanner(){
  var c = (_siteContent && _siteContent.closure) || {};
  var banner = qs('#closureBanner');
  var msg = qs('#closureMsg');
  if(!banner) return;
  if(c.enabled){
    if(msg) msg.textContent = c.message || 'We are closed this weekend.';
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function init(){
  initSpecials();
  mergedMenu = buildMergedMenu();
  loadCart();
  loadCartFromHash();
  buildTabs();
  buildAllergenFilter();
  renderGrid(120);
  attachGridEvents();
  initSlots();
  initSearch();
  initPagination();
  startCountdowns();
  renderTestimonials();
  initReviewForm();
  renderFAQ();
  initSocialShare();
  initScrollProgress();
  initBackToTop();
  initNavSpy();
  initBurger();
  attachReveal();
  initSwipe();
  initKeyboard();
  initCookieBanner();
  initStats();
  bumpBadge();

  qs('#heroWABtn')?.addEventListener('click',openMenuWA);
  qs('#howWABtn')?.addEventListener('click',openMenuWA);
  qs('#footWABtn')?.addEventListener('click',function(e){ e.preventDefault(); openMenuWA(); });
  var waFloat=qs('.wa-float');
  if(waFloat){ var _ss=getSiteSettings(); waFloat.href='https://wa.me/'+(_ss.waNumber||WA_DEFAULT)+'?text='+encodeURIComponent(buildMenuWAMessage()); }
  qs('#cartBtn')?.addEventListener('click',openCart);
  qs('#backdrop')?.addEventListener('click',closeCart);
  qs('#drawerClose')?.addEventListener('click',closeCart);
  qs('#sendWA')?.addEventListener('click',sendToWhatsApp);
  qs('#waCatalogueBtn')?.addEventListener('click',openMenuWA);
  qs('#downloadPDF')?.addEventListener('click',downloadMenuPDF);
  qs('#stickyCartBtn')?.addEventListener('click',openCart);
  qs('#galleryClose')?.addEventListener('click',closeGallery);
  qs('#galleryModal')?.addEventListener('click',function(e){ if(e.target===e.currentTarget) closeGallery(); });
  qs('#bowlToggle')?.addEventListener('change',renderDrawer);
  initQR();
  initFoodGallery();
}

/* ---- gallery ---- */
function initFoodGallery(){
  const items = qsa('.fg-item');
  const lb = qs('#fgLightbox');
  const lbImg = qs('#fgLbImg');
  const lbCap = qs('#fgLbCaption');
  if(!lb || !items.length) return;
  let current = 0;
  const srcs = [...items].map(function(i){ return {src:i.dataset.src, cap:i.dataset.caption||''}; });
  function openLb(idx){
    current = idx;
    lbImg.src = srcs[idx].src;
    lbCap.textContent = srcs[idx].cap;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLb(){
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }
  items.forEach(function(el, i){ el.addEventListener('click', function(){ openLb(i); }); });
  qs('#fgClose')?.addEventListener('click', closeLb);
  qs('#fgPrev')?.addEventListener('click', function(){ openLb((current - 1 + srcs.length) % srcs.length); });
  qs('#fgNext')?.addEventListener('click', function(){ openLb((current + 1) % srcs.length); });
  lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });
  document.addEventListener('keydown', function(e){
    if(!lb.classList.contains('open')) return;
    if(e.key === 'ArrowLeft') openLb((current - 1 + srcs.length) % srcs.length);
    if(e.key === 'ArrowRight') openLb((current + 1) % srcs.length);
    if(e.key === 'Escape') closeLb();
  });
}

/* ---- legal footer ---- */
function initLegalFooter(){
  const yr = qs('#legalYear');
  if(yr) yr.textContent = new Date().getFullYear();
  const btn = qs('#legalToggle');
  const panel = qs('#legalPanel');
  if(!btn || !panel) return;
  btn.addEventListener('click', function(){
    const open = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    panel.setAttribute('aria-hidden', !open);
    btn.textContent = open ? 'Close Legal Notice' : 'Legal Notice';
  });
}

document.addEventListener('DOMContentLoaded', function(){
  loadContentJson().then(function(){
    applySocialLinks();
    applyClosureBanner();
    init();
    initLegalFooter();
  });
});
