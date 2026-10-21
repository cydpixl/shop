(() => {
  'use strict';

  const API_URL = 'https://fortnite-api.com/v2/shop?language=en&responseFlags=7';
  const TRACKS_URL = 'https://raw.githubusercontent.com/FNFestival/fnfestival.github.io/main/data/tracks.json';
  const CACHE_KEY = 'ashlan-shop-cache-v3';
  const FAVORITES_KEY = 'pixl-shop-favorites-v2';
  const VBUCK_FALLBACK = 'https://fortnite-api.com/images/vbuck.png';
  const MAX_CACHE_AGE = 72 * 60 * 60 * 1000;

  const $ = (id) => document.getElementById(id);
  const state = { items: [], view: 'shop', filter: 'all', query: '', sort: 'shop', featured: null, active: null, favorites: new Set(), shopDate: null, live: false, fetching: false, toastTimer: null, lastFocused: null };
  const ui = {
    header: $('header'), hero: $('hero'), heroArt: $('hero-art'), heroGlow: $('hero-glow'), heroBackdrop: $('hero-backdrop'), heroTitle: $('hero-title'), heroDescription: $('hero-description'), heroType: $('hero-type'), heroPrice: $('hero-price'), heroDate: $('hero-date'), heroCaption: $('hero-caption'), heroCountdown: $('hero-countdown'), heroInfo: $('hero-info'), results: $('shop-results'), itemCount: $('item-count'), statusPill: $('status-pill'), statusLabel: $('status-label'), heading: $('section-heading'), overline: $('section-overline'), notice: $('notice'), noticeText: $('notice-text'), search: $('search'), modal: $('modal'), modalPanel: $('modal-panel'), modalArtFrame: $('modal-art-frame'), modalImage: $('modal-image'), modalTitle: $('modal-title'), modalCategory: $('modal-category'), modalTags: $('modal-tags'), modalDescription: $('modal-description'), modalPrice: $('modal-price'), modalOldPrice: $('modal-old-price'), modalIncludes: $('modal-includes'), includedList: $('included-list'), modalDetails: $('modal-details'), modalSave: $('modal-save'), toast: $('toast')
  };

  // All third-party text is escaped before being inserted into HTML.
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeImage(raw) {
    if (!raw || typeof raw !== 'string') return '';
    try { const url = new URL(raw); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  }
  function icon(name) { return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`; }
  function vbucks(price) {
    if (price === null || price === undefined || Number(price) < 0) return '<span>Price unavailable</span>';
    return `<img class="vbuck-symbol" alt="V-Bucks" src="${VBUCK_FALLBACK}"><span>${Number(price).toLocaleString('en-US')}</span>`;
  }
  function hexColor(raw, fallback) {
    const hex = typeof raw === 'string' ? raw.replace(/^#/, '').slice(0, 6) : '';
    return /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex : fallback;
  }
  function displayDate(date) {
    const d = new Date(date);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Today';
  }
  function shortDate(date) {
    const d = new Date(date);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  }
  function categoryFor(entry) {
    if (entry.bundle && entry.bundle.name) return 'bundle';
    if (entry.brItems?.length > 1) return 'bundle';
    const type = String(entry.brItems?.[0]?.type?.value || '').toLowerCase();
    if (type === 'outfit') return 'outfit';
    if (['emote','emoji','spray'].includes(type)) return 'emote';
    if (['pickaxe'].includes(type)) return 'pickaxe';
    if (entry.tracks?.length) return 'music';
    if (entry.cars?.length) return 'car';
    if (entry.instruments?.length) return 'instrument';
    return 'other';
  }
  function normalize(entry, index, shopDate) {
    if (!entry || typeof entry !== 'object') return null;
    const brItems = Array.isArray(entry.brItems) ? entry.brItems : [];
    const tracks = Array.isArray(entry.tracks) ? entry.tracks : [];
    const instruments = Array.isArray(entry.instruments) ? entry.instruments : [];
    const cars = Array.isArray(entry.cars) ? entry.cars : [];
    const primary = brItems[0] || null;
    const category = categoryFor(entry);
    const display = entry.newDisplayAsset || {};
    const bundle = entry.bundle || null;
    const content = [...brItems, ...tracks, ...instruments, ...cars];
    const name = bundle?.name || display?.displayName || (category === 'bundle' && content.length > 1 ? (primary?.name ? primary.name + ' Bundle' : '') : '') || primary?.name || tracks[0]?.title || instruments[0]?.name || cars[0]?.name || entry.devName?.replace(/^\[VIRTUAL\]/,'').slice(0,54) || 'Item Shop Offer';
    const section = entry.layout?.name || 'More in the Shop';
    const image = safeImage(display.renderImages?.find(x => x?.image)?.image) || safeImage(bundle?.image) || safeImage(primary?.images?.featured) || safeImage(primary?.images?.icon) || safeImage(tracks[0]?.albumArt) || safeImage(instruments[0]?.images?.large) || safeImage(instruments[0]?.images?.icon) || safeImage(cars[0]?.images?.large) || safeImage(cars[0]?.images?.icon) || '';
    const fallbackImage = safeImage(primary?.images?.icon) || safeImage(tracks[0]?.albumArt) || safeImage(instruments[0]?.images?.icon) || safeImage(cars[0]?.images?.icon) || '';
    const description = primary?.description || bundle?.info || tracks[0]?.artist || '';
    const typeLabel = category === 'bundle' ? 'Bundle' : primary?.type?.displayValue || (tracks.length ? 'Jam Track' : instruments.length ? 'Instrument' : cars.length ? 'Vehicle' : 'Shop Item');
    const rarity = primary?.series?.value || primary?.rarity?.displayValue || '';
    const price = typeof entry.finalPrice === 'number' ? entry.finalPrice : null;
    const regular = typeof entry.regularPrice === 'number' ? entry.regularPrice : null;
    const addedDate = entry.inDate || '';
    const dateOnly = String(addedDate).slice(0, 10);
    const todayOnly = String(shopDate || '').slice(0, 10);
    const isNew = Boolean(dateOnly && todayOnly && dateOnly === todayOnly);
    const contentItems = content.map((item) => ({ name: item.name || item.title || 'Item', image: safeImage(item.images?.icon) || safeImage(item.albumArt) || safeImage(item.images?.smallIcon) || '' }));
    return {
      id: String(entry.offerId || 'offer-' + index), index, name: String(name).replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\_/g,'_'), section: String(section), sectionOrder: Number(entry.layout?.index ?? 999), layoutRank: Number(entry.layout?.rank ?? 999), image, fallbackImage, price, regular, typeLabel, category, rarity, description: String(description), isNew, inDate: addedDate, outDate: entry.outDate || '', colors: [hexColor(entry.colors?.color1,'#514554'), hexColor(entry.colors?.color2 || entry.colors?.color3,'#242327')], contentItems, search: '',
      track: tracks[0] || null, cosmeticId: primary?.id || null, showcase: primary?.showcaseVideo || null, introduction: primary?.introduction?.text || '', set: primary?.set?.value || '', variants: primary?.variants || [], history: primary?.shopHistory || [], giftable: entry.giftable,
    };
  }
  function normalizeShop(payload) {
    const data = payload?.data;
    if (!Array.isArray(data?.entries)) throw Error('Unexpected item shop response.');
    const date = data.date || new Date().toISOString();
    const items = data.entries.map((entry,i) => normalize(entry, i, date)).filter(Boolean);
    items.forEach((item,i) => { item.index = i; });
    if (!items.length) throw Error('The item shop is currently empty.');
    for (const item of items) item.search = `${item.name} ${item.section} ${item.typeLabel} ${item.rarity} ${item.description} ${item.contentItems.map(x=>x.name).join(' ')}`.toLowerCase();
    return { date, items };
  }
  function readFavorites() {
    try { const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); if (Array.isArray(list)) state.favorites = new Set(list.filter(x => typeof x === 'string').slice(0,2000)); } catch { /* ignore */ }
    updateFavCount();
  }
  function updateFavCount() { const el = $('fav-count'); el.textContent = state.favorites.size; el.hidden = !state.favorites.size; }
  function toggleFavorite(index) {
    const item = state.items[index]; if (!item) return;
    const saved = state.favorites.has(item.id);
    if (saved) state.favorites.delete(item.id); else state.favorites.add(item.id);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites])); } catch { /* storage unavailable */ }
    updateFavCount();
    if (state.view === 'favorites') renderItems();
    else document.querySelectorAll(`[data-heart="${index}"]`).forEach((el) => { el.classList.toggle('is-saved',!saved); el.setAttribute('aria-label',`${saved?'Save':'Remove'} ${item.name} ${saved?'to':'from'} My List`); });
    if (state.active === index) updateModalSave();
    showToast(saved ? 'Removed from My List' : 'Added to My List');
  }
  function showToast(msg) { clearTimeout(state.toastTimer); ui.toast.textContent = msg; ui.toast.classList.add('is-visible'); state.toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'),2000); }
  function setStatus(status, label) { ui.statusPill.dataset.status = status; ui.statusLabel.textContent = label; }
  function showNotice(message) { ui.noticeText.textContent = message; ui.notice.hidden = false; }
  function clearNotice() { ui.notice.hidden = true; }
  function cache(shop) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({date:shop.date,items:shop.items, cachedAt:Date.now()})); } catch { /* may exceed quota */ }
  }
  function readCache() {
    try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY)); if (cached && Array.isArray(cached.items) && typeof cached.cachedAt === 'number' && Date.now() - cached.cachedAt < MAX_CACHE_AGE) return cached; } catch { /* ignore */ }
    return null;
  }
  async function fetchShop() {
    if (state.fetching) return;
    state.fetching = true;
    if (!state.items.length) setStatus('loading','Connecting');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let res;
      try { res = await fetch(API_URL + '&_=' + Date.now(), { signal: controller.signal, cache: 'no-store' }); }
      finally { clearTimeout(timer); }
      if (!res.ok) throw Error('Shop service returned HTTP ' + res.status);
      const shop = normalizeShop(await res.json());
      state.items = shop.items;
      state.shopDate = shop.date;
      state.live = true;
      cache(shop);
      clearNotice();
      setStatus('live', 'Live shop');
      renderAll();
      loadTrackPreviews();
    } catch (error) {
      state.live = false;
      if (!state.items.length) {
        const cached = readCache();
        if (cached) { state.items = cached.items; state.shopDate = cached.date; }
      }
      if (state.items.length) {
        setStatus('offline', 'Saved copy');
        showNotice(`Live shop couldn't be reached. Showing the ${displayDate(state.shopDate)} saved shop instead.`);
        renderAll();
        loadTrackPreviews();
      } else {
        setStatus('error','Unavailable');
        ui.itemCount.textContent = 'No data';
        ui.hero.classList.remove('is-loading');
        ui.results.innerHTML = `<div class="empty-state">${icon('bag')}<h3>Shop temporarily unavailable</h3><p>Couldn't connect to the Fortnite item shop. Check your connection and try again.</p><button type="button" id="empty-retry">Retry connection</button></div>`;
        ui.results.setAttribute('aria-busy','false');
        $('empty-retry')?.addEventListener('click',fetchShop);
      }
      console.warn('Ashlan Shop: live item shop unavailable:',error?.message || error);
    } finally { state.fetching = false; }
  }
  function nextReset(now) { const next = new Date(now); next.setUTCHours(24,0,0,0); return next.getTime(); }
  let previousReset = nextReset(new Date());
  function updateCountdown() {
    const now = Date.now(); const reset = nextReset(new Date(now));
    const remaining = Math.max(0,Math.floor((reset-now)/1000));
    const h = String(Math.floor(remaining/3600)).padStart(2,'0');
    const m = String(Math.floor((remaining%3600)/60)).padStart(2,'0');
    const s = String(remaining%60).padStart(2,'0');
    ui.heroCountdown.textContent = `${h}:${m}:${s}`;
    if (previousReset !== reset) { previousReset = reset; setTimeout(fetchShop,15000); }
  }
  function selectFeatured() {
    const picks = state.items.filter(x => x.category === 'outfit' && x.image);
    const newPicks = picks.filter(x => x.isNew);
    const bundles = state.items.filter(x => x.category === 'bundle' && x.image);
    const candidates = newPicks.length ? newPicks : picks.length ? picks : bundles.length ? bundles : state.items.filter(x=>x.image);
    return candidates.sort((a,b) => a.sectionOrder - b.sectionOrder || a.layoutRank - b.layoutRank)[0] || state.items[0];
  }
  function renderHero() {
    const item = selectFeatured(); state.featured = item?.index ?? null;
    if (!item) return;
    ui.hero.classList.remove('is-loading'); ui.hero.classList.add('is-ready');
    ui.heroDate.textContent = displayDate(state.shopDate).toUpperCase();
    ui.heroCaption.textContent = state.live ? 'THE DAILY ROTATION' : 'SAVED SHOP SNAPSHOT';
    ui.heroTitle.textContent = item.name;
    ui.heroDescription.textContent = item.description || `Explore ${item.name} and everything else in today's Fortnite Item Shop.`;
    ui.heroType.textContent = item.typeLabel;
    ui.heroPrice.innerHTML = vbucks(item.price);
    ui.heroGlow.style.background = `radial-gradient(ellipse at 72% 38%,${item.colors[0]}55,transparent 51%)`;
    if (item.image) {
      ui.heroArt.src = item.image; ui.heroArt.alt = item.name;
      ui.heroBackdrop.style.backgroundImage = `url("${item.image.replace(/["\\]/g,'')}")`;
      ui.heroArt.onerror = () => { if (item.fallbackImage && ui.heroArt.src !== item.fallbackImage) { ui.heroArt.src = item.fallbackImage; return; } ui.heroArt.removeAttribute('src'); ui.heroArt.alt = ''; };
    }
  }
  function filteredItems() {
    let items = state.items.filter(item => {
      if (state.view === 'favorites' && !state.favorites.has(item.id)) return false;
      if (state.view === 'new' && !item.isNew) return false;
      if (state.filter === 'other' && ['outfit','emote','pickaxe','bundle','music','car','instrument'].includes(item.category)) return false;
      if (state.filter !== 'all' && state.filter !== 'other' && item.category !== state.filter) return false;
      if (state.query && !item.search.includes(state.query)) return false;
      return true;
    });
    if (state.sort === 'low') items = items.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (state.sort === 'high') items = items.sort((a,b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    return items;
  }
  function cardHTML(item, order) {
    const saved = state.favorites.has(item.id);
    const price = vbucks(item.price);
    const old = item.regular != null && item.price != null && item.regular > item.price ? `<span class="price-old">${item.regular.toLocaleString('en-US')}</span>` : '';
    const image = item.image ? `<img class="item-art" src="${esc(item.image)}" data-fallback-image="${esc(item.fallbackImage || '')}" alt="${esc(item.name)}" loading="lazy" decoding="async">` : `<div class="card-no-art">${icon('bag')}</div>`;
    return `<article class="item-card ${item.track?'is-track':''}" role="button" tabindex="0" aria-label="View ${esc(item.name)} details" data-open="${item.index}" style="--item-light:${item.colors[0]};--item-dark:${item.colors[1]};animation-delay:${Math.min(order,8)*22}ms"><div class="item-bg"></div>${image}<div class="item-scrim"></div>${item.isNew ? '<span class="card-new">ADDED TODAY</span>' : ''}<button class="card-heart ${saved?'is-saved':''}" type="button" data-heart="${item.index}" aria-label="${saved?'Remove':'Save'} ${esc(item.name)} ${saved?'from':'to'} My List" title="${saved?'Remove from':'Save to'} My List">${icon('heart')}</button><div class="item-info"><span class="item-type">${esc(item.track?.artist || item.typeLabel)}</span><span class="item-title">${esc(item.name)}</span><span class="item-price-line">${price}${old}</span></div>${item.preview ? `<button class="card-play" data-play="${item.index}" aria-label="Preview ${esc(item.name)}">▶</button>`:''}</article>`;
  }
  function groupRows(items) {
    const groups = new Map();
    for (const item of items) {
      const key = item.section;
      if (!groups.has(key)) groups.set(key,{name:key,order:item.sectionOrder,rank:item.layoutRank,items:[]});
      groups.get(key).items.push(item);
    }
    return [...groups.values()].sort((a,b)=>a.order-b.order || a.rank-b.rank || a.name.localeCompare(b.name));
  }
  function renderRows(items) {
    const groups = groupRows(items);
    return groups.map((group,g) => `<section class="shop-row" aria-label="${esc(group.name)}"><div class="row-top"><div class="row-left"><h3 class="row-heading">${esc(group.name)}</h3><span class="row-count">${group.items.length}</span></div><div class="row-controls"><button class="round-nav prev" type="button" data-scroll="${g}" data-dir="-1" aria-label="Scroll ${esc(group.name)} left">${icon('chevron')}</button><button class="round-nav next" type="button" data-scroll="${g}" data-dir="1" aria-label="Scroll ${esc(group.name)} right">${icon('chevron')}</button></div></div><div class="horizontal-track" data-track="${g}">${group.items.map((x,i)=>cardHTML(x,i)).join('')}</div></section>`).join('');
  }
  function renderGrid(items) {
    const title = state.query ? `Results for “${esc(ui.search.value.trim())}”` : state.view === 'favorites' ? 'My List' : state.view === 'new' ? 'New Today' : state.filter === 'all' ? 'Shop Items' : document.querySelector(`.category[data-filter="${state.filter}"]`)?.textContent || 'Shop Items';
    return `<section class="grid-results"><div class="results-heading"><h3>${title}</h3><span>${items.length} ${items.length === 1?'item':'items'}</span></div><div class="card-grid">${items.map((item,i)=>cardHTML(item,i)).join('')}</div></section>`;
  }
  function renderEmpty() {
    let title='No matching items', desc='Try another search or choose a different category.';
    if (state.view === 'favorites' && !state.query && state.filter === 'all') {title='Your list is empty';desc='Tap the heart on any shop item to save it here.';}
    else if (state.view === 'new' && !state.query && state.filter === 'all') {title='No new items today';desc='There are no offers marked as newly added in the current shop.';}
    return `<div class="empty-state">${icon('search')}<h3>${title}</h3><p>${desc}</p><button type="button" id="clear-filters">Browse all items</button></div>`;
  }
  function renderItems() {
    if (!state.items.length) return;
    const items = filteredItems();
    ui.itemCount.textContent = `${state.items.length} offers`;
    const viewNames={shop:["THE DAILY DROP", "Today's Shop"],new:["JUST ADDED",'New Today'],favorites:['SAVED ITEMS','My List']};
    const [overline,heading] = viewNames[state.view]; ui.overline.textContent = overline; ui.heading.textContent = heading;
    const isRows = state.view === 'shop' && state.filter === 'all' && !state.query && state.sort === 'shop';
    ui.results.innerHTML = !items.length ? renderEmpty() : isRows ? renderRows(items) : renderGrid(items);
    ui.results.setAttribute('aria-busy','false');
    $('clear-filters')?.addEventListener('click',()=>{ state.view='shop';state.filter='all';state.query='';ui.search.value='';state.sort='shop';updateControls();renderItems(); });
    if (isRows) setupRowArrows();
  }
  function setupRowArrows() {
    for (const track of ui.results.querySelectorAll('.horizontal-track')) {
      const id = track.dataset.track;
      const buttons = ui.results.querySelectorAll(`[data-scroll="${id}"]`);
      const update = () => { const max = track.scrollWidth - track.clientWidth; buttons.forEach(b=>{b.disabled = b.dataset.dir === '-1' ? track.scrollLeft < 10 : track.scrollLeft >= max - 10;}); };
      track.addEventListener('scroll',update,{passive:true});
      setTimeout(update,0);
    }
  }
  function updateControls() {
    document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('is-active',el.dataset.view===state.view));
    document.querySelectorAll('.category').forEach(el=>{const selected=el.dataset.filter===state.filter;el.classList.toggle('is-active',selected);el.setAttribute('aria-pressed',String(selected));});
    $('sort-label').textContent = {shop:'Shop order',low:'Price: low to high',high:'Price: high to low'}[state.sort];
  }
  function renderAll() { renderHero();updateControls();renderItems(); }
  function openItem(index) {
    const item=state.items[index]; if (!item) return;
    state.active=index;state.lastFocused=document.activeElement;
    ui.modalTitle.textContent=item.name;
    ui.modalCategory.textContent=(item.section||'ITEM SHOP').toUpperCase();
    ui.modalDescription.textContent=item.description || 'Available in the Fortnite Item Shop.';
    ui.modalTags.innerHTML=[item.typeLabel,item.rarity,item.isNew?'New today':null].filter(Boolean).map(t=>`<span class="modal-tag">${esc(t)}</span>`).join('');
    ui.modalPrice.innerHTML=vbucks(item.price);
    ui.modalOldPrice.textContent=item.regular!=null&&item.price!=null&&item.regular>item.price?`${item.regular.toLocaleString('en-US')} V-Bucks`:'';
    ui.modalArtFrame.style.setProperty('--item-light',item.colors[0]);
    ui.modalArtFrame.style.setProperty('--item-dark',item.colors[1]);
    if(item.image){ui.modalImage.src=item.image;ui.modalImage.alt=item.name;ui.modalImage.hidden=false;ui.modalImage.onerror=()=>{if(item.fallbackImage && ui.modalImage.src!==item.fallbackImage){ui.modalImage.src=item.fallbackImage;return;}ui.modalImage.hidden=true;};}else{ui.modalImage.hidden=true;}
    const included=item.contentItems.filter(i=>i.image);
    ui.modalIncludes.hidden=item.contentItems.length<2;
    ui.includedList.innerHTML=included.map((i)=>`<div class="included-item"><img src="${esc(i.image)}" alt="${esc(i.name)}" loading="lazy"><span>${esc(i.name)}</span></div>`).join('');
    if (item.contentItems.length>included.length) ui.includedList.innerHTML+=`<span class="modal-tag">+${item.contentItems.length-included.length} other items</span>`;
    const details=[['Section',item.section],['Rarity',item.rarity],['Available since',shortDate(item.inDate)],['Leaves shop',shortDate(item.outDate)]].filter(x=>x[1]);
    ui.modalDetails.innerHTML=details.map(([a,b])=>`<div class="detail-row"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('');
    updateModalSave();
    renderMedia(item);
    renderExtraDetails(item);
    ui.modal.hidden=false;ui.modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
    $('modal-close').focus();
  }
  function updateModalSave() {
    if (state.active===null) return; const item=state.items[state.active];if(!item)return;
    const saved=state.favorites.has(item.id);
    ui.modalSave.innerHTML=`${icon(saved?'check':'heart')}<span>${saved?'Saved to My List':'Save to My List'}</span>`;
  }
  function closeItem() { if(ui.modal.hidden)return;$('modal-media').replaceChildren();ui.modal.hidden=true;ui.modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');state.active=null;state.lastFocused?.focus?.(); }
  function setView(view) { state.view=view; state.filter='all'; state.sort='shop'; state.query=''; ui.search.value=''; updateControls(); renderItems(); $('shop-content').scrollIntoView({behavior:'smooth'}); }
  function onScroll() {ui.header.classList.toggle('is-scrolled',scrollY>36);}

  function wire() {
    window.addEventListener('scroll',onScroll,{passive:true});onScroll();
    $('brand-link').addEventListener('click',(e)=>{ e.preventDefault();state.view='shop';state.filter='all';state.query='';state.sort='shop';ui.search.value='';updateControls();renderItems();window.scrollTo({top:0,behavior:'smooth'}); });
    document.querySelectorAll('.nav-link').forEach(x=>x.addEventListener('click',()=>setView(x.dataset.view)));
    $('header-heart').addEventListener('click',()=>setView('favorites'));
    document.querySelectorAll('.category').forEach(x=>x.addEventListener('click',()=>{state.filter=x.dataset.filter;updateControls();renderItems();}));
    $('sort-button').addEventListener('click',()=>{state.sort=state.sort==='shop'?'low':state.sort==='low'?'high':'shop';updateControls();renderItems();});
    ui.search.addEventListener('input',()=>{state.query=ui.search.value.trim().toLowerCase();renderItems();if(state.query)$('shop-content').scrollIntoView({behavior:'smooth',block:'start'});});
    $('mobile-search').addEventListener('click',()=>{const wrap=$('search-wrap');wrap.classList.toggle('is-mobile-open');if(wrap.classList.contains('is-mobile-open'))ui.search.focus();});
    ui.heroInfo.addEventListener('click',()=>{if(state.featured!==null)openItem(state.featured);});
    $('footer-refresh').addEventListener('click',fetchShop);
    $('retry-button').addEventListener('click',fetchShop);
    $('modal-close').addEventListener('click',closeItem);
    ui.modal.addEventListener('click',(e)=>{if(e.target.closest('[data-close="true"]'))closeItem();});
    ui.modalSave.addEventListener('click',()=>{if(state.active!==null)toggleFavorite(state.active);});
    ui.results.addEventListener('click',(e)=>{
      const play=e.target.closest('[data-play]');if(play){e.stopPropagation();playTrack(Number(play.dataset.play));return;}
      const heart=e.target.closest('[data-heart]'); if(heart){e.stopPropagation();toggleFavorite(Number(heart.dataset.heart));return;}
      const nav=e.target.closest('[data-scroll]');if(nav){const track=ui.results.querySelector(`[data-track="${nav.dataset.scroll}"]`);if(track)track.scrollBy({left:Number(nav.dataset.dir)*track.clientWidth*.78,behavior:'smooth'});return;}
      const card=e.target.closest('[data-open]');if(card)openItem(Number(card.dataset.open));
    });
    ui.results.addEventListener('error',(e)=>{const img=e.target;if(!img.matches?.('img.item-art'))return;const fallback=img.dataset.fallbackImage;if(fallback && img.src!==fallback){img.src=fallback;}else{img.style.opacity='0';}},true);
    ui.results.addEventListener('keydown',(e)=>{if(e.target.matches('[data-open]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openItem(Number(e.target.dataset.open));}});
    document.addEventListener('keydown',(e)=>{
      if(e.key==='Escape'){if(!ui.modal.hidden){closeItem();return;}if($('search-wrap').classList.contains('is-mobile-open'))$('search-wrap').classList.remove('is-mobile-open');else if(document.activeElement===ui.search){ui.search.value='';state.query='';renderItems();ui.search.blur();}}
      if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&ui.modal.hidden&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('search-wrap').classList.add('is-mobile-open');ui.search.focus();}
      if(e.key==='Tab'&&!ui.modal.hidden){const focusable=[...ui.modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),summary,iframe')].filter(el=>el.getClientRects().length);if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.live&&state.shopDate&&new Date().toISOString().slice(0,10)!==state.shopDate.slice(0,10))fetchShop();});
  }

  let trackCatalog = null;
  let catalogPromise = null;
  async function loadTrackPreviews() {
    try {
      catalogPromise ||= fetch(TRACKS_URL,{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error('Preview catalog unavailable');return r.json();});
      trackCatalog = await catalogPromise;
      for(const item of state.items){const record=item.track && trackCatalog[item.track.devName];if(record && record.title.toLowerCase()===item.track.title.toLowerCase())item.preview=safeImage(record.previewUrl);}
      renderItems();
      if(state.active!==null)renderMedia(state.items[state.active]);
    }catch{catalogPromise=null;}
  }
  function playTrack(index) {
    const item=state.items[index];if(!item?.preview)return;
    const audio=$('track-audio');
    if(audio.src===item.preview&&!audio.paused){audio.pause();return;}
    audio.src=item.preview;$('player-title').textContent=item.name;$('player-artist').textContent=item.track?.artist||'';$('player-art').src=item.track?.albumArt||item.image;$('audio-player').hidden=false;
    audio.play().catch(()=>showToast('Preview could not play. Try the play control again.'));
  }
  function renderMedia(item) {
    const media=$('modal-media');media.replaceChildren();
    if(item.track){
      media.innerHTML=item.preview?`<button class="button button-primary" id="preview-track">▶ Play audio preview</button><p class="media-note">Music preview · via FNFestival / Spotify</p>`:`<p class="media-note">Audio preview unavailable for this track.</p>`;
      $('preview-track')?.addEventListener('click',()=>playTrack(item.index));
    }else if(item.cosmeticId){
      media.innerHTML='<p class="media-note">Checking showcase availability…</p>';
      fetch(`https://fortnite-api.com/v2/cosmetics/br/${encodeURIComponent(item.cosmeticId)}?responseFlags=7`,{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(({data})=>{
        if(state.active!==item.index)return;
        Object.assign(item,{history:data.shopHistory||[],variants:data.variants||[],showcase:data.showcaseVideo||item.showcase});renderExtraDetails(item);
        if(/^[\w-]{11}$/.test(item.showcase||'')){
          media.innerHTML='<button class="button button-outline" id="load-showcase">▶ Watch showcase with audio</button><p class="media-note">Loads YouTube when selected.</p>';
          $('load-showcase').onclick=()=>{ $('track-audio').pause();media.innerHTML=`<iframe title="${esc(item.name)} showcase" src="https://www.youtube-nocookie.com/embed/${esc(item.showcase)}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><a class="media-note" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v=${esc(item.showcase)}">Open showcase on YouTube ↗</a>`; };
        }else media.innerHTML='<p class="media-note">No audio or video preview supplied for this cosmetic.</p>';
      }).catch(()=>{if(state.active===item.index)media.innerHTML='<p class="media-note">Showcase is temporarily unavailable.</p>';});
    }
  }
  function renderExtraDetails(item) {
    const track=item.track;
    const details=[['Section',item.section],['Rarity',item.rarity],['Introduced',item.introduction],['Set',item.set],['Available since',shortDate(item.inDate)],['Leaves shop',shortDate(item.outDate)],['Giftable',typeof item.giftable==='boolean'?(item.giftable?'Yes':'No'):null],['Shop appearances',item.history?.length||null],['Style options',item.variants?.reduce((n,v)=>n+(v.options?.length||0),0)||null],['Artist',track?.artist],['Release year',track?.releaseYear],['Tempo',track?.bpm?`${track.bpm} BPM`:null],['Duration',track?.duration?`${Math.floor(track.duration/60)}:${String(track.duration%60).padStart(2,'0')}`:null]].filter(x=>x[1]);
    ui.modalDetails.innerHTML=details.map(([a,b])=>`<div class="detail-row"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('');
    if(track?.difficulty)ui.modalDetails.innerHTML+=`<div class="difficulty"><h3>Instrument difficulty</h3>${Object.entries(track.difficulty).map(([part,n])=>`<div class="detail-row"><span>${esc(part.replace(/([A-Z])/g,' $1'))}</span><meter min="0" max="6" value="${Math.min(6,Math.max(0,Number(n)||0))}" aria-label="${esc(part)} difficulty ${esc(n)} of 6"></meter><span>${esc(n)} / 6</span></div>`).join('')}</div>`;
    const styles=(item.variants||[]).flatMap(v=>(v.options||[]).map(option=>({...option,channel:v.type||v.channel||'Style'}))).filter(option=>safeImage(option.image));
    if(styles.length){
      const section=document.createElement('details');section.className='style-options';
      section.innerHTML=`<summary>Preview styles · ${styles.length}</summary><div class="style-grid">${styles.map((option,i)=>`<button type="button" data-style="${i}" aria-label="Preview ${esc(option.name||option.tag||'style')}" title="${esc(option.name||option.tag||'Style')}"><img src="${esc(safeImage(option.image))}" loading="lazy" alt=""><span>${esc(option.name||option.tag||'Style')}</span></button>`).join('')}</div>`;
      section.addEventListener('click',e=>{const button=e.target.closest('[data-style]');if(!button)return;const option=styles[Number(button.dataset.style)];ui.modalImage.src=safeImage(option.image);ui.modalImage.alt=`${item.name} — ${option.name||'Style'}`;ui.modalImage.hidden=false;});
      ui.modalDetails.append(section);
    }
    if(item.history?.length){const dates=[...new Set(item.history.map(shortDate).filter(Boolean))].reverse();ui.modalDetails.insertAdjacentHTML('beforeend',`<details class="shop-history"><summary>Shop history · ${dates.length} days</summary><p>${dates.map(esc).join(' · ')}</p></details>`);}
  }
  $('player-close').addEventListener('click',()=>{$('track-audio').pause();$('track-audio').removeAttribute('src');$('track-audio').load();$('audio-player').hidden=true;});
  $('share-item').addEventListener('click',async()=>{const item=state.items[state.active];if(!item)return;const url=new URL(location.href);url.hash='item='+encodeURIComponent(item.id);try{await navigator.clipboard.writeText(url.href);showToast('Item link copied');}catch{showToast('Copy this page URL to share');history.replaceState(null,'',url);}});
  readFavorites();wire();updateCountdown();setInterval(updateCountdown,1000);fetchShop().then(()=>{if(location.hash.startsWith('#item=')){const id=decodeURIComponent(location.hash.slice(6));const item=state.items.find(x=>x.id===id);if(item)openItem(item.index);}});
  if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}

})();

