document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  document.getElementById("send-sound").play();
  addMessage("Вы", message);
  input.value = "";

  const typing = document.getElementById("typing-indicator");
  typing.style.display = "flex";

  fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })
    .then(res => res.json())
    .then(data => {
      typing.style.display = "none";
      addMessage("ROG-бот", data.reply);
    })
    .catch(err => {
      typing.style.display = "none";
      addMessage("ROG-бот", "⚠️ Ошибка получения ответа.");
    });
}

function addMessage(sender, text) {
  const chat = document.getElementById("chat-window");
  const msg = document.createElement("div");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}
