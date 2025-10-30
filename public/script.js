// --- Навигация по табам (hash-router) ---
function switchTab(tab) {
  const allLinks = document.querySelectorAll('.tab-link');
  const allViews = document.querySelectorAll('.view');

  allLinks.forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
  allViews.forEach(v => v.classList.toggle('active', v.id === `view-${tab}`));

  if (tab === 'chat') {
    const input = document.getElementById('user-input');
    if (input) input.focus();
  }
}

function initTabs() {
  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (location.hash !== `#${tab}`) location.hash = `#${tab}`;
      else switchTab(tab);
    });
  });

  window.addEventListener('hashchange', () => {
    const tab = (location.hash || '#chat').replace('#', '');
    switchTab(tab);
  });

  const startTab = (location.hash || '#chat').replace('#', '');
  switchTab(startTab);
}

// --- Элементы чата ---
const sendBtn    = document.getElementById("send-btn");
const inputEl    = document.getElementById("user-input");
const chatWindow = document.getElementById("chat-window");
const typingEl   = document.getElementById("typing-indicator");
const sendSound  = document.getElementById("send-sound");

// FAB прокрутки
const btnDown = document.getElementById('btn-to-bottom');
const btnUp   = document.getElementById('btn-to-top');

// Обработчики отправки
if (sendBtn) sendBtn.addEventListener("click", sendMessage);
if (inputEl) {
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });
}

// Скролл утилиты
function isNearBottom() {
  const t = chatWindow.scrollTop;
  const h = chatWindow.scrollHeight - chatWindow.clientHeight;
  return h - t < 60;
}
function updateScrollButtons() {
  if (!btnDown || !btnUp) return;
  const nearBottom = isNearBottom();
  btnDown.classList.toggle('show', !nearBottom);
  btnUp.classList.toggle('show', chatWindow.scrollTop > 80);
}
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
  updateScrollButtons();
}
function scrollToTop() {
  chatWindow.scrollTop = 0;
  updateScrollButtons();
}
btnDown && btnDown.addEventListener('click', scrollToBottom);
btnUp   && btnUp.addEventListener('click', scrollToTop);
chatWindow.addEventListener('scroll', updateScrollButtons);

// Логика сообщений
function addMessage(sender, text) {
  const wasNear = isNearBottom();

  const msg = document.createElement("div");
  msg.className = "message " + (sender === "Вы" ? "user" : "bot");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(msg);

  if (wasNear) {
    scrollToBottom();
  } else {
    updateScrollButtons();
  }
}

function sendMessage() {
  const message = inputEl.value.trim();
  if (!message) return;

  try { sendSound && sendSound.play(); } catch(_) {}
  addMessage("Вы", message);
  inputEl.value = "";

  typingEl.style.display = "block";

  fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })
    .then(res => res.json())
    .then(data => {
      typingEl.style.display = "none";
      addMessage("ROG-бот", data.reply);
    })
    .catch(err => {
      typingEl.style.display = "none";
      addMessage("ROG-бот", "⚠️ Ошибка получения ответа.");
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  updateScrollButtons();
});

// Проксируем колесо мыши в чат, даже если курсор не на чате
document.addEventListener('wheel', (e) => {
  const activeView = document.querySelector('.view.active');
  if (!activeView || activeView.id !== 'view-chat') return;

  const chat = document.getElementById('chat-window');
  if (!chat) return;

  // Если курсор НЕ над чатом — прокручиваем чат вручную
  if (!chat.matches(':hover')) {
    chat.scrollTop += e.deltaY;
    // опционально: предотвращаем "фоновый" скролл страницы (у нас её и нет)
    e.preventDefault();
  }
}, { passive: false });
