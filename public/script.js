console.log('ROG front v22 loaded');

/* ===== Tabs: topnav + dock ===== */
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active', a.dataset.tab===tab));
  document.querySelectorAll('.dock-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${tab}`));
  if(tab==='chat'){ bindQuickPrompts(); bindChatHandlers(); document.getElementById('user-input')?.focus(); }
  document.getElementById(`view-${tab}`)?.focus({ preventScroll:true });
}
function initNav(){
  // Clicks
  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.addEventListener('click', e=>{
      if (el.tagName==='A' || el.classList.contains('dock-btn')) e.preventDefault();
      const t = el.dataset.tab;
      if (location.hash !== `#${t}`) location.hash = `#${t}`;
      else switchTab(t);
    });
  });
  // Hash
  window.addEventListener('hashchange', ()=> switchTab((location.hash||'#home').slice(1)));
  switchTab((location.hash||'#home').slice(1));

  // Mobile menu
  const burger=document.getElementById('burger'); const topnav=document.querySelector('.topnav');
  burger?.addEventListener('click', ()=>{
    const open = topnav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true':'false');
  });
  document.querySelectorAll('.topnav .nav-link').forEach(a=>{
    a.addEventListener('click', ()=>{ topnav.classList.remove('open'); burger?.setAttribute('aria-expanded','false'); });
  });
}

/* ===== Toast ===== */
const toastEl = document.getElementById('toast');
function toast(msg, ms=1800){ if(!toastEl) return; toastEl.textContent=msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'), ms); }

/* ===== Tilt micro-effect ===== */
function initTilt(){
  document.querySelectorAll('.tilt').forEach(card=>{
    let raf=null;
    const onMove = e=>{
      const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*2-1, y=(e.clientY-r.top)/r.height*2-1;
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=> card.style.transform=`rotateY(${x*6}deg) rotateX(${-y*6}deg)`);
    };
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', ()=> card.style.transform='');
  });
}

/* ===== Chat ===== */
const chatWindow=document.getElementById('chat-window');
const typingEl=document.getElementById('typing-indicator');
const sendSound=document.getElementById('send-sound');
const btnDown=document.getElementById('btn-to-bottom');
const btnUp=document.getElementById('btn-to-top');

function bindQuickPrompts(){
  const box = document.querySelector('.chips'); if(!box || box.__bound) return;
  const apply = (el)=>{
    const chip = el.closest('.chip'); if(!chip) return;
    const val = chip.dataset.prompt || chip.textContent.trim();
    const input = document.getElementById('user-input'); if(!input) return;
    input.value = val; input.focus(); input.setSelectionRange(val.length, val.length);
  };
  box.addEventListener('click', e=>apply(e.target));
  box.addEventListener('keydown', e=>{
    if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('chip')){ e.preventDefault(); apply(e.target); }
  });
  box.__bound = true;
}
function bubble(sender, text){
  const row=document.createElement('div'); row.className='msg '+(sender==='Вы'?'user':'bot');
  row.innerHTML=`<div class="bubble"><strong>${sender}:</strong> <span class="t"></span></div>`;
  const el=row.querySelector('.t'); el.textContent=text; chatWindow.appendChild(row); return el;
}
let typingAbort=null;
async function typewriter(el, text, speed=16){
  return new Promise(res=>{
    let i=0, aborted=false; typingAbort=()=>{aborted=true;res('aborted');};
    (function step(){
      if(aborted) return;
      if(i<text.length){ el.textContent+=text[i++]; if(isNearBottom()) scrollToBottom(); setTimeout(step, speed); }
      else { typingAbort=null; res('done'); }
    })();
  });
}
function isNearBottom(){ const t=chatWindow.scrollTop, h=chatWindow.scrollHeight-chatWindow.clientHeight; return h - t < 60; }
function scrollToBottom(){ chatWindow.scrollTop=chatWindow.scrollHeight; updateScrollButtons(); }
function scrollToTop(){ chatWindow.scrollTop=0; updateScrollButtons(); }
function updateScrollButtons(){ btnDown?.classList.toggle('show', !isNearBottom()); btnUp?.classList.toggle('show', chatWindow.scrollTop>80); }
chatWindow?.addEventListener('scroll', updateScrollButtons);
document.addEventListener('wheel', (e)=>{ const active=document.querySelector('.view.active'); if(!active||active.id!=='view-chat') return; if(!chatWindow.matches(':hover')){ chatWindow.scrollTop += e.deltaY; e.preventDefault(); } }, { passive:false });
btnDown?.addEventListener('click', scrollToBottom); btnUp?.addEventListener('click', scrollToTop);

function playSend(){ try{ sendSound.currentTime=0; sendSound.play(); }catch(_){ } }
function sendMessage(){
  const input=document.getElementById('user-input'); const text=(input?.value||'').trim(); if(!text) return;
  playSend(); bubble('Вы', text); input.value=''; typingEl.style.display='block'; chatWindow.setAttribute('aria-busy','true');
  fetch('/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:text }) })
    .then(r=>r.json())
    .then(async d=>{ typingEl.style.display='none'; chatWindow.setAttribute('aria-busy','false'); const el=bubble('ROG-бот',''); document.getElementById('stop-btn').disabled=false; await typewriter(el, d.reply||'🤖 Пустой ответ', 14); document.getElementById('stop-btn').disabled=true; })
    .catch(()=>{ typingEl.style.display='none'; chatWindow.setAttribute('aria-busy','false'); bubble('ROG-бот','⚠️ Ошибка получения ответа.'); });
}
function bindChatHandlers(){
  const sendBtn=document.getElementById('send-btn'); const stopBtn=document.getElementById('stop-btn'); const input=document.getElementById('user-input');
  if(sendBtn&&!sendBtn.__bound){ sendBtn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); sendMessage(); }); sendBtn.__bound=true; }
  if(input&&!input.__bound){ input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendMessage(); } }); input.__bound=true; }
  if(stopBtn&&!stopBtn.__bound){ stopBtn.addEventListener('click', ()=>{ if(typingAbort){ typingAbort(); toast('Остановлено'); }}); stopBtn.__bound=true; }
}

/* ===== Settings ===== */
function settings(){ try{ return JSON.parse(localStorage.getItem('rog_settings')||'{}'); }catch(_){ return {}; } }
function saveSettings(s){ localStorage.setItem('rog_settings', JSON.stringify(s)); }
function applySettings(){
  const s=settings();
  document.body.dataset.theme = s.theme || 'neo';
  document.body.classList.toggle('reduce-motion', s.motion==='reduced');
  document.body.classList.toggle('compact', !!s.compact);
  // reflect to form
  const f=document.getElementById('settings-form');
  if(f){ document.getElementById('set-theme').value=s.theme||'neo';
    document.getElementById('set-motion').value=s.motion||'full';
    document.getElementById('set-sound').checked=s.sound ?? true;
    document.getElementById('set-compact').checked=!!s.compact; }
}
function bindSettings(){
  const f=document.getElementById('settings-form'); if(!f) return;
  f.addEventListener('change', ()=>{
    const s=settings();
    s.theme=document.getElementById('set-theme').value;
    s.motion=document.getElementById('set-motion').value;
    s.sound=document.getElementById('set-sound').checked;
    s.compact=document.getElementById('set-compact').checked;
    saveSettings(s); applySettings(); toast('Настройки сохранены');
  });
}

/* ===== PWA Install (minimal) ===== */
let deferredPrompt=null; const installBtn=document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; installBtn&&(installBtn.hidden=false); });
installBtn?.addEventListener('click', async ()=>{ if(!deferredPrompt){ installBtn.hidden=true; return; } try{ await deferredPrompt.prompt(); }finally{ deferredPrompt=null; installBtn.hidden=true; } });

/* ===== Weather ===== */
const cityInput=document.getElementById('weather-city');
const wStatus=document.getElementById('weather-status');
const wCurrent=document.getElementById('weather-current');
const wForecast=document.getElementById('weather-forecast');
const W_DESC={0:'Ясно',1:'Преимущественно ясно',2:'Переменная облачность',3:'Пасмурно',45:'Туман',48:'Изморозь',51:'Морось слабая',53:'Морось',55:'Морось сильная',61:'Дождь слабый',63:'Дождь',65:'Дождь сильный',66:'Ледяной дождь слабый',67:'Ледяной дождь',71:'Снег слабый',73:'Снег',75:'Снег сильный',77:'Снежные зёрна',80:'Ливни слабые',81:'Ливни',82:'Сильный ливень',85:'Снегопад',86:'Сильный снегопад',95:'Гроза',96:'Гроза с градом',99:'Сильная гроза с градом'};
const W_EMOJI=c=>c===0?'☀️':[1].includes(c)?'🌤️':[2].includes(c)?'⛅':[3].includes(c)?'☁️':[45,48].includes(c)?'🌫️':[51,53,55,61,63,65,66,67,80,81,82].includes(c)?'🌧️':[71,73,75,77,85,86].includes(c)?'❄️':[95,96,99].includes(c)?'⛈️':'🌡️';
const setStatus=t=>{ if(wStatus) wStatus.textContent=t||''; };
function renderCurrent(city,cur){
  wCurrent.innerHTML=`
    <div class="ico" style="font-size:2rem">${W_EMOJI(cur.weather_code)}</div>
    <div class="info"><div class="city">${city}</div>
    <div class="meta">${W_DESC[cur.weather_code]||'Погода'} • Ветер ${Math.round(cur.wind_speed_10m)} м/с</div></div>
    <div class="t">${Math.round(cur.temperature_2m)}°C</div>`;
}
function renderForecast(d){
  const days=d.time.map((t,i)=>({date:new Date(t),code:d.weather_code[i],tmin:d.temperature_2m_min[i],tmax:d.temperature_2m_max[i]}));
  wForecast.innerHTML=days.map(x=>{
    const dd=x.date.toLocaleDateString('ru-RU',{weekday:'short',day:'2-digit'});
    return `<div class="day"><div class="d">${dd}</div><div class="ico">${W_EMOJI(x.code)}</div><div class="temp">${Math.round(x.tmin)}° / ${Math.round(x.tmax)}°</div></div>`;
  }).join('');
}
async function geocodeCity(name){
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ru&format=json`);
  if(!r.ok) throw new Error('geocode');
  const j=await r.json(); const p=j.results?.[0]; if(!p) throw new Error('notfound');
  return {lat:p.latitude, lon:p.longitude, label:`${p.name}${p.country?`, ${p.country}`:''}`};
}
async function fetchWeather(lat,lon){
  const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
  if(!r.ok) throw new Error('forecast'); return r.json();
}
async function showWeatherByCity(name){
  try{ setStatus('Поиск города…'); const {lat,lon,label}=await geocodeCity(name); setStatus('Загружаю прогноз…'); const data=await fetchWeather(lat,lon); renderCurrent(label,data.current); renderForecast(data.daily); setStatus(''); }
  catch(_){ setStatus('Не удалось получить погоду'); toast('⚠️ Ошибка погоды'); }
}
function showWeatherByGeo(){
  if(!navigator.geolocation){ toast('Геолокация не поддерживается'); return; }
  setStatus('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const {latitude:lat,longitude:lon}=pos.coords;
      setStatus('Загружаю прогноз…'); const data=await fetchWeather(lat,lon);
      let label='Ваше местоположение';
      try{
        const r=await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ru&format=json`);
        const j=await r.json(); const p=j.results?.[0]; if(p) label=`${p.name}${p.country?`, ${p.country}`:''}`;
      }catch(_){}
      renderCurrent(label,data.current); renderForecast(data.daily); setStatus('');
    }catch(_){ setStatus('Не удалось получить погоду'); toast('⚠️ Ошибка погоды'); }
  }, ()=>{ setStatus('Геолокация отклонена'); toast('Разрешите доступ к геолокации'); });
}
document.getElementById('weather-search')?.addEventListener('click', ()=>{ const q=(cityInput?.value||'').trim(); if(q) showWeatherByCity(q); });
cityInput?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const q=(cityInput.value||'').trim(); if(q) showWeatherByCity(q); }});
document.getElementById('weather-geo')?.addEventListener('click', showWeatherByGeo);

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  initNav(); initTilt(); applySettings(); bindSettings();
  // observe chat for auto button state
  if(chatWindow){
    const obs=new MutationObserver(()=>{ if(isNearBottom()) scrollToBottom(); updateScrollButtons(); });
    obs.observe(chatWindow,{childList:true,subtree:true});
  }
});
