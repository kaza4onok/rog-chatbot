// Загружаем .env только вне продакшена
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// (необязательно) отключаем кэш статики, чтобы UI обновлялся сразу
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-store');
  } else {
    res.set('Cache-Control', 'no-cache, max-age=0');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

app.use(express.json());

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: 'system', content: 'Ты мощный бот в стиле ROG. Отвечай по-геймерски, уверенно, кратко.' },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://rog-chatbot.onrender.com',
          'X-Title': 'ROG-ChatBot'
        }
      }
    );
    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("OpenRouter Error:", error.response?.data || error.message);
    res.status(500).json({ reply: "⚠️ OpenRouter API ошибка: " + (error.response?.data?.error || error.message) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер с OpenRouter запущен на http://localhost:${PORT}`);
});
