// Навигация (tabs + burger)
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active', l.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${tab}`));
  if(tab==='chat'){ document.getElementById('user-input')?.focus(); }
}
function initTabs(){
  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.addEventListener('click',e=>{
      const t=el.dataset.tab; if(el.tagName==='A') e.preventDefault();
      if(location.hash!==`#${t}`) location.hash=`#${t}`; else switchTab(t);
    });
  });
  window.addEventListener('hashchange',()=>switchTab((location.hash||'#home').slice(1)));
  switchTab((location.hash||'#home').slice(1));
  // burger
  const b=document.getElementById('burger'), nav=document.querySelector('.main-nav');
  b?.addEventListener('click',()=>nav?.classList.toggle('open'));
}

// Элементы чата
const sendBtn=document.getElementById("send-btn");
const inputEl=document.getElementById("user-input");
const chatWindow=document.getElementById("chat-window");
const typingEl=document.getElementById("typing-indicator");
const sendSound=document.getElementById("send-sound");
// FAB
const btnDown=document.getElementById('btn-to-bottom');
const btnUp=document.getElementById('btn-to-top');

// Обработчики
sendBtn?.addEventListener("click", sendMessage);
inputEl?.addEventListener("keydown", e=>{ if(e.key==="Enter") sendMessage(); });

// Скролл-утилиты
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

// Проксируем колесо к чату
document.addEventListener('wheel', (e)=>{
  const active=document.querySelector('.view.active');
  if(!active || active.id!=='view-chat') return;
  const chat=chatWindow; if(!chat) return;
  if(!chat.matches(':hover')){ chat.scrollTop += e.deltaY; e.preventDefault(); }
}, { passive:false });

// Логика сообщений
function addMessage(sender, text){
  const wasNear=isNearBottom();
  const msg=document.createElement("div");
  msg.className="message " + (sender==="Вы"?"user":"bot");
  msg.innerHTML=`<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(msg);
  wasNear ? scrollToBottom() : updateScrollButtons();
}
function sendMessage(){
  const message=inputEl.value.trim(); if(!message) return;
  try{ sendSound?.play(); }catch(_){}
  addMessage("Вы", message);
  inputEl.value="";
  typingEl.style.display="block";
  fetch("/chat",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ message }),
  })
  .then(r=>r.json())
  .then(d=>{ typingEl.style.display="none"; addMessage("ROG-бот", d.reply); })
  .catch(_=>{ typingEl.style.display="none"; addMessage("ROG-бот","⚠️ Ошибка получения ответа."); });
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  updateScrollButtons();
});
