/* ===== Tabs & Burger ===== */
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active', l.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${tab}`));
  if(tab==='chat'){ bindQuickPrompts(); bindChatHandlers(); document.getElementById('user-input')?.focus(); }
  if(tab==='map'){ init2GISMapOnce(); setTimeout(()=>{ try{ mapDG && mapDG.invalidateSize(); }catch(_){} }, 150); }
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

/* ===== Scroll Progress ===== */
const progressEl = document.getElementById('progress');
function onScrollProgress(){
  const doc = document.documentElement;
  const scrolled = (doc.scrollTop || 0);
  const height = (doc.scrollHeight - doc.clientHeight) || 1;
  const pct = Math.min(100, Math.max(0, (scrolled/height)*100));
  if(progressEl) progressEl.style.width = pct + '%';
}
window.addEventListener('scroll', onScrollProgress, { passive:true });

/* ===== Parallax / Tilt / Reveal ===== */
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

/* ===== Chat elements & helpers ===== */
const chatWindow = document.getElementById("chat-window");
const typingEl   = document.getElementById("typing-indicator");
const sendSound  = document.getElementById("send-sound");
const btnDown    = document.getElementById('btn-to-bottom');
const btnUp      = document.getElementById('btn-to-top');
const toastEl    = document.getElementById('toast');

/* Quick prompts (делегирование + клавиатура) */
function bindQuickPrompts(){
  const container = document.querySelector('.quick-prompts');
  if (!container || container.__bound) return;
  container.querySelectorAll('.chip').forEach(ch => ch.setAttribute('tabindex','0'));
  const apply = (el)=>{
    const chip = el.closest('.chip'); if(!chip) return;
    const val = chip.dataset.prompt || chip.textContent.trim();
    const input = document.getElementById('user-input'); if(!input) return;
    input.value = val; input.focus(); input.setSelectionRange(val.length, val.length);
  };
  container.addEventListener('click', e=>apply(e.target));
  container.addEventListener('keydown', e=>{
    if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('chip')){ e.preventDefault(); apply(e.target); }
  });
  container.__bound = true;
}

/* Chat handlers */
function bindChatHandlers(){
  const sendBtn  = document.getElementById('send-btn');
  const stopBtn  = document.getElementById('stop-btn');
  const inputEl  = document.getElementById('user-input');
  const actions  = document.querySelector('#view-chat .input-actions');
  if (sendBtn && !sendBtn.__bound) { sendBtn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); sendMessage(); }); sendBtn.__bound=true; }
  if (inputEl && !inputEl.__bound) { inputEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendMessage(); } }); inputEl.__bound=true; }
  if (stopBtn && !stopBtn.__bound) { stopBtn.addEventListener('click', ()=>{ if(typingAbort){ typingAbort(); toast('Остановлено'); }}); stopBtn.__bound=true; }
  if (actions && !actions.__bound) { actions.addEventListener('click', e=>{ const t=e.target; if(t && (t.id==='send-btn'||t.closest('#send-btn'))){ e.preventDefault(); sendMessage(); } }); actions.__bound=true; }
}

/* Scroll helpers */
function isNearBottom(){ const t=chatWindow.scrollTop, h=chatWindow.scrollHeight-chatWindow.clientHeight; return h - t < 60; }
function updateScrollButtons(){ if(!btnDown||!btnUp) return; const near=isNearBottom(); btnDown.classList.toggle('show', !near); btnUp.classList.toggle('show', chatWindow.scrollTop > 80); }
function scrollToBottom(){ chatWindow.scrollTop=chatWindow.scrollHeight; updateScrollButtons(); }
function scrollToTop(){ chatWindow.scrollTop=0; updateScrollButtons(); }
btnDown?.addEventListener('click', scrollToBottom);
btnUp?.addEventListener('click', scrollToTop);
chatWindow?.addEventListener('scroll', updateScrollButtons);
document.addEventListener('wheel', (e)=>{ const active=document.querySelector('.view.active'); if(!active||active.id!=='view-chat') return; if(!chatWindow.matches(':hover')){ chatWindow.scrollTop += e.deltaY; e.preventDefault(); } }, { passive:false });

/* Toast */
function toast(msg, ms=1800){ if(!toastEl) return; toastEl.textContent=msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'), ms); }

/* Messages + typewriter */
let typingAbort = null;
function addMessageEl(sender, text){
  const wrap = document.createElement('div');
  wrap.className = "message " + (sender==="Вы" ? "user" : "bot");
  wrap.innerHTML = `<strong>${sender}:</strong> <span class="msg-text"></span>`;
  const textEl = wrap.querySelector('.msg-text'); textEl.textContent = text;
  chatWindow.appendChild(wrap); return textEl;
}
async function typewriter(targetEl, fullText, speed=16){
  return new Promise((resolve)=>{
    let i=0; let aborted=false; typingAbort=()=>{aborted=true; resolve('aborted');};
    const step=()=>{ if(aborted) return; if(i<fullText.length){ targetEl.textContent+=fullText[i++]; if(isNearBottom()) scrollToBottom(); setTimeout(step, speed);} else { typingAbort=null; resolve('done'); } };
    step();
  });
}
function addUserMessage(text){ const was=isNearBottom(); addMessageEl("Вы", text); was?scrollToBottom():updateScrollButtons(); }
async function addBotStream(text){ const was=isNearBottom(); const el=addMessageEl("ROG-бот",""); was?scrollToBottom():updateScrollButtons(); const sb=document.getElementById('stop-btn'); sb&&(sb.disabled=false); const r=await typewriter(el,text,14); sb&&(sb.disabled=true); return r; }

/* Send */
function sendMessage(){
  const inputEl = document.getElementById('user-input');
  const message = (inputEl?.value||'').trim(); if(!message) return;
  try{ sendSound?.play(); }catch(_){}
  addUserMessage(message); inputEl.value=""; typingEl.style.display="block"; chatWindow.setAttribute('aria-busy','true');
  fetch("/chat",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ message }) })
  .then(r=>r.json())
  .then(async d=>{ typingEl.style.display="none"; chatWindow.setAttribute('aria-busy','false'); await addBotStream(d.reply || '🤖 Пустой ответ'); })
  .catch(_=>{ typingEl.style.display="none"; chatWindow.setAttribute('aria-busy','false'); addMessageEl("ROG-бот","⚠️ Ошибка получения ответа."); });
}

/* ===== PWA Install (banner + header button + iOS hint) ===== */
let deferredPrompt=null;
const ib=document.getElementById('install-banner'), ibInstall=document.getElementById('ib-install'), ibClose=document.getElementById('ib-close'), installBtn=document.getElementById('install-btn');
const isiOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; ib&&(ib.hidden=false); installBtn&&(installBtn.hidden=false); });
installBtn?.addEventListener('click', async ()=>{ if(!deferredPrompt){ ib&&(ib.hidden=true); installBtn.hidden=true; return; } try{ await deferredPrompt.prompt(); const {outcome}=await deferredPrompt.userChoice; toast(outcome==='accepted'?'Установка начата':'Отложено'); }catch(_){ } finally{ deferredPrompt=null; ib&&(ib.hidden=true); installBtn.hidden=true; } });
ibInstall?.addEventListener('click', async ()=>{ if(!deferredPrompt){ ib.hidden=true; return; } try{ await deferredPrompt.prompt(); const {outcome}=await deferredPrompt.userChoice; toast(outcome==='accepted'?'Установка начата':'Отложено'); }catch(_){ } finally{ deferredPrompt=null; ib.hidden=true; installBtn&&(installBtn.hidden=true); } });
ibClose?.addEventListener('click', ()=>{ deferredPrompt=null; ib.hidden=true; });
window.addEventListener('appinstalled', ()=>{ deferredPrompt=null; ib&&(ib.hidden=true); installBtn&&(installBtn.hidden=true); toast('Установлено ✅'); });
window.addEventListener('load', ()=>{ if(isStandalone()){ ib&&(ib.hidden=true); installBtn&&(installBtn.hidden=true); return; } if(isiOS()&&ib){ const t=ib.querySelector('span'); if(t) t.textContent='На iPhone: Поделиться → На экран «Домой»'; ib.hidden=false; } });

/* ===== Weather (Open-Meteo) ===== */
const cityInput=document.getElementById('weather-city');
const wStatus=document.getElementById('weather-status');
const wCurrent=document.getElementById('weather-current');
const wForecast=document.getElementById('weather-forecast');
const W_DESC={0:'Ясно',1:'Преимущественно ясно',2:'Переменная облачность',3:'Пасмурно',45:'Туман',48:'Изморозь',51:'Морось слабая',53:'Морось',55:'Морось сильная',61:'Дождь слабый',63:'Дождь',65:'Дождь сильный',66:'Ледяной дождь слабый',67:'Ледяной дождь',71:'Снег слабый',73:'Снег',75:'Снег сильный',77:'Снежные зёрна',80:'Ливни слабые',81:'Ливни',82:'Сильный ливень',85:'Снегопад',86:'Сильный снегопад',95:'Гроза',96:'Гроза с градом',99:'Сильная гроза с градом'};
const W_EMOJI=c=>c===0?'☀️':[1].includes(c)?'🌤️':[2].includes(c)?'⛅':[3].includes(c)?'☁️':[45,48].includes(c)?'🌫️':[51,53,55,61,63,65,66,67,80,81,82].includes(c)?'🌧️':[71,73,75,77,85,86].includes(c)?'❄️':[95,96,99].includes(c)?'⛈️':'🌡️';
const setWeatherStatus=t=>{ if(wStatus) wStatus.textContent=t||''; };
function renderCurrent(city,cur){ const ico=W_EMOJI(cur.weather_code); const desc=W_DESC[cur.weather_code]||'Погода';
  wCurrent.innerHTML=`<div class="wc-ico" style="font-size:2rem">${ico}</div>
  <div class="wc-info"><div class="wc-city">${city}</div><div class="wc-extra">${desc} • Ветер ${Math.round(cur.wind_speed_10m)} м/с</div></div>
  <div class="wc-temp">${Math.round(cur.temperature_2m)}°C</div>`; }
function renderForecast(daily){ const days=daily.time.map((t,i)=>({date:new Date(t),code:daily.weather_code[i],tmin:daily.temperature_2m_min[i],tmax:daily.temperature_2m_max[i]}));
  wForecast.innerHTML=days.map(d=>{ const dd=d.date.toLocaleDateString('ru-RU',{weekday:'short',day:'2-digit'}); const ico=W_EMOJI(d.code);
    return `<div class="w-day"><div class="d">${dd}</div><div class="ico">${ico}</div><div class="t">${Math.round(d.tmin)}° / ${Math.round(d.tmax)}°</div></div>`; }).join(''); }
async function geocodeCity(name){ const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ru&format=json`; const r=await fetch(url); if(!r.ok) throw new Error('geocode'); const j=await r.json(); const p=j.results?.[0]; if(!p) throw new Error('Город не найден'); return {lat:p.latitude,lon:p.longitude,label:`${p.name}${p.country?`, ${p.country}`:''}`}; }
async function fetchWeather(lat,lon){ const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`; const r=await fetch(url); if(!r.ok) throw new Error('forecast'); return r.json(); }
async function showWeatherByCity(name){ try{ setWeatherStatus('Поиск города…'); const {lat,lon,label}=await geocodeCity(name); setWeatherStatus('Загружаю прогноз…'); const data=await fetchWeather(lat,lon); renderCurrent(label,data.current); renderForecast(data.daily); setWeatherStatus(''); }catch(_){ setWeatherStatus('Не удалось получить погоду'); toast('⚠️ Ошибка погоды'); } }
async function showWeatherByGeo(){ if(!navigator.geolocation){ toast('Геолокация не поддерживается'); return; } setWeatherStatus('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(async pos=>{ try{ const {latitude:lat,longitude:lon}=pos.coords; setWeatherStatus('Загружаю прогноз…'); const data=await fetchWeather(lat,lon);
    let label='Ваше местоположение'; try{ const r=await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ru&format=json`); const j=await r.json(); const p=j.results?.[0]; if(p) label=`${p.name}${p.country?`, ${p.country}`:''}`; }catch(_){}
    renderCurrent(label,data.current); renderForecast(data.daily); setWeatherStatus(''); }catch(_){ setWeatherStatus('Не удалось получить погоду'); toast('⚠️ Ошибка погоды'); } },
    ()=>{ setWeatherStatus('Геолокация отклонена'); toast('Разрешите доступ к геолокации'); }); }
document.getElementById('weather-search')?.addEventListener('click', ()=>{ const q=(cityInput?.value||'').trim(); if(q) showWeatherByCity(q); });
cityInput?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const q=(cityInput.value||'').trim(); if(q) showWeatherByCity(q); }});
document.getElementById('weather-geo')?.addEventListener('click', showWeatherByGeo);

/* ===== Map (2GIS) ===== */
let mapDG=null, userMarker=null, pointMarker=null;
function init2GISMapOnce(){
  if(mapDG || !window.DG) return;
  DG.then(function(){
    mapDG = DG.map('map', { center:[43.238949,76.889709], zoom:12, fullscreenControl:false });
    mapDG.on('click', function(e){
      const lat=e.latlng.lat.toFixed(6), lng=e.latlng.lng.toFixed(6);
      if(pointMarker) mapDG.removeLayer(pointMarker);
      pointMarker = DG.marker([lat,lng]).addTo(mapDG).bindPopup(`Выбрано: ${lat}, ${lng}`).openPopup();
      updateCoords(`${lat}, ${lng}`);
    });
    document.getElementById('map-geo')?.addEventListener('click', locateMe);
    document.getElementById('map-clear')?.addEventListener('click', ()=>{
      if(pointMarker){ mapDG.removeLayer(pointMarker); pointMarker=null; }
      updateCoords('');
    });
  });
}
function updateCoords(text){
  const el=document.getElementById('map-coords'); if(!el) return;
  el.textContent = text?`Координаты: ${text}`:'';
  if(!text){ el.style.cursor='default'; el.onclick=null; return; }
  el.style.cursor='pointer';
  el.onclick = async ()=>{ try{ await navigator.clipboard.writeText(text); toast('Скопировано'); }catch(_){ } };
}
function locateMe(){
  if(!navigator.geolocation){ toast('Геолокация не поддерживается'); return; }
  toast('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude, lng=pos.coords.longitude;
    mapDG.setView([lat,lng], 14);
    if(userMarker) mapDG.removeLayer(userMarker);
    userMarker = DG.marker([lat,lng]).addTo(mapDG).bindPopup('Вы здесь').openPopup();
    updateCoords(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  }, ()=>toast('Разрешите доступ к геолокации'));
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  bindQuickPrompts();
  bindChatHandlers();
  onScrollProgress();
  initParallax();
  initTilt();
  initReveal();
  updateScrollButtons();

  if(location.hash==='#map'){ init2GISMapOnce(); setTimeout(()=>{ try{ mapDG && mapDG.invalidateSize(); }catch(_){} },150); }
});
