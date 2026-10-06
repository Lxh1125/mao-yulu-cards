'use strict';
class MaoCardApp {
  constructor() {
    this.storageKey = 'zhixing-cards-v1';
    this.notice = document.getElementById('notice');
    const saved = this.readState();
    const valid = new Set(maoQuotes.map(q => q.id));
    if (Array.isArray(saved.favorites)) saved.favorites = saved.favorites.map(id => id === 62 ? 33 : id);
    this.retainedFavorites = (Array.isArray(saved.favorites) ? saved.favorites : []).filter(id => Number.isInteger(id) && id >= 1 && id <= 150 && !valid.has(id));
    this.favorites = new Set((Array.isArray(saved.favorites) ? saved.favorites : []).filter(id => valid.has(id)));
    this.visited = new Set((Array.isArray(saved.visited) ? saved.visited : []).filter(id => valid.has(id)));
    const restored = maoQuotes.findIndex(q => q.id === saved.currentId);
    this.currentIndex = restored >= 0 ? restored : Math.max(0, maoQuotes.findIndex(q => q.id === 23));
    this.category = 'all'; this.onlyFavorites = false; this.history = []; this.sourceOpen = false; this.swipeConsumed = false;
    this.card = document.getElementById('card');
    this.buildCategories(); this.bindEvents(); this.render();
  }
  readState() {
    try {const value = JSON.parse(localStorage.getItem(this.storageKey) || '{}'); return value && typeof value === 'object' ? value : {};}
    catch {return {};}
  }
  saveState() {
    try {localStorage.setItem(this.storageKey, JSON.stringify({currentId:maoQuotes[this.currentIndex].id,favorites:[...this.favorites,...this.retainedFavorites],visited:[...this.visited]}));}
    catch {this.notice.textContent = '浏览器无法保存阅读记录，本次阅读仍可继续。';}
  }
  buildCategories() {
    for (const category of new Set(maoQuotes.map(q => q.category))) {
      const option = document.createElement('option'); option.value = category; option.textContent = category;
      document.getElementById('category').append(option);
    }
  }
  pool() {
    return maoQuotes.map((q,i) => ({q,i})).filter(({q}) => (this.category === 'all' || q.category === this.category) && (!this.onlyFavorites || this.favorites.has(q.id))).map(({i}) => i);
  }
  landscapeFor(quote) {
    return landscapes[(quote.id - 1) % landscapes.length];
  }
  artworkFor(quote) { return this.landscapeFor(quote).src; }
  render(animate = false) {
    const pool = this.pool(), empty = pool.length === 0;
    document.querySelector('.card-stack').hidden = empty; document.getElementById('empty').hidden = !empty;
    document.getElementById('empty').querySelector('p').textContent = this.favorites.size ? '这个主题还没有收藏。' : '这里还没有收藏。';
    document.getElementById('favoriteCount').textContent = this.favorites.size;
    document.getElementById('collection').setAttribute('aria-pressed', String(this.onlyFavorites));
    for (const id of ['favorite','showSource','next']) document.getElementById(id).disabled = empty;
    document.getElementById('previous').disabled = empty || !this.history.some(i => pool.includes(i));
    if (empty) {this.sourceOpen = false; this.renderSource(); document.getElementById('progressText').textContent = '0 条收藏'; document.getElementById('progressFill').style.width = '0%'; document.querySelector('.progress-bar').setAttribute('aria-valuenow', '0'); document.getElementById('photoLocation').textContent = ''; return;}
    if (!pool.includes(this.currentIndex)) this.currentIndex = pool[0];
    const quote = maoQuotes[this.currentIndex]; this.visited.add(quote.id);
    document.getElementById('cardCategory').textContent = quote.category;
    document.getElementById('cardNumber').textContent = String(quote.id).padStart(3,'0');
    const text = document.getElementById('quote'); text.textContent = quote.content.length <= 30 ? quote.content.replace(/[，；]/g, match => match + String.fromCharCode(10)) : quote.content;
    this.card.dataset.density = quote.content.length > 65 ? 'long' : quote.content.length > 35 ? 'medium' : 'short';
    text.classList.toggle('medium', quote.content.length > 35 && quote.content.length <= 65); text.classList.toggle('long', quote.content.length > 65);
    document.getElementById('source').textContent = quote.source;
    const art = document.getElementById('artwork'); art.hidden = false; const landscape = this.landscapeFor(quote);
    art.src = landscape.src;
    art.style.objectPosition = landscape.position;
    const backdrop = document.getElementById('artworkBackdrop');
    backdrop.hidden = false; backdrop.src = landscape.src; backdrop.style.objectPosition = landscape.position;
    document.getElementById('photoLocation').textContent = landscape.place;
    const selected = this.favorites.has(quote.id), favorite = document.getElementById('favorite');
    favorite.textContent = selected ? '✓ 已收藏' : '＋ 收藏'; favorite.setAttribute('aria-pressed',String(selected));
    const read = pool.filter(i => this.visited.has(maoQuotes[i].id)).length;
    document.getElementById('progressText').textContent = `第 ${pool.indexOf(this.currentIndex) + 1} 条，共 ${pool.length} 条`;
    document.getElementById('progressFill').style.width = `${read / pool.length * 100}%`;
    const progress = document.querySelector('.progress-bar');
    progress.setAttribute('aria-valuenow', String(read));
    progress.setAttribute('aria-valuemax', String(pool.length));
    this.renderSource(); this.card.classList.remove('entering');
    if (animate) {void this.card.offsetWidth; this.card.classList.add('entering');}
    this.saveState();
  }
  renderSource() {
    document.getElementById('sourcePanel').hidden = !this.sourceOpen;
    document.getElementById('showSource').setAttribute('aria-expanded',String(this.sourceOpen));
    document.getElementById('showSource').textContent = this.sourceOpen ? '收起出处' : '查看出处';
    const quote = maoQuotes[this.currentIndex];
    document.getElementById('sourceDetail').textContent = quote.source;
    const original = document.getElementById('originalSource'); original.hidden = !quote.sourceUrl;
    if (quote.sourceUrl) original.href = quote.sourceUrl;
    document.getElementById('verificationNote').textContent = quote.verificationNote || '';
    const landscape = this.landscapeFor(maoQuotes[this.currentIndex]);
    const attribution = document.getElementById('photoAttribution');
    attribution.replaceChildren(document.createTextNode(`景观摄影：${landscape.author} · ${landscape.license} · `));
    const link = document.createElement('a'); link.href = landscape.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '照片来源'; attribution.append(link);
    if (landscape.licenseUrl) {const license = document.createElement('a'); license.href = landscape.licenseUrl; license.target = '_blank'; license.rel = 'noopener noreferrer'; license.textContent = '许可'; attribution.append(document.createTextNode(' · '), license);}

  }
  next() {
    const options = this.pool().filter(i => i !== this.currentIndex); if (!options.length) return;
    const unread = options.filter(i => !this.visited.has(maoQuotes[i].id)), candidates = unread.length ? unread : options;
    this.history.push(this.currentIndex); if (this.history.length > 150) this.history.shift();
    this.currentIndex = candidates[Math.floor(Math.random() * candidates.length)]; this.sourceOpen = false; this.render(true);
  }
  previous() {
    const pool = this.pool();
    while (this.history.length) {const index = this.history.pop(); if (pool.includes(index)) {this.currentIndex = index; this.sourceOpen = false; this.render(true); return;}}
  }
  bindEvents() {
    this.card.addEventListener('click', () => {if (this.swipeConsumed) {this.swipeConsumed = false; return;} this.next();});
    document.getElementById('next').addEventListener('click', () => this.next());
    document.getElementById('previous').addEventListener('click', () => this.previous());
    document.getElementById('favorite').addEventListener('click', () => {
      const id = maoQuotes[this.currentIndex].id; this.favorites.has(id) ? this.favorites.delete(id) : this.favorites.add(id); this.render(); this.saveState();
    });
    document.getElementById('showSource').addEventListener('click', () => {this.sourceOpen = !this.sourceOpen; this.renderSource();});
    document.getElementById('closeSource').addEventListener('click', () => {this.sourceOpen = false; this.renderSource(); document.getElementById('showSource').focus();});
    document.getElementById('category').addEventListener('change', e => {this.category = e.target.value; this.history = []; this.sourceOpen = false; this.render(true);});
    document.getElementById('collection').addEventListener('click', () => {this.onlyFavorites = !this.onlyFavorites; this.history = []; this.sourceOpen = false; this.render(true);});
    document.getElementById('backToAll').addEventListener('click', () => {this.onlyFavorites = false; this.category = 'all'; document.getElementById('category').value = 'all'; this.render(true);});
    document.getElementById('artwork').addEventListener('error', e => {e.target.hidden = true; document.getElementById('photoLocation').textContent = '景观暂未加载'; document.getElementById('artworkBackdrop').hidden = true;});
    document.addEventListener('keydown', e => {
      // Keep Enter and Space on native controls from triggering a second card change.
      if (e.target.closest('button,select,input,textarea,a') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {e.preventDefault(); this.next();}
      if (e.key === 'ArrowLeft') {e.preventDefault(); this.previous();}
      if (e.key.toLowerCase() === 's' && this.pool().length) {this.sourceOpen = !this.sourceOpen; this.renderSource();}
    });
    let start = null;
    this.card.addEventListener('touchstart', e => {this.swipeConsumed = false; if (e.touches.length === 1) start = {x:e.touches[0].clientX,y:e.touches[0].clientY};}, {passive:true});
    this.card.addEventListener('touchend', e => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y; start = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {e.preventDefault(); this.swipeConsumed = true; dx < 0 ? this.next() : this.previous();}
    }, {passive:false});
    this.card.addEventListener('touchcancel', () => {start = null;});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.maoCardApp = new MaoCardApp();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
});
