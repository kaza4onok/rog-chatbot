require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: 'system', content: 'Ты мощный бот в стиле Republic of Gamers. Отвечай по-геймерски, уверенно, кратко.' },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
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
