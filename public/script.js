// --- Навигация по табам (hash-router) ---
function switchTab(tab) {
  const allLinks = document.querySelectorAll('.tab-link');
  const allViews = document.querySelectorAll('.view');

  allLinks.forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
  allViews.forEach(v => v.classList.toggle('active', v.id === `view-${tab}`));

  // Фокус в чате
  if (tab === 'chat') {
    const input = document.getElementById('user-input');
    if (input) input.focus();
  }
}

function initTabs() {
  // По клику на ссылку не перезагружаем, а меняем hash
  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (location.hash !== `#${tab}`) location.hash = `#${tab}`;
      else switchTab(tab); // если уже в этом же hash
    });
  });

  window.addEventListener('hashchange', () => {
    const tab = (location.hash || '#chat').replace('#', '');
    switchTab(tab);
  });

  // Первый запуск
  const startTab = (location.hash || '#chat').replace('#', '');
  switchTab(startTab);
}

// --- Логика чата ---
const sendBtn = document.getElementById("send-btn");
const inputEl = document.getElementById("user-input");
const chatWindow = document.getElementById("chat-window");
const typingEl = document.getElementById("typing-indicator");
const sendSound = document.getElementById("send-sound");

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}
if (inputEl) {
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });
}

function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = "message " + (sender === "Вы" ? "user" : "bot");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(msg);
  // автоскролл
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function sendMessage() {
  const message = inputEl.value.trim();
  if (!message) return;

  try { sendSound && sendSound.play(); } catch(_) {}

  addMessage("Вы", message);
  inputEl.value = "";

  // показать индикатор "печатает"
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
});
