console.log('ROG front v24 loaded');

/* =================== NAV (topnav + dock) =================== */
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active', a.dataset.tab===tab));
  document.querySelectorAll('.dock-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${tab}`));
  if(tab==='chat'){ bindQuickPrompts(); bindChatHandlers(); textarea?.focus(); }
  document.getElementById(`view-${tab}`)?.focus({ preventScroll:true });
}
function initNav(){
  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.addEventListener('click', e=>{
      if (el.tagName==='A' || el.classList.contains('dock-btn')) e.preventDefault();
      const t=el.dataset.tab; if(location.hash!==`#${t}`) location.hash=`#${t}`; else switchTab(t);
    });
  });
  window.addEventListener('hashchange', ()=> switchTab((location.hash||'#home').slice(1)));
  switchTab((location.hash||'#home').slice(1));

  const burger=document.getElementById('burger');
  const topnav=document.querySelector('.topnav');
  if (burger && topnav) {
    burger.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open=topnav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open?'true':'false');
    });
    topnav.querySelectorAll('.nav-link').forEach(a=>{
      a.addEventListener('click', ()=>{
        topnav.classList.remove('open');
        burger.setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('click', (e)=>{
      if (topnav.classList.contains('open') && !topnav.contains(e.target) && e.target!==burger) {
        topnav.classList.remove('open');
        burger.setAttribute('aria-expanded','false');
      }
    });
  }
}

/* =================== TOAST =================== */
const toastEl=document.getElementById('toast');
function toast(msg,ms=1800){ if(!toastEl) return; toastEl.textContent=msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'),ms); }

/* =================== TILT CARDS =================== */
function initTilt(){
  document.querySelectorAll('.tilt').forEach(card=>{
    let raf=null;
    card.addEventListener('mousemove', e=>{
      const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*2-1, y=(e.clientY-r.top)/r.height*2-1;
      cancelAnimationFrame(raf); raf=requestAnimationFrame(()=> card.style.transform=`rotateY(${x*6}deg) rotateX(${-y*6}deg)`);
    });
    card.addEventListener('mouseleave', ()=> card.style.transform='');
  });
}

/* =================== CHAT STORAGE (local) =================== */
const LS_KEY='rog_chats_v1';
let chats=[], currentChatId=null;

function loadChats(){
  try{ const j=JSON.parse(localStorage.getItem(LS_KEY)||'[]'); if(Array.isArray(j)) chats=j; }catch(_){}
  if(!chats.length){ createChat('Новый диалог'); } else { currentChatId = chats[0].id; }
}
function saveChats(){ localStorage.setItem(LS_KEY, JSON.stringify(chats)); }
function createChat(title){
  const id='c_'+Date.now();
  const chat={ id, title: title||'Новый диалог', created: Date.now(), messages: [] };
  chats.unshift(chat); currentChatId=id; saveChats(); renderHistory(); renderChat(); return chat;
}
function getCurrentChat(){ return chats.find(c=>c.id===currentChatId); }
function setCurrentChat(id){ currentChatId=id; renderHistory(); renderChat(); }
function updateTitleFromFirstMessage(chat){
  const first=chat.messages.find(m=>m.role==='user'); if(first){ chat.title=(first.content||'Диалог').slice(0,60); }
}

/* =================== CHAT UI =================== */
const chatWindow=document.getElementById('chat-window');
const typingEl=document.getElementById('typing-indicator');
const sendSound=document.getElementById('send-sound');
const btnDown=document.getElementById('btn-to-bottom');
const btnUp=document.getElementById('btn-to-top');
const textarea=document.getElementById('user-input');
const spinner=document.getElementById('req-spinner');

function renderChat(){
  const chat=getCurrentChat(); if(!chat) return;
  chatWindow.innerHTML='';
  chat.messages.forEach(m=>{
    const row=document.createElement('div'); row.className='msg '+(m.role==='user'?'user':'bot');
    row.innerHTML=`<div class="bubble"><strong>${m.role==='user'?'Вы':'ROG-бот'}:</strong> <span class="t"></span>${m.role==='assistant'?'<button class="speak" title="Озвучить">🔊</button>':''}</div>`;
    row.querySelector('.t').textContent=m.content||'';
    chatWindow.appendChild(row);
  });
  scrollToBottom(); updateScrollButtons();
}
function renderHistory(){
  const sel=document.getElementById('history-select'); if(!sel) return;
  sel.innerHTML = chats.map(c=>`<option value="${c.id}" ${c.id===currentChatId?'selected':''}>${new Date(c.created).toLocaleDateString('ru-RU')} • ${c.title}</option>`).join('');
}

/* =================== CHAT HELPERS =================== */
function addMsg(role, content){
  const chat=getCurrentChat(); if(!chat) return;
  chat.messages.push({ role, content }); if(chat.messages.length===1) updateTitleFromFirstMessage(chat);
  saveChats();
}

/* textarea auto-height */
function autoResize(){ textarea.style.height='auto'; textarea.style.height=Math.min(180, textarea.scrollHeight)+'px'; }
textarea?.addEventListener('input', autoResize);

/* scroll helpers */
function isNearBottom(){ const t=chatWindow.scrollTop, h=chatWindow.scrollHeight-chatWindow.clientHeight; return h - t < 60; }
function scrollToBottom(){ chatWindow.scrollTop=chatWindow.scrollHeight; updateScrollButtons(); }
function scrollToTop(){ chatWindow.scrollTop=0; updateScrollButtons(); }
function updateScrollButtons(){ btnDown?.classList.toggle('show', !isNearBottom()); btnUp?.classList.toggle('show', chatWindow.scrollTop>80); }
chatWindow?.addEventListener('scroll', updateScrollButtons);
document.addEventListener('wheel',(e)=>{ const active=document.querySelector('.view.active'); if(!active||active.id!=='view-chat') return; if(!chatWindow.matches(':hover')){ chatWindow.scrollTop+=e.deltaY; e.preventDefault(); } }, { passive:false });
btnDown?.addEventListener('click', scrollToBottom); btnUp?.addEventListener('click', scrollToTop);

/* quick prompts */
function bindQuickPrompts(){
  const box=document.querySelector('.chips'); if(!box||box.__bound) return;
  const apply=el=>{ const chip=el.closest('.chip'); if(!chip) return; const val=chip.dataset.prompt||chip.textContent.trim(); textarea.value=val; autoResize(); textarea.focus(); textarea.setSelectionRange(val.length,val.length); };
  box.addEventListener('click', e=>apply(e.target));
  box.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('chip')){ e.preventDefault(); apply(e.target); }});
  box.__bound=true;
}

/* typewriter + speak button */
let typingAbort=null, speakingUtterance=null;
function bubble(role, text){
  const row=document.createElement('div'); row.className='msg '+(role==='user'?'user':'bot');
  row.innerHTML=`<div class="bubble"><strong>${role==='user'?'Вы':'ROG-бот'}:</strong> <span class="t"></span>${role==='assistant'?'<button class="speak" title="Озвучить">🔊</button>':''}</div>`;
  chatWindow.appendChild(row); const el=row.querySelector('.t'); el.textContent=text||''; return {row, el};
}
async function typewriter(el, text, speed=16){
  return new Promise(res=>{
    let i=0, aborted=false; typingAbort=()=>{aborted=true;res('aborted');};
    (function step(){ if(aborted) return; if(i<text.length){ el.textContent+=text[i++]; if(isNearBottom()) scrollToBottom(); setTimeout(step, speed);} else { typingAbort=null; res('done'); } })();
  });
}

/* =================== AUDIO: unlock + sound setting =================== */
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const resume = () => {
      ctx.resume().finally(() => {
        audioUnlocked = true;
        document.removeEventListener('click', resume);
        document.removeEventListener('touchstart', resume);
      });
    };
    document.addEventListener('click', resume, { once: true });
    document.addEventListener('touchstart', resume, { once: true });
    try { // warm-up
      sendSound.muted = true;
      sendSound.play().catch(()=>{}).finally(()=>{ sendSound.pause(); sendSound.currentTime=0; sendSound.muted=false; });
    } catch(_){}
  } catch(_){}
}
unlockAudio();

function settings(){ try{ return JSON.parse(localStorage.getItem('rog_settings')||'{}'); }catch(_){ return {}; } }
function canPlaySound(){ try{ return (settings().sound ?? true) === true; }catch(_){ return true; } }
function playSend(){ if(!canPlaySound()) return; try{ sendSound.currentTime=0; sendSound.play().catch(()=>{}); }catch(_){ } }

/* =================== SEND / BUSY =================== */
function setBusy(b){
  const sendBtn=document.getElementById('send-btn');
  const stopBtn=document.getElementById('stop-btn');
  if(b){ typingEl.style.display='block'; chatWindow.setAttribute('aria-busy','true'); spinner.hidden=false; sendBtn.disabled=true; stopBtn.disabled=false; }
  else { typingEl.style.display='none'; chatWindow.setAttribute('aria-busy','false'); spinner.hidden=true; sendBtn.disabled=false; stopBtn.disabled=true; }
}
function sendMessage(){
  const text=(textarea?.value||'').trim(); if(!text) return;
  playSend();
  addMsg('user', text);
  bubble('user', text);
  textarea.value=''; autoResize();
  setBusy(true);

  fetch('/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:text }) })
    .then(r=>r.json())
    .then(async d=>{
      const reply=d.reply || '🤖 Пустой ответ';
      addMsg('assistant', reply);
      const {el}=bubble('assistant',''); await typewriter(el, reply, 14);
      setBusy(false); saveChats(); renderHistory(); if(isNearBottom()) scrollToBottom(); else updateScrollButtons();
    })
    .catch(()=>{ setBusy(false); bubble('assistant','⚠️ Ошибка получения ответа.'); });
}
document.getElementById('stop-btn')?.addEventListener('click', ()=>{ if(typingAbort){ typingAbort(); toast('Остановлено'); setBusy(false); }});

/* =================== TTS (voices ru) =================== */
let voices=[];
function loadVoices(){ try{ voices = window.speechSynthesis.getVoices() || []; }catch(_){ voices=[]; } }
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text, btn){
  if (!('speechSynthesis' in window)) { toast('Озвучка не поддерживается'); return; }
  try { window.speechSynthesis.cancel(); }catch(_){}
  const u = new SpeechSynthesisUtterance(text);
  const v = voices.find(v=>/^ru(-|_|$)/i.test(v.lang)) || voices.find(v=>/en/i.test(v.lang)) || voices[0];
  if (v) u.voice=v;
  u.lang = v?.lang || 'ru-RU';
  u.rate = 1; u.pitch = 1;
  u.onend = ()=>{ btn&&btn.classList.remove('active'); speakingUtterance=null; };
  u.onerror = ()=>{ btn&&btn.classList.remove('active'); speakingUtterance=null; };
  speakingUtterance = u;
  btn&&btn.classList.add('active');
  try { window.speechSynthesis.speak(u); } catch(_){ toast('Не удалось произнести'); }
}
chatWindow.addEventListener('click',(e)=>{
  const btn=e.target.closest('.speak'); if(!btn) return;
  if(speakingUtterance){ try{ window.speechSynthesis.cancel(); }catch(_){ } speakingUtterance=null; btn.classList.remove('active'); return; }
  const text=btn.parentElement.querySelector('.t')?.textContent||''; if(text) speak(text, btn);
});

/* =================== VOICE INPUT (mic) =================== */
const micBtn=document.getElementById('mic-btn');
let recognition=null, recognizing=false;
(function initSpeech(){
  const isSecure = location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1';
  if(!isSecure){ micBtn?.setAttribute('disabled','disabled'); micBtn?.setAttribute('title','Нужен HTTPS для голосового ввода'); return; }
  const SR=window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ micBtn?.setAttribute('disabled','disabled'); micBtn?.setAttribute('title','Голосовой ввод недоступен в этом браузере'); return; }
  recognition=new SR(); recognition.lang='ru-RU'; recognition.interimResults=true; recognition.continuous=false;
  recognition.onstart=()=>{ recognizing=true; micBtn?.classList.add('rec'); };
  recognition.onerror=(ev)=>{ recognizing=false; micBtn?.classList.remove('rec'); toast('Микрофон: '+(ev.error||'ошибка')); };
  recognition.onend=()=>{ recognizing=false; micBtn?.classList.remove('rec'); };
  recognition.onresult=(e)=>{ let text=''; for(let i=e.resultIndex;i<e.results.length;i++){ text+=e.results[i][0].transcript; } textarea.value=(textarea.value?textarea.value+' ':'')+text.trim(); autoResize(); };
})();
micBtn?.addEventListener('click', ()=>{
  if(!recognition) return;
  if(!recognizing){ try{ recognition.start(); }catch(_){ } }
  else { try{ recognition.stop(); }catch(_){ } }
});

/* =================== HISTORY / EXPORT / CLEAR =================== */
document.getElementById('new-chat')?.addEventListener('click', ()=>{ createChat('Новый диалог'); renderHistory(); renderChat(); toast('Создан новый диалог'); });
document.getElementById('history-select')?.addEventListener('change', (e)=>{ setCurrentChat(e.target.value); });
document.getElementById('clear-chat')?.addEventListener('click', ()=>{ const chat=getCurrentChat(); if(!chat) return; chat.messages=[]; saveChats(); renderChat(); toast('Чат очищен'); });
document.getElementById('export-chat')?.addEventListener('click', ()=>{
  const chat=getCurrentChat(); if(!chat){ toast('Нет диалога'); return; }
  const lines=chat.messages.map(m=>`${m.role==='user'?'Вы':'ROG-бот'}: ${m.content}`).join('\n\n');
  const blob=new Blob([lines],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`chat-${new Date(chat.created).toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 0);
});

/* =================== SETTINGS =================== */
function saveSettingsObj(s){ localStorage.setItem('rog_settings', JSON.stringify(s)); }
function applySettings(){
  const s=settings();
  document.body.dataset.theme=s.theme||'neo';
  document.body.classList.toggle('reduce-motion', s.motion==='reduced');
  document.body.classList.toggle('compact', !!s.compact);
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
    saveSettingsObj(s); applySettings(); toast('Настройки сохранены');
  });
}

/* =================== INSTALL PWA =================== */
let deferredPrompt=null; const installBtn=document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; installBtn&&(installBtn.hidden=false); });
installBtn?.addEventListener('click', async ()=>{ if(!deferredPrompt){ installBtn.hidden=true; return; } try{ await deferredPrompt.prompt(); }finally{ deferredPrompt=null; installBtn.hidden=true; } });

/* =================== INIT =================== */
document.addEventListener('DOMContentLoaded', ()=>{
  initNav(); initTilt(); applySettings(); bindSettings();
  loadChats(); renderHistory(); renderChat(); bindQuickPrompts(); bindChatHandlers(); autoResize();
  if(chatWindow){ const obs=new MutationObserver(()=>{ if(isNearBottom()) scrollToBottom(); updateScrollButtons(); }); obs.observe(chatWindow,{childList:true,subtree:true}); }
});
