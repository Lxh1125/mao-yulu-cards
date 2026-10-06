'use strict';
class MaoCardApp {
  constructor() {
    this.storageKey = 'zhixing-cards-v1';
    this.card = document.getElementById('card');
    this.quoteElement = document.getElementById('quote');
    this.sourcePanel = document.getElementById('sourcePanel');
    this.notice = document.getElementById('notice');
    const saved = this.readState(), valid = new Set(maoQuotes.map(q => q.id));
    const savedLikes = (Array.isArray(saved.favorites) ? saved.favorites : []).map(id => id === 62 ? 33 : id);
    this.retainedFavorites = savedLikes.filter(id => Number.isInteger(id) && id >= 1 && id <= 150 && !valid.has(id));
    this.favorites = new Set(savedLikes.filter(id => valid.has(id)));
    this.visited = new Set((Array.isArray(saved.visited) ? saved.visited : []).filter(id => valid.has(id)));
    const restored = maoQuotes.findIndex(q => q.id === saved.currentId);
    this.currentIndex = restored >= 0 ? restored : 0;
    this.history = []; this.swipeUntil = 0;
    this.stage = document.getElementById('stage');
    this.effects = document.getElementById('effects');
    this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    this.transitioning = false; this.transitionAnimations = [];
    this.motionQuery.addEventListener('change', () => {if (this.motionQuery.matches) this.stopEffects();});
    document.addEventListener('visibilitychange', () => {if (document.hidden) this.stopEffects();});
    this.bindEvents(); this.render();
    this.resizeObserver = new ResizeObserver(() => this.fitQuote());
    this.resizeObserver.observe(document.querySelector('.quote-area'));
  }
  readState() {
    try {const value = JSON.parse(localStorage.getItem(this.storageKey) || '{}'); return value && typeof value === 'object' ? value : {};}
    catch {return {};}
  }
  saveState() {
    try {localStorage.setItem(this.storageKey, JSON.stringify({currentId:maoQuotes[this.currentIndex].id,favorites:[...this.favorites,...this.retainedFavorites],visited:[...this.visited]}));}
    catch {this.notice.textContent = '浏览器未允许保存，喜欢标记本次有效。';}
  }
  landscapeFor(quote) { return landscapes[(quote.id - 1) % landscapes.length]; }
  render(animate = false) {
    const quote = maoQuotes[this.currentIndex], landscape = this.landscapeFor(quote);
    this.visited.add(quote.id);
    document.getElementById('cardCategory').textContent = quote.category;
    document.getElementById('cardNumber').textContent = `${String(this.currentIndex + 1).padStart(2,'0')} / ${maoQuotes.length}`;
    this.quoteElement.textContent = quote.content.length <= 30 ? quote.content.replace(/[，；]/g, mark => mark + '\n') : quote.content;
    this.quoteElement.classList.toggle('medium', quote.content.length > 30 && quote.content.length <= 45);
    this.quoteElement.classList.toggle('long', quote.content.length > 45);
    for (const id of ['artwork','artworkBackdrop']) {
      const art = document.getElementById(id); art.hidden = false; art.src = landscape.src; art.style.objectPosition = landscape.position;
    }
    document.getElementById('photoLocation').textContent = landscape.place;
    document.getElementById('previous').disabled = !this.history.length;
    this.renderFavorite(); this.renderSource(); this.fitQuote();
    this.saveState();
  }
  renderFavorite() {
    const selected = this.favorites.has(maoQuotes[this.currentIndex].id), button = document.getElementById('favorite');
    this.card.classList.toggle('is-liked', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', selected ? '取消喜欢这张卡片' : '喜欢这张卡片');
    button.querySelector('.heart').textContent = selected ? '♥' : '♡';
    document.getElementById('favoriteLabel').textContent = selected ? '已喜欢' : '喜欢';
  }
  fitQuote() {
    // Keep every selected quote within the reading zone, even on short Safari viewports.
    this.quoteElement.style.fontSize = '';
    const area = document.querySelector('.quote-area');
    let size = parseFloat(getComputedStyle(this.quoteElement).fontSize);
    while (this.quoteElement.scrollHeight > area.clientHeight && size > 20) {
      size -= 1; this.quoteElement.style.fontSize = `${size}px`;
    }
  }
  renderSource() {
    const quote = maoQuotes[this.currentIndex], landscape = this.landscapeFor(quote);
    document.getElementById('sourceDetail').textContent = quote.source;
    document.getElementById('originalSource').href = quote.sourceUrl;
    document.getElementById('verificationNote').textContent = quote.verificationNote;
    const attribution = document.getElementById('photoAttribution');
    attribution.replaceChildren(document.createTextNode(`景观摄影：${landscape.author} · ${landscape.license} · `));
    const link = document.createElement('a'); link.href = landscape.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '照片来源'; attribution.append(link);
    if (landscape.licenseUrl) {const license = document.createElement('a'); license.href = landscape.licenseUrl; license.target = '_blank'; license.rel = 'noopener noreferrer'; license.textContent = '许可'; attribution.append(document.createTextNode(' · '),license);}
  }
  next() {
    if (this.transitioning) return;
    const options = maoQuotes.map((q,i)=>i).filter(i=>i!==this.currentIndex);
    const unread = options.filter(i=>!this.visited.has(maoQuotes[i].id)), candidates = unread.length ? unread : options;
    const newIndex = candidates[Math.floor(Math.random()*candidates.length)];
    this.changeCard(newIndex, 1, () => {this.history.push(this.currentIndex); if (this.history.length > 60) this.history.shift();});
  }
  previous() {
    if (this.transitioning || !this.history.length) return;
    const newIndex = this.history[this.history.length - 1];
    this.changeCard(newIndex, -1, () => this.history.pop());
  }
  changeCard(index, direction, updateHistory) {
    const animated = !this.motionQuery.matches && typeof this.card.animate === 'function';
    let snapshot;
    if (animated) {
      snapshot = document.createElement('div');
      snapshot.className = this.card.className + ' page-ghost';
      snapshot.innerHTML = this.card.innerHTML;
      snapshot.setAttribute('aria-hidden', 'true'); snapshot.inert = true;
      snapshot.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      snapshot.querySelector('.effects').replaceChildren();
      this.stage.append(snapshot);
    }
    updateHistory(); this.currentIndex = index; this.render();
    if (!animated) return;
    this.transitioning = true; this.card.classList.add('is-switching'); this.card.setAttribute('aria-busy', 'true');
    const outgoing = snapshot.animate([
      {transform:'translateX(0) rotateY(0deg) scale(1)',opacity:1},
      {transform:`translateX(${-direction * 52}%) rotateY(${-direction * 22}deg) scale(.96)`,opacity:0}
    ],{duration:420,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
    const incoming = this.card.animate([
      {transform:`translateX(${direction * 35}%) rotateY(${direction * 16}deg) scale(.97)`,opacity:.2},
      {transform:'translateX(0) rotateY(0deg) scale(1)',opacity:1}
    ],{duration:520,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
    this.transitionAnimations = [outgoing, incoming];
    // A small one-shot settling motion adds depth while the scenery stays dark.
    document.getElementById('artwork').animate([
      {transform:`translateX(${direction * 8}px) translateY(5px) scale(1.035)`},
      {transform:'translateX(0) translateY(0) scale(1)'}
    ],{duration:850,easing:'cubic-bezier(.2,.8,.2,1)'});
    Promise.allSettled(this.transitionAnimations.map(animation => animation.finished)).then(() => {
      snapshot.remove(); outgoing.cancel(); incoming.cancel();
      this.transitionAnimations = []; this.transitioning = false;
      this.card.classList.remove('is-switching'); this.card.removeAttribute('aria-busy');
    });
  }
  stopEffects() {
    this.transitionAnimations.forEach(animation => animation.cancel());
    this.effects.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    this.effects.replaceChildren();
    document.getElementById('artwork').getAnimations().forEach(animation => animation.cancel());
    document.querySelector('.heart').getAnimations().forEach(animation => animation.cancel());
  }
  favoriteEffect(selected) {
    if (this.motionQuery.matches || typeof this.card.animate !== 'function') return;
    const heart = document.querySelector('.heart');
    heart.getAnimations().forEach(animation => animation.cancel());
    heart.animate([{transform:'scale(1)'},{transform:`scale(${selected ? 1.28 : .82})`,offset:.35},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
    this.effects.replaceChildren();
    if (!selected) return;
    const card = this.card.getBoundingClientRect(), button = document.getElementById('favorite').getBoundingClientRect();
    const x = button.x + button.width/2 - card.x, y = button.y + button.height/2 - card.y;
    const ripple = document.createElement('span'); ripple.className = 'favorite-ripple';
    ripple.style.left = `${x - 41}px`; ripple.style.top = `${y - 37}px`; this.effects.append(ripple);
    const wave = ripple.animate([{transform:'scale(.85)',opacity:.7},{transform:'scale(1.9)',opacity:0}],{duration:650,easing:'ease-out'});
    wave.finished.catch(()=>{}).finally(()=>ripple.remove());
    for(let i=0;i<12;i++) {
      const angle = i*Math.PI/6, distance = 82 + (i%3)*18;
      const particle = document.createElement('span'); particle.className = 'gold-particle'; particle.style.left = `${x-2}px`; particle.style.top = `${y-2}px`;
      this.effects.append(particle);
      const animation = particle.animate([
        {transform:`translate(${Math.cos(angle)*30}px,${Math.sin(angle)*30}px) rotate(45deg) scale(.6)`,opacity:0},
        {opacity:1,offset:.12},
        {transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance}px) rotate(135deg) scale(.15)`,opacity:0}
      ],{duration:740 + (i%3)*65,easing:'cubic-bezier(.1,.6,.3,1)'});
      animation.finished.catch(()=>{}).finally(()=>particle.remove());
    }
  }
  bindEvents() {
    this.card.addEventListener('click', e => {
      if (e.target.closest('button,a') || (e.detail > 0 && performance.now() < this.swipeUntil)) return;
      this.next();
    });
    document.getElementById('next').addEventListener('click',()=>this.next());
    document.getElementById('previous').addEventListener('click',()=>this.previous());
    document.getElementById('favorite').addEventListener('click',()=>{
      if (this.transitioning) return;
      const id = maoQuotes[this.currentIndex].id;
      this.favorites.has(id) ? this.favorites.delete(id) : this.favorites.add(id);
      this.renderFavorite(); this.fitQuote(); this.saveState(); this.favoriteEffect(this.favorites.has(id));
    });
    document.getElementById('showSource').addEventListener('click',()=>{
      if (this.transitioning) return;
      this.sourcePanel.showModal(); document.getElementById('showSource').setAttribute('aria-expanded','true');
    });
    document.getElementById('closeSource').addEventListener('click',()=>this.sourcePanel.close());
    this.sourcePanel.addEventListener('close',()=>document.getElementById('showSource').setAttribute('aria-expanded','false'));
    this.sourcePanel.addEventListener('click',e=>{if(e.target===this.sourcePanel){const r=this.sourcePanel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.sourcePanel.close();}});
    document.getElementById('artwork').addEventListener('error', e=>{e.target.hidden=true;document.getElementById('artworkBackdrop').hidden=true;document.getElementById('photoLocation').textContent='';});
    document.addEventListener('keydown',e=>{
      if (this.sourcePanel.open || e.ctrlKey || e.metaKey || e.altKey) return;
      if(e.key==='ArrowRight'){e.preventDefault();this.next();return;}
      if(e.key==='ArrowLeft'){e.preventDefault();this.previous();return;}
      if(e.target.closest('button,a,input,textarea,select'))return;
      if(e.key===' '||e.key==='Enter'){e.preventDefault();this.next();}
      if(e.key.toLowerCase()==='s')document.getElementById('showSource').click();
    });
    let start = null;
    this.card.addEventListener('touchstart',e=>{
      this.swipeUntil=0;
      start=e.touches.length===1 && !e.target.closest('button,a') ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : null;
    },{passive:true});
    this.card.addEventListener('touchend',e=>{
      if(!start)return;
      const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;
      if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)){e.preventDefault();this.swipeUntil=performance.now()+400;dx<0?this.next():this.previous();}
    },{passive:false});
    this.card.addEventListener('touchcancel',()=>{start=null;});
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  window.maoCardApp=new MaoCardApp();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
