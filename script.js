const apiUrl = 'https://api-proxy-pbgb.onrender.com/api/chat';
const chatBox = document.getElementById('chat');
const inputBox = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
let messages = [];

function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = 'message ' + role;
  msg.textContent = (role === 'user' ? '🧑：' : '🤖：') + content;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
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
    console.error('模型加载失败', err);
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

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedModel, messages: messages })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '[无回复]';
    appendMessage('assistant', reply);
    messages.push({ role: 'assistant', content: reply });
  } catch (err) {
    appendMessage('assistant', '[发生错误]');
    console.error(err);
  }
}

function startNewChat() {
  if (confirm("确定要开始新对话吗？这将清除当前聊天记录。")) {
    messages = [];
    chatBox.innerHTML = '';
  }
}

function saveChatHistory() {
  if (messages.length === 0) {
    alert("没有聊天记录可保存。");
    return;
  }
  const history = JSON.stringify(messages, null, 2);
  const blob = new Blob([history], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-history.json";
  a.click();
  URL.revokeObjectURL(url);
}

window.onload = () => {
  loadModels();

  const saved = localStorage.getItem('chatHistory');
  if (saved) {
    messages = JSON.parse(saved);
    messages.forEach(msg => appendMessage(msg.role, msg.content));
  }
};

window.onbeforeunload = () => {
  localStorage.setItem('chatHistory', JSON.stringify(messages));
};
