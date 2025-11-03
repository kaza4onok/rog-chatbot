// ===== Tabs & Burger =====
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active', l.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${tab}`));
  if(tab==='chat'){ document.getElementById('user-input')?.focus(); }
}
function initTabs(){
  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.addEventListener('click', e => {
      if (el.tagName === 'A') e.preventDefault();
      const t = el.dataset.tab;
      if (location.hash !== `#${t}`) location.hash = `#${t}`;
      else switchTab(t);
    });
  });
  window.addEventListener('hashchange', ()=> switchTab((location.hash||'#home').slice(1)));
  switchTab((location.hash||'#home').slice(1));

  const b = document.getElementById('burger');
  const nav = document.querySelector('.main-nav');
  b?.addEventListener('click', (e) => {
    e.stopPropagation();
    const opened = nav?.classList.toggle('open');
    b.setAttribute('aria-expanded', opened ? 'true' : 'false');
  });
  document.querySelectorAll('.main-nav [data-tab]').forEach(a=>{
    a.addEventListener('click', ()=>{ nav?.classList.remove('open'); b?.setAttribute('aria-expanded','false'); });
  });
  document.addEventListener('click', (e)=>{
    if (nav?.classList.contains('open') && !nav.contains(e.target) && e.target !== b) {
      nav.classList.remove('open'); b?.setAttribute('aria-expanded','false');
    }
  });
}

// ===== Scroll Progress =====
const progressEl = document.getElementById('progress');
function onScrollProgress(){
  const doc = document.documentElement;
  const scrolled = (doc.scrollTop || 0);
  const height = (doc.scrollHeight - doc.clientHeight) || 1;
  const pct = Math.min(100, Math.max(0, (scrolled/height)*100));
  if(progressEl) progressEl.style.width = pct + '%';
}
window.addEventListener('scroll', onScrollProgress, { passive:true });

// ===== Parallax / Tilt / Reveal =====
function initParallax(){
  const layers = document.querySelectorAll('.parallax');
  document.addEventListener('mousemove', (e)=>{
    const cx = window.innerWidth/2, cy = window.innerHeight/2;
    const dx = (e.clientX - cx)/cx, dy = (e.clientY - cy)/cy;
    layers.forEach(layer=>{
      const depth = parseFloat(layer.dataset.depth || '0.2');
      layer.style.transform = `translate3d(${dx*depth*10}px, ${dy*depth*10}px, 0)`;
    });
  });
}
function initTilt(){
  const cards = document.querySelectorAll('.tilt');
  cards.forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width * 2 - 1;
      const y = (e.clientY - r.top)/r.height * 2 - 1;
      card.style.transform = `rotateY(${x*6}deg) rotateX(${-y*6}deg)`;
    });
    card.addEventListener('mouseleave', ()=> card.style.transform = '');
  });
}
function initReveal(){
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(ent=>{ if(ent.isIntersecting){ ent.target.classList.add('show'); obs.unobserve(ent.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
}

// ===== Chat elements =====
const sendBtn    = document.getElementById("send-btn");
const stopBtn    = document.getElementById("stop-btn");
const inputEl    = document.getElementById("user-input");
const chatWindow = document.getElementById("chat-window");
const typingEl   = document.getElementById("typing-indicator");
const sendSound  = document.getElementById("send-sound");
const btnDown    = document.getElementById('btn-to-bottom');
const btnUp      = document.getElementById('btn-to-top');
const toastEl    = document.getElementById('toast');

// Quick prompts
document.querySelectorAll('.chip').forEach(ch=>{
  ch.addEventListener('click', ()=>{ inputEl.value = ch.dataset.prompt || ''; inputEl.focus(); });
});

// ===== Scroll helpers for chat =====
function isNearBottom(){
  const t=chatWindow.scrollTop, h=chatWindow.scrollHeight-chatWindow.clientHeight;
  return h - t < 60;
}
function updateScrollButtons(){
  if(!btnDown||!btnUp) return;
  const near=isNearBottom();
  btnDown.classList.toggle('show', !near);
  btnUp.classList.toggle('show', chatWindow.scrollTop > 80);
}
function scrollToBottom(){ chatWindow.scrollTop=chatWindow.scrollHeight; updateScrollButtons(); }
function scrollToTop(){ chatWindow.scrollTop=0; updateScrollButtons(); }
btnDown?.addEventListener('click', scrollToBottom);
btnUp?.addEventListener('click', scrollToTop);
chatWindow?.addEventListener('scroll', updateScrollButtons);
document.addEventListener('wheel', (e)=>{
  const active=document.querySelector('.view.active'); if(!active || active.id!=='view-chat') return;
  if(!chatWindow.matches(':hover')){ chatWindow.scrollTop += e.deltaY; e.preventDefault(); }
}, { passive:false });

// ===== Toast =====
function toast(msg, ms=1800){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(()=> toastEl.classList.remove('show'), ms);
}

// ===== Messages + "streaming" (typewriter) =====
let typingAbort = null;
function addMessageEl(sender, text){
  const wrap = document.createElement('div');
  wrap.className = "message " + (sender==="Вы" ? "user" : "bot");
  wrap.innerHTML = `<strong>${sender}:</strong> <span class="msg-text"></span>`;
  const textEl = wrap.querySelector('.msg-text');
  textEl.textContent = text;
  chatWindow.appendChild(wrap);
  return textEl;
}
async function typewriter(targetEl, fullText, speed=16){
  return new Promise((resolve)=>{
    let i=0; let aborted=false;
    typingAbort = ()=>{ aborted=true; resolve('aborted'); };
    const step=()=> {
      if(aborted) return;
      if(i<fullText.length){
        targetEl.textContent += fullText[i++];
        if(isNearBottom()) scrollToBottom();
        setTimeout(step, speed);
      } else { typingAbort=null; resolve('done'); }
    };
    step();
  });
}
function addUserMessage(text){
  const wasNear = isNearBottom();
  addMessageEl("Вы", text);
  wasNear ? scrollToBottom() : updateScrollButtons();
}
async function addBotStream(text){
  const wasNear = isNearBottom();
  const el = addMessageEl("ROG-бот", "");
  wasNear ? scrollToBottom() : updateScrollButtons();
  stopBtn && (stopBtn.disabled = false);
  const result = await typewriter(el, text, 14);
  stopBtn && (stopBtn.disabled = true);
  return result;
}

// Send / Stop
sendBtn?.addEventListener("click", sendMessage);
inputEl?.addEventListener("keydown", e => { if(e.key==="Enter") sendMessage(); });
stopBtn?.addEventListener("click", ()=>{ if(typingAbort){ typingAbort(); toast('Остановлено'); } });
function sendMessage(){
  const message = (inputEl.value || '').trim();
  if(!message) return;
  try{ sendSound?.play(); }catch(_){}
  addUserMessage(message);
  inputEl.value="";
  typingEl.style.display="block";
  chatWindow.setAttribute('aria-busy','true');
  fetch("/chat",{
    method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ message }),
  })
  .then(r=>r.json())
  .then(async d=>{
    typingEl.style.display="none"; chatWindow.setAttribute('aria-busy','false');
    await addBotStream(d.reply || '🤖 Пустой ответ');
  })
  .catch(_=>{
    typingEl.style.display="none"; chatWindow.setAttribute('aria-busy','false');
    addMessageEl("ROG-бот", "⚠️ Ошибка получения ответа.");
  });
}

// ===== PWA Install (banner + header button) =====
let deferredPrompt = null;
const ib = document.getElementById('install-banner');
const ibInstall = document.getElementById('ib-install');
const ibClose = document.getElementById('ib-close');
const installBtn = document.getElementById('install-btn');
function isiOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isStandalone(){ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  ib && (ib.hidden = false); installBtn && (installBtn.hidden = false);
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) { ib && (ib.hidden = true); installBtn.hidden = true; return; }
  try { await deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; toast(outcome==='accepted'?'Установка начата':'Отложено'); }
  catch(_){} finally { deferredPrompt = null; ib && (ib.hidden = true); installBtn.hidden = true; }
});
ibInstall?.addEventListener('click', async () => {
  if (!deferredPrompt) { ib.hidden = true; return; }
  try { await deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; toast(outcome==='accepted'?'Установка начата':'Отложено'); }
  catch(_){} finally { deferredPrompt = null; ib.hidden = true; installBtn && (installBtn.hidden = true); }
});
ibClose?.addEventListener('click', () => { deferredPrompt=null; ib.hidden = true; });
window.addEventListener('appinstalled', () => { deferredPrompt=null; ib && (ib.hidden=true); installBtn && (installBtn.hidden=true); toast('Установлено ✅'); });
window.addEventListener('load', () => {
  if (isStandalone()) { ib && (ib.hidden = true); installBtn && (installBtn.hidden = true); return; }
  if (isiOS() && ib) { const text = ib.querySelector('span'); if (text) text.textContent = 'На iPhone: Поделиться → На экран «Домой»'; ib.hidden = false; }
});

// ===== WEATHER (Open-Meteo, без ключей) =====
const cityInput = document.getElementById('weather-city');
const searchBtn = document.getElementById('weather-search');
const geoBtn    = document.getElementById('weather-geo');
const wStatus   = document.getElementById('weather-status');
const wCurrent  = document.getElementById('weather-current');
const wForecast = document.getElementById('weather-forecast');

const W_DESC = {
  0:'Ясно', 1:'Преимущественно ясно', 2:'Переменная облачность', 3:'Пасмурно',
  45:'Туман', 48:'Изморозь',
  51:'Морось слабая', 53:'Морось', 55:'Морось сильная',
  61:'Дождь слабый', 63:'Дождь', 65:'Дождь сильный',
  66:'Ледяной дождь слабый', 67:'Ледяной дождь',
  71:'Снег слабый', 73:'Снег', 75:'Снег сильный', 77:'Снежные зёрна',
  80:'Ливневые дожди слабые', 81:'Ливневые дожди', 82:'Сильный ливень',
  85:'Снегопад', 86:'Сильный снегопад',
  95:'Гроза', 96:'Гроза с градом', 99:'Сильная гроза с градом'
};
const W_EMOJI = (c)=>(
  c===0?'☀️':
  [1].includes(c)?'🌤️':
  [2].includes(c)?'⛅':
  [3].includes(c)?'☁️':
  [45,48].includes(c)?'🌫️':
  [51,53,55,61,63,65,66,67,80,81,82].includes(c)?'🌧️':
  [71,73,75,77,85,86].includes(c)?'❄️':
  [95,96,99].includes(c)?'⛈️':'🌡️'
);

function setWeatherStatus(text){ if(wStatus){ wStatus.textContent=text||''; } }
function renderCurrent(city, cur){
  const ico = W_EMOJI(cur.weather_code);
  const desc= W_DESC[cur.weather_code] || 'Погода';
  wCurrent.innerHTML = `
    <div class="wc-ico" style="font-size:2rem">${ico}</div>
    <div class="wc-info">
      <div class="wc-city">${city}</div>
      <div class="wc-extra">${desc} • Ветер ${Math.round(cur.wind_speed_10m)} м/с</div>
    </div>
    <div class="wc-temp">${Math.round(cur.temperature_2m)}°C</div>
  `;
}
function renderForecast(daily){
  const days = daily.time.map((t,i)=>({
    date:new Date(t), code:daily.weather_code[i], tmin:daily.temperature_2m_min[i], tmax:daily.temperature_2m_max[i]
  }));
  wForecast.innerHTML = days.map(d=>{
    const dd = d.date.toLocaleDateString('ru-RU',{weekday:'short', day:'2-digit'});
    const ico = W_EMOJI(d.code);
    return `<div class="w-day">
      <div class="d">${dd}</div>
      <div class="ico">${ico}</div>
      <div class="t">${Math.round(d.tmin)}° / ${Math.round(d.tmax)}°</div>
    </div>`;
  }).join('');
}

async function geocodeCity(name){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ru&format=json`;
  const r = await fetch(url); if(!r.ok) throw new Error('geocode');
  const j = await r.json();
  const p = j.results?.[0];
  if(!p) throw new Error('Город не найден');
  return { lat:p.latitude, lon:p.longitude, label:`${p.name}${p.country?`, ${p.country}`:''}` };
}
async function fetchWeather(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const r = await fetch(url); if(!r.ok) throw new Error('forecast');
  return r.json();
}

async function showWeatherByCity(name){
  try{
    setWeatherStatus('Поиск города…');
    const { lat, lon, label } = await geocodeCity(name);
    setWeatherStatus('Загружаю прогноз…');
    const data = await fetchWeather(lat, lon);
    renderCurrent(label, data.current);
    renderForecast(data.daily);
    setWeatherStatus('');
  }catch(e){ setWeatherStatus('Не удалось получить погоду'); toast('⚠️ Ошибка погоды'); }
}
async function showWeatherByGeo(){
  if(!navigator.geolocation){ toast('Геолокация не поддерживается'); return; }
  setWeatherStatus('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const { latitude:lat, longitude:lon } = pos.coords;
      setWeatherStatus('Загружаю прогноз…');
      const data = await fetchWeather(lat, lon);
      // обратное гео — возьмём ближайший населённый пункт
      let label = 'Ваше местоположение';
      try{
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ru&format=json`);
        const j = await r.json();
        const p = j.results?.[0];
        if(p) label = `${p.name}${p.country?`, ${p.country}`:''}`;
      }catch(_){}
      renderCurrent(label, data.current);
      renderForecast(data.daily);
      setWeatherStatus('');
    }catch(_){ setWeatherStatus('Не удалось получить погоду'); toast('⚠️ Ошибка погоды'); }
  }, ()=>{ setWeatherStatus('Геолокация отклонена'); toast('Разрешите доступ к геолокации'); });
}

// события погоды
searchBtn?.addEventListener('click', ()=>{
  const q = (cityInput.value||'').trim(); if(!q) return;
  showWeatherByCity(q);
});
cityInput?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const q=(cityInput.value||'').trim(); if(q) showWeatherByCity(q); }});
geoBtn?.addEventListener('click', showWeatherByGeo);

// ===== Init =====
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  onScrollProgress();
  initParallax();
  initTilt();
  initReveal();
  updateScrollButtons();
});
