// ===== Tabs & Burger =====
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active', l.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${tab}`));
  if(tab==='chat'){ document.getElementById('user-input')?.focus(); }
}

function initTabs(){
  // навигация по вкладкам
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

  // бургер-меню (исправлено)
  const b   = document.getElementById('burger');
  const nav = document.querySelector('.main-nav');

  b?.addEventListener('click', (e) => {
    e.stopPropagation();
    const opened = nav?.classList.toggle('open');
    b.setAttribute('aria-expanded', opened ? 'true' : 'false');
  });

  // закрываем меню при выборе пункта
  document.querySelectorAll('.main-nav [data-tab]').forEach(link => {
    link.addEventListener('click', () => {
      nav?.classList.remove('open');
      b?.setAttribute('aria-expanded', 'false');
    });
  });

  // закрываем меню при клике вне
  document.addEventListener('click', (e) => {
    if (nav?.classList.contains('open') && !nav.contains(e.target) && e.target !== b) {
      nav.classList.remove('open');
      b?.setAttribute('aria-expanded', 'false');
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

// ===== Parallax + Tilt + Reveal =====
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

// Быстрые подсказки
document.querySelectorAll('.chip').forEach(ch=>{
  ch.addEventListener('click', ()=>{
    inputEl.value = ch.dataset.prompt || '';
    inputEl.focus();
  });
});

// ===== Scroll helpers =====
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

// Проксируем колесо к чату, если активен таб чата
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

// ===== Send / Stop =====
sendBtn?.addEventListener("click", sendMessage);
inputEl?.addEventListener("keydown", e => { if(e.key==="Enter") sendMessage(); });
stopBtn?.addEventListener("click", ()=>{
  if(typingAbort){ typingAbort(); toast('Остановлено'); }
});

function sendMessage(){
  const message = (inputEl.value || '').trim();
  if(!message) return;
  try{ sendSound?.play(); }catch(_){}
  addUserMessage(message);
  inputEl.value="";
  typingEl.style.display="block";
  chatWindow.setAttribute('aria-busy','true');

  fetch("/chat",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ message }),
  })
  .then(r=>r.json())
  .then(async d=>{
    typingEl.style.display="none";
    chatWindow.setAttribute('aria-busy','false');
    await addBotStream(d.reply || '🤖 Пустой ответ');
  })
  .catch(_=>{
    typingEl.style.display="none";
    chatWindow.setAttribute('aria-busy','false');
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
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Событие от браузера — страница installable
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  ib && (ib.hidden = false);           // наш баннер
  installBtn && (installBtn.hidden = false); // и кнопка в шапке
});

// Клик по кнопке "Установить" в шапке
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) { ib && (ib.hidden = true); installBtn.hidden = true; return; }
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    toast(outcome === 'accepted' ? 'Установка начата' : 'Отложено');
  } catch (_) {} finally {
    deferredPrompt = null;
    ib && (ib.hidden = true);
    installBtn.hidden = true;
  }
});

// Кнопки баннера
ibInstall?.addEventListener('click', async () => {
  if (!deferredPrompt) { ib.hidden = true; return; }
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    toast(outcome === 'accepted' ? 'Установка начата' : 'Отложено');
  } catch (_) {} finally {
    deferredPrompt = null;
    ib.hidden = true;
    installBtn && (installBtn.hidden = true);
  }
});
ibClose?.addEventListener('click', () => {
  deferredPrompt = null;
  ib.hidden = true;
});

// Когда уже установлен — прячем всё
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  ib && (ib.hidden = true);
  installBtn && (installBtn.hidden = true);
  toast('Установлено ✅');
});

// На загрузке: если iOS — показываем инструкцию, если уже установлено — ничего
window.addEventListener('load', () => {
  if (isStandalone()) {
    ib && (ib.hidden = true);
    installBtn && (installBtn.hidden = true);
    return;
  }
  if (isiOS() && ib) {
    // На iOS системного beforeinstallprompt нет — даём подсказку
    const text = ib.querySelector('span');
    if (text) text.textContent = 'На iPhone: Поделиться → На экран «Домой»';
    ib.hidden = false;
  }
});


// Не показывать баннер, если уже установлено
window.addEventListener('load', () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
  if (isStandalone && ib) ib.hidden = true;
});

// ===== Init =====
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  onScrollProgress();
  initParallax();
  initTilt();
  initReveal();
  updateScrollButtons();
});
