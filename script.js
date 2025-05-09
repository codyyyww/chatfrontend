const apiUrl = 'https://api-proxy-pbgb.onrender.com/api/chat';
const chatBox = document.getElementById('chat');
const inputBox = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
const searchBox = document.getElementById('search-box');

let messages = [];
let allChats = JSON.parse(localStorage.getItem('chat-history')) || {};
let currentChatId = null;

function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = 'message ' + role;
  if (role === 'user') {
  msg.textContent = content;
  msg.classList.add('user');
} else {
  msg.textContent = content;
  msg.classList.add('assistant');
}
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function saveHistory() {
  if (currentChatId) {
    allChats[currentChatId] = [...messages];
    localStorage.setItem('chat-history', JSON.stringify(allChats));
  }
}

function createNewChat() {
  currentChatId = 'chat-' + Date.now();
  allChats[currentChatId] = [];
  messages = [];
  chatBox.innerHTML = '';
  updateHistoryList();
  saveHistory();
}

function updateHistoryList() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  for (const id in allChats) {
    const btn = document.createElement('button');
    btn.textContent = `对话 ${id.slice(-5)}`;
    btn.onclick = () => loadChat(id);
    list.appendChild(btn);
  }
}

function loadChat(id) {
  currentChatId = id;
  messages = [...allChats[id]];
  chatBox.innerHTML = '';
  messages.forEach(m => appendMessage(m.role, m.content));
}

function clearAllChats() {
  if (confirm('确定要清空所有历史记录吗？')) {
    localStorage.removeItem('chat-history');
    allChats = {};
    messages = [];
    currentChatId = null;
    chatBox.innerHTML = '';
    updateHistoryList();
    createNewChat();
  }
}

function exportCurrentChat() {
  if (!currentChatId || messages.length === 0) {
    alert('当前对话为空，无法导出。');
    return;
  }
  let text = messages.map(m => `${m.role === 'user' ? '🧑' : '🤖'}: ${m.content}`).join('\n\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${currentChatId}.txt`;
  link.click();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark') ? 'on' : 'off');
}

function searchMessages() {
  const keyword = searchBox.value.trim().toLowerCase();
  chatBox.innerHTML = '';

  if (!keyword) {
    messages.forEach(m => appendMessage(m.role, m.content));
    return;
  }

  const filtered = messages.filter(m => m.content.toLowerCase().includes(keyword));
  if (filtered.length === 0) {
    const msg = document.createElement('div');
    msg.textContent = '未找到匹配内容。';
    msg.style.color = 'gray';
    chatBox.appendChild(msg);
  } else {
    filtered.forEach(m => appendMessage(m.role, m.content));
  }
}

async function loadModels() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const data = await res.json();
    const models = data.data || [];
    models.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.id;
      modelSelect.appendChild(option);
    });
    modelSelect.value = 'deepseek/deepseek-r1:free';
  } catch (err) {
    const option = document.createElement('option');
    option.value = 'deepseek/deepseek-r1:free';
    option.textContent = 'deepseek/deepseek-r1:free';
    modelSelect.appendChild(option);
  }
}

async function sendMessage() {
  const content = inputBox.value.trim();
  const selectedModel = modelSelect.value;
  if (!content) return;

  appendMessage('user', content);
  messages.push({ role: 'user', content: content });
  inputBox.value = '';
  saveHistory();

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedModel, messages })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '[无回复]';
    appendMessage('assistant', reply);
    messages.push({ role: 'assistant', content: reply });
    saveHistory();
  } catch (err) {
    appendMessage('assistant', '[发生错误]');
    console.error(err);
  }
}

// 初始化页面
loadModels();
updateHistoryList();
if (Object.keys(allChats).length > 0) {
  loadChat(Object.keys(allChats)[0]);
} else {
  createNewChat();
}

// 自动启用夜间模式
if (localStorage.getItem('dark-mode') === 'on') {
  document.body.classList.add('dark');
}
