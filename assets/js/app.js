/* SliceCraft — scroll film engine + interactions. No build step.
   Edit STEPS (making chapters) and MENU (products) below. */
(() => {
'use strict';

/* ================= CONTENT ================= */
const STEPS = [
  { t:'The <em class="serif">dough</em> wakes up', d:'A 48-hour cold-fermented dough ball, dusted with semolina, opens into a 12-inch round with a proud, airy rim.', c:['Tipo 00 flour','48 hr ferment','Hand-stretched'] },
  { t:'A spiral of <em class="serif">San Marzano</em>', d:'Crushed by hand with sea salt and spread in one slow spiral, stopping a thumb short of the edge.', c:['San Marzano','Sea salt','No sugar'] },
  { t:'Toppings <em class="serif">rain down</em>', d:'Torn fior di latte, crisp pepperoni, Kalamata olives, red onion and basil, placed so every slice gets its share.', c:['Fior di latte','Pepperoni','Basil'] },
  { t:'Into the <em class="serif">fire</em>', d:'485°C of oak-fired dome. Ninety seconds is all it takes for leopard spots, bubbling cheese and cupped pepperoni.', c:['Oak wood','90 seconds','Leopard crust'], temp:485 },
  { t:'Eight perfect <em class="serif">slices</em>', d:'One rocking cut, eight even slices, and that first stretch of cheese that tells you it is ready.', c:['8 slices','Cheese pull'] },
  { t:'Boxed while it <em class="serif">sings</em>', d:'Straight into our vented kraft box, so the crust stays crisp and the steam has somewhere to go.', c:['Vented kraft','Crisp crust'] },
  { t:'Sealed &amp; <em class="serif">on its way</em>', d:'Lid down, signature seal on. Hot, fresh and out the door to you in under 30 minutes.', c:['Sealed fresh','30 min delivery'] }
];
const MENU = [
  { name:'Margherita Classica', desc:'San Marzano, fior di latte, basil, olive oil.', price:399, veg:true,  img:'assets/img/menu-margherita.jpg', bg:'#2E9E5B' },
  { name:'Pepperoni Inferno',   desc:'Cupped pepperoni, hot honey, chilli flakes.', price:549, veg:false, img:'assets/img/menu-pepperoni.jpg', bg:'#FFB51F' },
  { name:'Farmhouse Garden',    desc:'Roasted peppers, mushroom, corn, olives.',    price:479, veg:true,  img:'assets/img/menu-farmhouse.jpg', bg:'#E63B2E' },
  { name:'Paneer Tikka Fire',   desc:'Tandoori paneer, onion, capsicum, mint drizzle.', price:519, veg:true, img:'assets/img/menu-paneer.jpg', bg:'#F7801E' }
];

/* ================= HELPERS ================= */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const clamp = (v, a=0, b=1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (p, a, b) => clamp((p - a) / (b - a));
const isMobile = () => window.innerWidth < 860;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = typeof window.gsap !== 'undefined';
if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ================= SMOOTH SCROLL ================= */
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  if (hasGSAP) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  else { const r = t => { lenis.raf(t); requestAnimationFrame(r); }; requestAnimationFrame(r); }
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); if (id.length < 2) return; const el = $(id); if (!el) return;
  e.preventDefault(); $('#mnav').classList.remove('open');
  lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' });
}));

/* ================= SCROLL FILM ENGINE =================
   Each [data-film] section holds stacked <video>s. Scroll progress picks the
   active clip and scrubs currentTime (lerped, seeks coalesced on 'seeked'). */
class Film {
  constructor(sec, hooks = {}) {
    this.sec = sec; this.hooks = hooks;
    this.vids = $$('video', sec);
    this.vhPer = +sec.dataset.vh || 160;
    this.n = this.vids.length; this.p = 0; this.idx = -1;
    this.state = this.vids.map(() => ({ cur: 0, target: 0, seeking: false, pending: null }));
    sec.style.height = `calc(${this.n * this.vhPer}vh + 100vh)`;
    const mob = isMobile();
    this.vids.forEach((v, i) => {
      v.src = (mob && v.dataset.m) ? v.dataset.m : v.dataset.src;
      v.load(); v.pause();
      const st = this.state[i];
      v.addEventListener('seeked', () => { st.seeking = false; if (st.pending != null) { const t = st.pending; st.pending = null; this.seek(i, t); } });
    });
    this.vids[0].classList.add('on');
  }
  seek(i, t) {
    const v = this.vids[i], st = this.state[i];
    if (!v.duration || isNaN(v.duration)) return;
    t = clamp(t, 0, v.duration - 0.04);
    if (st.seeking) { st.pending = t; return; }
    if (Math.abs(v.currentTime - t) < 0.008) return;
    st.seeking = true;
    if (v.fastSeek && Math.abs(v.currentTime - t) > 1.2) v.fastSeek(t); else v.currentTime = t;
  }
  measure() {
    const r = this.sec.getBoundingClientRect();
    const total = this.sec.offsetHeight - window.innerHeight;
    this.visible = r.bottom > -200 && r.top < window.innerHeight + 200;
    this.p = clamp(-r.top / total);
  }
  tick() {
    this.measure(); if (!this.visible) return;
    const pos = this.p * this.n; const idx = Math.min(this.n - 1, Math.floor(pos)); const local = clamp(pos - idx);
    if (idx !== this.idx) {
      this.vids.forEach((v, i) => {
        v.classList.toggle('on', i === idx);
        // park neighbours on their seam frames
        if (i < idx && v.duration) { this.state[i].cur = v.duration; this.seek(i, v.duration); }
        if (i > idx) { this.state[i].cur = 0; this.seek(i, 0); }
      });
      this.idx = idx;
      this.hooks.onClip && this.hooks.onClip(idx);
    }
    const v = this.vids[idx], st = this.state[idx];
    if (v.duration) {
      st.target = local * v.duration;
      st.cur = Math.abs(st.target - st.cur) < 0.01 ? st.target : lerp(st.cur, st.target, 0.22);
      this.seek(idx, st.cur);
    }
    this.hooks.onProgress && this.hooks.onProgress(this.p, idx, local);
  }
}


/* ================= IMAGE-SEQUENCE FILM (hero) =================
   Frames drawn on a <canvas>: no video decoding, so scrubbing is perfectly smooth
   in both directions. Frames load coarse-to-fine (every 8th first). */
class SeqFilm {
  constructor(sec, hooks = {}) {
    this.sec = sec; this.hooks = hooks;
    this.cv = $('canvas', sec); this.ctx = this.cv.getContext('2d');
    this.count = +this.cv.dataset.count; this.base = this.cv.dataset.seq + (isMobile() ? 'm/' : 'd/');
    this.vhPer = +sec.dataset.vh || 220;
    sec.style.height = `calc(${this.vhPer}vh + 100vh)`;
    this.imgs = new Array(this.count); this.ok = new Uint8Array(this.count);
    this.cur = 0; this.drawn = -1; this.p = 0; this.loaded = 0;
    const order = []; const seen = new Set();
    [16, 8, 4, 2, 1].forEach(step => { for (let i = 0; i < this.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
    if (!seen.has(this.count - 1)) order.splice(1, 0, this.count - 1);
    this.firstPass = Math.ceil(this.count / 8) + 1;
    this.ready = new Promise(res => { this._res = res; });
    let q = 0; const N = 6;
    const next = () => { if (q >= order.length) return; const i = order[q++]; const im = new Image(); im.decoding = 'async';
      im.onload = () => { this.ok[i] = 1; this.loaded++; if (this.loaded >= this.firstPass) this._res(); if (i === 0 || Math.abs(i - Math.round(this.cur)) < 3) this.drawn = -1; next(); };
      im.onerror = () => { this.loaded++; next(); };
      im.src = this.base + String(i + 1).padStart(3, '0') + '.webp'; this.imgs[i] = im; };
    for (let k = 0; k < N; k++) next();
    this.resize(); addEventListener('resize', () => { this.resize(); this.drawn = -1; });
  }
  resize() { const d = Math.min(devicePixelRatio || 1, 1.5); this.cv.width = Math.round(this.cv.clientWidth * d); this.cv.height = Math.round(this.cv.clientHeight * d); }
  nearest(f) { for (let o = 0; o < this.count; o++) { if (f - o >= 0 && this.ok[f - o]) return f - o; if (f + o < this.count && this.ok[f + o]) return f + o; } return -1; }
  draw(f) {
    const i = this.nearest(f); if (i < 0 || i === this.drawn) return; const im = this.imgs[i];
    const cw = this.cv.width, ch = this.cv.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    this.ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h); this.drawn = i;
  }
  tick() {
    const r = this.sec.getBoundingClientRect(); const total = this.sec.offsetHeight - innerHeight;
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    this.p = clamp(-r.top / total);
    const target = this.p * (this.count - 1);
    this.cur = Math.abs(target - this.cur) < 0.05 ? target : lerp(this.cur, target, 0.16);
    this.draw(Math.round(this.cur));
    this.hooks.onProgress && this.hooks.onProgress(this.p);
  }
}

/* ---------- HERO ---------- */
const hdr = $('#hdr'); const heroCopy = $('#heroCopy'), heroSeat = $('#heroSeat'), hint = $('#scrollHint');
const films = [];
const heroFilm = new SeqFilm($('#hero'), {
  onProgress(p) {
    const a = range(p, 0.02, 0.4);
    heroCopy.style.opacity = 1 - a;
    heroCopy.style.transform = `translateY(${-a * 80}px) scale(${1 - a * 0.06})`;
    hint.style.opacity = 1 - range(p, 0, .08);
    const s = range(p, 0.72, 0.9) * (1 - range(p, 0.97, 1));
    heroSeat.style.opacity = s;
    heroSeat.style.transform = `scale(${0.92 + s * 0.08})`;
  }
});
films.push(heroFilm);

/* ---------- MAKING ---------- */
const mk = { card: $('#mkCard'), num: $('#mkNum'), title: $('#mkTitle'), text: $('#mkText'), chips: $('#mkChips'), roll: $('#mkRoll'), rail: $('#mkRail'), prog: $('#mkProgress'), temp: $('#mkTemp'), tempV: $('#mkTempV') };
const NAMES = ['Dough','Sauce','Toppings','Bake','Slice','Box','Seal'];
mk.rail.innerHTML = NAMES.map((n, i) => `<button data-i="${i}" aria-label="Step ${i+1}: ${n}"><span>${n}</span><b></b></button>`).join('');
mk.roll.innerHTML = STEPS.map((_, i) => `<i>${String(i+1).padStart(2,'0')}</i>`).join('');
const makingSec = $('#making');
let cardTimer;
function showStep(i) {
  const s = STEPS[i];
  mk.card.classList.remove('on'); clearTimeout(cardTimer);
  cardTimer = setTimeout(() => {
    mk.num.textContent = `STEP ${String(i+1).padStart(2,'0')} · ${NAMES[i].toUpperCase()}`;
    mk.title.innerHTML = s.t; mk.text.textContent = s.d;
    mk.chips.innerHTML = s.c.map(c => `<span>${c}</span>`).join('');
    mk.card.classList.add('on');
  }, 260);
  $$('i', mk.roll).forEach(el => el.style.transform = `translateY(${-i * 100}%)`);
  $$('button', mk.rail).forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', j < i); });
  mk.temp.classList.toggle('on', !!s.temp);
}
const makingFilm = new Film(makingSec, {
  onClip: showStep,
  onProgress(p, idx, local) {
    mk.prog.style.width = (p * 100) + '%';
    if (STEPS[idx].temp) mk.tempV.textContent = Math.round(STEPS[idx].temp * Math.sin(Math.PI * clamp(local * 1.15)) ** .6);
  }
});
films.push(makingFilm);
mk.rail.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const i = +b.dataset.i, total = makingSec.offsetHeight - innerHeight;
  const y = makingSec.offsetTop + total * ((i + 0.6) / STEPS.length);
  lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: 'smooth' });
});

/* ---------- ANATOMY ---------- */
const anSec = $('#anatomy'); const tags = $$('.an-tag', anSec);
const anVid = $('.an-video video', anSec);
const anFilm = new Film(anSec, {
  onProgress(p) {
    tags.forEach(t => {
      const on = p * 1.05 > +t.dataset.at - 0.42; t.classList.toggle('on', on);
      const ln = $('.line', t); if (ln) { ln.style.transformOrigin = t.closest('.an-col--l') ? 'left' : 'right'; ln.style.transform = `scaleX(${clamp((p*1.05 - (+t.dataset.at - 0.42)) * 6)})`; }
    });
  }
});
films.push(anFilm);

/* ---------- PULL ---------- */
const pullA = $('#pullA'), pullB = $('#pullB'), pullMeta = $('#pullMeta');
films.push(new Film($('#pull'), {
  onProgress(p) {
    pullA.style.transform = `translateX(${4 - p * 12}vw)`;
    pullB.style.transform = `translateX(${(p * 14) - 4}vw)`;
    pullB.style.webkitTextStroke = `2px rgba(255,246,232,${0.35 + p * .6})`;
    const m = range(p, .45, .7); pullMeta.style.opacity = m; pullMeta.style.transform = `translateY(${(1-m)*30}px)`;
  }
}));

/* ---------- HEADER theme + hide on scroll ---------- */
let lastY = 0;
const darkSecs = [$('#hero'), anSec, $('#pull'), $('.stats'), $('.ftr')];
function headerTick() {
  const y = window.scrollY;
  hdr.classList.toggle('is-hidden', y > lastY + 4 && y > 300 && !$('#mnav').classList.contains('open'));
  if (y < lastY - 4) hdr.classList.remove('is-hidden');
  lastY = y;
  const probe = 40; let dark = false;
  darkSecs.forEach(s => { if (!s) return; const r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) dark = true; });
  hdr.classList.toggle('is-dark', dark);
}

/* ---------- 360 SPIN ---------- */
const spinSec = $('#spin'), rot = $('#rot'), pie = $('#pie'), deg = $('#deg'), ringG = $('#ringG'), plate = $('#plate');
const lbls = $$('.lbl', rot);
let drag = 0, dragV = 0, dragging = false, lastX = 0, angle = 0;
function spinTick() {
  const r = spinSec.getBoundingClientRect();
  if (r.bottom < -100 || r.top > innerHeight + 100) return;
  const p = clamp(-r.top / (spinSec.offsetHeight - innerHeight));
  if (!dragging) { drag += dragV; dragV *= 0.94; }
  const target = p * 540 + drag;
  angle = lerp(angle, target, 0.12);
  rot.style.transform = `rotate(${angle}deg)`;
  lbls.forEach(l => l.style.transform = `rotate(${-angle}deg)`);
  ringG.setAttribute('transform', `rotate(${-angle * 0.4} 200 200)`);
  deg.textContent = ((Math.round(angle) % 360) + 360) % 360;
}
const pt = e => (e.touches ? e.touches[0].clientX : e.clientX);
plate.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; dragV = 0; plate.setPointerCapture(e.pointerId); });
plate.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; drag += dx * 0.6; dragV = dx * 0.6; });
['pointerup','pointercancel'].forEach(ev => plate.addEventListener(ev, () => dragging = false));
const SCALE = { 8: .74, 10: .87, 12: 1 };
$('#sizes').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#sizes button').forEach(x => x.classList.toggle('on', x === b));
  pie.style.transform = `scale(${SCALE[b.dataset.s]})`;
  countTo($('#spinPrice'), +b.dataset.p, 500);
  $('#spinAdd').dataset.size = b.dataset.s; $('#spinAdd').dataset.price = b.dataset.p;
});
pie.style.transform = `scale(${SCALE[10]})`;

/* ---------- MENU ---------- */
const cardsEl = $('#cards');
cardsEl.innerHTML = MENU.map((m, i) => `
  <article class="card" data-veg="${m.veg ? 'veg' : 'nv'}" data-reveal>
    <div class="card__img" style="background:${m.bg}"><img src="${m.img}" alt="${m.name}" loading="lazy">
      <span class="card__tag ${m.veg ? '' : 'nv'}"><i></i>${m.veg ? 'Veg' : 'Non-veg'}</span></div>
    <div class="card__body"><h3>${m.name}</h3><p>${m.desc}</p>
      <div class="card__foot"><span class="card__price">₹${m.price}</span>
      <button class="add" data-i="${i}" aria-label="Add ${m.name} to box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div></div>
  </article>`).join('');
$('#filters').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#filters button').forEach(x => x.classList.toggle('on', x === b));
  $$('.card', cardsEl).forEach(c => c.classList.toggle('hide', b.dataset.f !== 'all' && c.dataset.veg !== b.dataset.f));
});
// 3D tilt
$$('.card', cardsEl).forEach(c => {
  c.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`; });
  c.addEventListener('pointerleave', () => c.style.transform = '');
});

/* ---------- CART (demo) ----------
   WooCommerce: replace addToBox() body with a POST to /wc/store/v1/cart/add-item */
let cart = 0;
const toastEl = $('#toast');
window.toast = (txt, img) => { $('#toastText').textContent = txt; if (img) $('#toastImg').src = img; toastEl.classList.add('on'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('on'), 2400); };
function addToBox(name, img, fromEl) {
  cart++; const c = $('#cartCount'); c.textContent = cart; c.classList.add('on');
  const btn = $('#cartBtn');
  if (fromEl && !reduce) {
    const a = fromEl.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const f = document.createElement('img'); f.src = img; f.className = 'fly'; document.body.appendChild(f);
    f.style.left = a.left + a.width/2 - 30 + 'px'; f.style.top = a.top + a.height/2 - 30 + 'px';
    f.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${(b.left - a.left) * .5}px, ${(b.top - a.top) * .5 - 120}px) scale(.8)`, opacity: 1, offset: .55 },
      { transform: `translate(${b.left - a.left - a.width/2 + 22}px, ${b.top - a.top - a.height/2 + 22}px) scale(.2)`, opacity: .6 }],
      { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => { f.remove(); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); };
    hdr.classList.remove('is-hidden');
  }
  toast(`${name} added to your box`, img);
}
cardsEl.addEventListener('click', e => { const b = e.target.closest('.add'); if (!b) return; const m = MENU[+b.dataset.i]; addToBox(m.name, m.img, b); });
$('#spinAdd').addEventListener('click', e => { const s = e.currentTarget.dataset.size || 10; addToBox(`Pepperoni Inferno ${s}"`, e.currentTarget.dataset.img, e.currentTarget); });
$('#cartBtn').addEventListener('click', () => toast(cart ? `${cart} pizza${cart > 1 ? 's' : ''} in your box` : 'Your box is empty, pick a pie!'));

/* ---------- burger ---------- */
$('#burger').addEventListener('click', () => $('#mnav').classList.toggle('open'));

/* ---------- counters ---------- */
function countTo(el, to, dur = 1400, sup = '') {
  const from = +el.textContent.replace(/\D/g, '') || 0; const t0 = performance.now();
  const step = now => { const k = clamp((now - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
    el.innerHTML = Math.round(from + (to - from) * e) + (sup ? `<sup>${sup}</sup>` : ''); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const el = e.target; countTo(el, +el.dataset.count, 1600, el.dataset.sup || ''); io.unobserve(el); }), { threshold: .6 });
$$('[data-count]').forEach(el => io.observe(el));

/* ---------- lazy mascot loop ---------- */
const mascot = $('[data-lazy]');
new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { mascot.src = mascot.dataset.lazy; mascot.play().catch(() => {}); o.disconnect(); } }), { rootMargin: '400px' }).observe(mascot);

/* ---------- split text + reveals ---------- */
function split(el) {
  const walk = n => { [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) { const frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
        const o = document.createElement('span'); o.className = 'w'; const i = document.createElement('span'); i.textContent = w; o.appendChild(i); frag.appendChild(o); });
      c.replaceWith(frag);
    } else if (c.nodeType === 1 && c.tagName !== 'BR') {
      if (c.classList.contains('serif')) { const o = document.createElement('span'); o.className = 'w'; c.replaceWith(o); const i = document.createElement('span'); i.appendChild(c); o.appendChild(i); }
      else walk(c);
    } }); };
  walk(el);
}
$$('[data-split]').forEach(split);
function revealAll() {
  if (!hasGSAP || reduce) { $$('[data-reveal]').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); return; }
  gsap.from('#hero .w > span', { yPercent: 115, rotate: 4, duration: 1.2, ease: 'expo.out', stagger: .06, delay: .1 });
  gsap.from('.hero__row > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, delay: .5 });
  gsap.from('.hdr', { yPercent: -160, duration: 1.2, ease: 'expo.out', delay: .2, clearProps: 'transform' });
  $$('[data-split]').forEach(el => { if (el.closest('#hero')) return;
    gsap.from($$('.w > span', el), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: el, start: 'top 85%' } }); });
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .1 }) });
  gsap.from('.stat', { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.stats__grid', start: 'top 85%' } });
  gsap.from('.order__box', { y: 80, scale: .94, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.order', start: 'top 80%' } });
  gsap.from('.sticker', { scale: 0, rotate: -120, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.order', start: 'top 60%' } });
  gsap.fromTo('.ftr__word', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.spin__bgword', { xPercent: -42 }, { xPercent: -58, ease: 'none', scrollTrigger: { trigger: '#spin', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ---------- magnetic + cursor ---------- */
if (matchMedia('(hover:hover)').matches && !reduce) {
  $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width/2) * .25}px, ${(e.clientY - r.top - r.height/2) * .35}px)`; });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });
  const cur = $('.cursor'); let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  const cl = () => { cx = lerp(cx, tx, .25); cy = lerp(cy, ty, .25); cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(cl); }; cl();
  plate.addEventListener('pointerenter', () => cur.classList.add('big')); plate.addEventListener('pointerleave', () => cur.classList.remove('big'));
}

/* ---------- main loop ---------- */
function loop() { films.forEach(f => f.tick()); spinTick(); headerTick(); requestAnimationFrame(loop); }

/* ---------- preloader ---------- */
const loader = $('#loader'), bar = $('#loaderBar'), cnt = $('#loaderCount');
const waits = [films[1].vids[0]].map(v => new Promise(r => { if (v.readyState >= 3) r(); v.addEventListener('canplaythrough', r, { once: true }); v.addEventListener('error', r, { once: true }); }));
waits.push(heroFilm.ready);
if (document.fonts) waits.push(document.fonts.ready);
let shown = 0, real = 0, done = false;
waits.forEach(w => w.then(() => real += 1 / waits.length));
const cap = setTimeout(() => real = 1, 7000);
(function lt() {
  shown = lerp(shown, Math.max(real, Math.min(shown + .004, .9)), .08);
  const pc = Math.round(shown * 100); cnt.textContent = pc; bar.style.width = pc + '%';
  if (real >= 1 && shown > .985 && !done) { done = true; clearTimeout(cap); cnt.textContent = 100; bar.style.width = '100%';
    setTimeout(() => { loader.classList.add('is-done'); revealAll(); hasGSAP && ScrollTrigger.refresh(); setTimeout(() => loader.remove(), 1100); }, 250); }
  if (!done) requestAnimationFrame(lt);
})();
requestAnimationFrame(loop);
addEventListener('resize', () => hasGSAP && ScrollTrigger.refresh());
})();
