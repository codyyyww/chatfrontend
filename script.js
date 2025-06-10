// DOM Elements
const chatBox = document.getElementById('chat');
const inputBox = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
const searchBox = document.getElementById('search-box');
const sendButton = document.getElementById('send-button');

const historyPanel = document.getElementById('history-panel');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historyList = document.getElementById('history-list');

const accessKeyInput = document.getElementById('access-key-input');
const saveAccessKeyBtn = document.getElementById('save-access-key-btn');
const accessKeyStatus = document.getElementById('access-key-status');

const createNewChatBtn = document.getElementById('create-new-chat-btn');
const exportCurrentChatBtn = document.getElementById('export-current-chat-btn');
const toggleDarkModeBtn = document.getElementById('toggle-dark-mode-btn');
const clearAllChatsBtn = document.getElementById('clear-all-chats-btn');


// API URL
const apiUrl = '/api/chat'; // Assuming proxy is on the same domain

// State Variables
let messages = [];
let allChats = JSON.parse(localStorage.getItem('chat-history')) || {};
let currentChatId = null;
let currentAccessKey = localStorage.getItem('chat-access-key') || '';
let lastWindowWidth = window.innerWidth; // Track width changes for resize logic

// --- Access Key Management ---
function updateAccessKeyStatus() {
    if (!accessKeyStatus) return;
    if (currentAccessKey) {
        accessKeyStatus.textContent = '密钥已设置。';
        accessKeyStatus.style.color = 'green';
        if (accessKeyInput) accessKeyInput.value = currentAccessKey;
    } else {
        accessKeyStatus.textContent = '未设置访问密钥。聊天功能可能受限。';
        accessKeyStatus.style.color = 'orange';
    }
}

function saveAccessKey() {
    if (accessKeyInput && accessKeyStatus) {
        currentAccessKey = accessKeyInput.value.trim();
        if (currentAccessKey) {
            localStorage.setItem('chat-access-key', currentAccessKey);
            accessKeyStatus.textContent = '密钥已保存!';
            accessKeyStatus.style.color = 'green';
        } else {
            localStorage.removeItem('chat-access-key');
            accessKeyStatus.textContent = '密钥已清除。';
            accessKeyStatus.style.color = 'orange';
        }
        setTimeout(() => updateAccessKeyStatus(), 1500);
    }
}

// --- UI & History Panel ---
function toggleHistoryPanel() {
    if (historyPanel && toggleHistoryBtn) {
        const isExpanded = historyPanel.classList.toggle('show');
        toggleHistoryBtn.setAttribute('aria-expanded', isExpanded.toString());
    }
}

function handleResizeLayout() {
    if (!historyPanel || !toggleHistoryBtn) return;

    const currentWindowWidth = window.innerWidth;
    const isMobileView = currentWindowWidth <= 768;
    const wasMobileView = lastWindowWidth <= 768; // Check state *before* this resize

    if (isMobileView) {
        toggleHistoryBtn.style.display = 'block';
        // If we just switched from desktop to mobile AND the panel was open (desktop default)
        if (!wasMobileView && historyPanel.classList.contains('show')) {
            historyPanel.classList.remove('show');
            toggleHistoryBtn.setAttribute('aria-expanded', 'false');
        }
        // Otherwise, on mobile, the panel's state (open/closed) is managed by user interaction (toggleHistoryPanel)
        // and should persist through resizes like keyboard appearing/disappearing,
        // as long as it stays in mobile view.
    } else { // Desktop View
        toggleHistoryBtn.style.display = 'none';
        if (!historyPanel.classList.contains('show')) {
            historyPanel.classList.add('show'); // Default to open on desktop
            toggleHistoryBtn.setAttribute('aria-expanded', 'true');
        }
    }
    lastWindowWidth = currentWindowWidth; // Update last width for the next resize event
}


// --- Chat & Message Handling ---
function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.textContent = content;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function saveHistory() {
  if (currentChatId) {
    allChats[currentChatId] = [...messages];
    localStorage.setItem('chat-history', JSON.stringify(allChats));
  }
}

function createNewChat() {
  const newId = 'chat-' + Date.now();
  allChats[newId] = [];
  loadChat(newId);
}

function updateHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = '';
  const sortedChatIds = Object.keys(allChats).sort((a, b) => {
    const timeA = parseInt(a.split('-')[1] || '0');
    const timeB = parseInt(b.split('-')[1] || '0');
    return timeB - timeA;
  });

  for (const id of sortedChatIds) {
    const btn = document.createElement('button');
    const chatMessages = allChats[id];
    let chatTitle = `对话 ${id.slice(-5)}`;
    if (chatMessages && chatMessages.length > 0) {
        const firstUserMessage = chatMessages.find(m => m.role === 'user');
        if (firstUserMessage?.content) {
            chatTitle = firstUserMessage.content.substring(0, 25) + (firstUserMessage.content.length > 25 ? '...' : '');
        } else if (chatMessages[0]?.content) {
            chatTitle = chatMessages[0].content.substring(0, 25) + (chatMessages[0].content.length > 25 ? '...' : '');
        }
    }
    btn.textContent = chatTitle;
    btn.title = `加载对话 ${id}`;
    btn.onclick = () => loadChat(id);
    if (id === currentChatId) {
        btn.classList.add('active-chat');
    }
    historyList.appendChild(btn);
  }
}

function loadChat(id) {
  if (!allChats[id]) {
      allChats[id] = [];
  }
  currentChatId = id;
  messages = [...allChats[id]];
  chatBox.innerHTML = '';
  messages.forEach(m => appendMessage(m.role, m.content));
  
  if (searchBox) searchBox.value = '';
  updateHistoryList();
}

function clearAllChats() {
  if (confirm('确定要清空所有历史记录吗？此操作无法撤销。')) {
    localStorage.removeItem('chat-history');
    allChats = {};
    messages = [];
    currentChatId = null;
    chatBox.innerHTML = '';
    createNewChat();
  }
}

function exportCurrentChat() {
  if (!currentChatId || messages.length === 0) {
    alert('当前对话为空，无法导出。');
    return;
  }
  let textContent = `Chat ID: ${currentChatId}\nModel: ${modelSelect.value || 'N/A'}\nExported: ${new Date().toLocaleString()}\n\n`;
  textContent += messages.map(m => `${m.role === 'user' ? '🧑 User' : '🤖 Assistant'}:\n${m.content}`).join('\n\n---\n\n');
  
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `chat-${currentChatId.slice(-5)}-${new Date().toISOString().split('T')[0]}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark') ? 'on' : 'off');
}

function searchMessages() {
  if (!searchBox || !chatBox) return;
  const keyword = searchBox.value.trim().toLowerCase();
  chatBox.innerHTML = ''; 

  const sourceMessages = (currentChatId && allChats[currentChatId]) ? allChats[currentChatId] : [];

  if (!keyword) {
    sourceMessages.forEach(m => appendMessage(m.role, m.content));
    return;
  }

  const filtered = sourceMessages.filter(m => m.content.toLowerCase().includes(keyword));
  
  if (filtered.length === 0) {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = '在当前对话中未找到匹配内容。';
    Object.assign(msgDiv.style, { textAlign: 'center', color: 'gray', padding: '20px' });
    chatBox.appendChild(msgDiv);
  } else {
    filtered.forEach(m => appendMessage(m.role, m.content));
  }
}

async function loadModels() {
  if (!modelSelect) return;
  const defaultModels = [
    { id: 'deepseek/deepseek-chat', name: 'Deepseek Chat (Default)' },
    { id: 'mistralai/mistral-7b-instruct-v0.2', name: 'Mistral 7B Instruct' },
    { id: 'google/gemma-7b-it', name: 'Google Gemma 7B IT' },
    { id: 'openai/gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo' },
  ];
  const preferredModelId = 'deepseek/deepseek-chat';
  modelSelect.innerHTML = ''; 

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (res.ok) {
        const data = await res.json();
        const models = (data.data || [])
            .sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id));
        models.forEach(m => {
          const option = document.createElement('option');
          option.value = m.id;
          option.textContent = m.name || m.id;
          modelSelect.appendChild(option);
        });
        
        const preferredOption = modelSelect.querySelector(`option[value="${preferredModelId}"]`);
        if (preferredOption) {
            modelSelect.value = preferredModelId;
        } else if (models.length > 0) {
            modelSelect.value = models[0].id;
        }
    } else {
        throw new Error(`Failed to fetch models: ${res.status}`);
    }
  } catch (err) {
    console.warn('Failed to load models from OpenRouter, using default list:', err);
    defaultModels.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      modelSelect.appendChild(option);
    });
    const preferredOption = modelSelect.querySelector(`option[value="${preferredModelId}"]`);
    if (preferredOption) {
        modelSelect.value = preferredModelId;
    } else if (defaultModels.length > 0) {
        modelSelect.value = defaultModels[0].id;
    }
  }
  if (!modelSelect.value && modelSelect.options.length > 0) {
      modelSelect.value = modelSelect.options[0].value;
  }
}

async function sendMessage() {
  if (!currentAccessKey) {
    alert('请先在左侧面板设置并保存访问密钥。');
    if (accessKeyStatus) {
        accessKeyStatus.textContent = '需要访问密钥才能发送消息！';
        accessKeyStatus.style.color = 'red';
    }
    if(accessKeyInput) accessKeyInput.focus();
    return;
  }

  const content = inputBox.value.trim();
  const selectedModel = modelSelect.value;
  if (!content) {
      inputBox.focus();
      return;
  }
  if (!selectedModel) {
    alert("请先选择一个模型。");
    modelSelect.focus();
    return;
  }

  if (!currentChatId) {
    createNewChat();
  }

  appendMessage('user', content);
  messages.push({ role: 'user', content: content });
  inputBox.value = '';
  inputBox.focus();
  if (sendButton) sendButton.disabled = true;

  const assistantMsgElement = appendMessage('assistant', '...');
  let fullAssistantReply = '';

  try {
    const apiMessages = [...messages];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Access-Key': currentAccessKey
      },
      body: JSON.stringify({ model: selectedModel, messages: apiMessages })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `API request failed with status ${response.status}.` }}));
        let errorMsg = errorData.error?.message || `Error ${response.status}`;
        if (response.status === 401) {
            errorMsg = '访问密钥无效或已过期。请在左侧面板更新密钥。';
            if (accessKeyStatus) {
                accessKeyStatus.textContent = '密钥无效！';
                accessKeyStatus.style.color = 'red';
            }
            localStorage.removeItem('chat-access-key');
            currentAccessKey = '';
        }
        console.error('API Error:', errorData);
        assistantMsgElement.textContent = `[请求错误: ${errorMsg}]`;
        assistantMsgElement.classList.add('error-message');
        messages.push({ role: 'assistant', content: `[请求错误: ${errorMsg}]`});
        // Error message is pushed to messages array. It will be saved with next successful history save.
        // No explicit saveHistory() or updateHistoryList() here to avoid duplicate entries or premature updates.
        return; 
    }
    if (accessKeyStatus) {
        accessKeyStatus.textContent = '密钥有效。';
        accessKeyStatus.style.color = 'green';
        setTimeout(() => updateAccessKeyStatus(), 2000);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    assistantMsgElement.textContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      while ((eolIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.substring(0, eolIndex).trim();
        buffer = buffer.substring(eolIndex + 1);
        if (line.startsWith('data: ')) {
          const jsonData = line.substring(6);
          if (jsonData.trim() === '[DONE]') { /* Done */ }
          else {
            try {
              const chunk = JSON.parse(jsonData);
              if (chunk.choices?.[0]?.delta?.content) {
                const contentChunk = chunk.choices[0].delta.content;
                fullAssistantReply += contentChunk;
                assistantMsgElement.textContent = fullAssistantReply;
                chatBox.scrollTop = chatBox.scrollHeight;
              }
            } catch (e) { console.warn('Failed to parse JSON chunk:', jsonData, e); }
          }
        }
      }
    }
    if (buffer.trim().startsWith('data: ')) {
        const jsonData = buffer.trim().substring(6);
        if (jsonData !== '[DONE]') {
            try {
                const chunk = JSON.parse(jsonData);
                 if (chunk.choices?.[0]?.delta?.content) {
                    fullAssistantReply += chunk.choices[0].delta.content;
                    assistantMsgElement.textContent = fullAssistantReply;
                }
            } catch (e) { /* ignore */ }
        }
    }
    if (fullAssistantReply.trim() === '' && !assistantMsgElement.textContent.includes("错误")) {
        fullAssistantReply = '[无回复内容]';
        assistantMsgElement.textContent = fullAssistantReply;
    }
    messages.push({ role: 'assistant', content: fullAssistantReply });
    saveHistory();
    updateHistoryList();
  } catch (err) {
    console.error('Fetch/Stream processing error:', err);
    assistantMsgElement.textContent = '[连接或处理错误，请检查控制台]';
    assistantMsgElement.classList.add('error-message');
    messages.push({ role: 'assistant', content: '[连接或处理错误]' });
    saveHistory();
    updateHistoryList();
  } finally {
    if (sendButton) sendButton.disabled = false;
  }
}

// --- Initialization ---
function initializeApp() {
    // Access Key
    updateAccessKeyStatus();
    if (saveAccessKeyBtn) {
        saveAccessKeyBtn.addEventListener('click', saveAccessKey);
    }
    if (accessKeyInput) {
        accessKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveAccessKey();
            }
        });
    }

    // Models
    loadModels();

    // Dark Mode
    if (localStorage.getItem('dark-mode') === 'on') {
        document.body.classList.add('dark');
    }

    // Chat History & Initial Load
    const sortedChatIds = Object.keys(allChats).sort((a, b) => parseInt(b.split('-')[1]) - parseInt(a.split('-')[1]));
    if (sortedChatIds.length > 0) {
        loadChat(sortedChatIds[0]);
    } else {
        createNewChat();
    }

    // Event Listeners for UI elements
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', toggleHistoryPanel);
    }
    
    // Click outside to close panel on mobile
    document.addEventListener('click', function (e) {
      if (window.innerWidth <= 768 && historyPanel && historyPanel.classList.contains('show')) {
        const isToggleButton = toggleHistoryBtn && toggleHistoryBtn.contains(e.target);
        const isInsidePanel = historyPanel.contains(e.target);
        if (!isToggleButton && !isInsidePanel) {
          toggleHistoryPanel();
        }
      }
    });
    
    // Layout handling for resize and initial load
    window.addEventListener('resize', handleResizeLayout);
    handleResizeLayout(); // Call on load

    if (inputBox) {
        inputBox.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (sendButton && !sendButton.disabled) {
                     sendMessage();
                }
            }
        });
    }
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    if (searchBox) {
        searchBox.addEventListener('input', searchMessages);
    }

    // History Panel Action Buttons
    if (createNewChatBtn) createNewChatBtn.addEventListener('click', createNewChat);
    if (exportCurrentChatBtn) exportCurrentChatBtn.addEventListener('click', exportCurrentChat);
    if (toggleDarkModeBtn) toggleDarkModeBtn.addEventListener('click', toggleDarkMode);
    if (clearAllChatsBtn) clearAllChatsBtn.addEventListener('click', clearAllChats);
}

document.addEventListener('DOMContentLoaded', initializeApp);
