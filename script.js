// DOM Elements
const chatBox = document.getElementById('chat');
const inputBox = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
const searchBox = document.getElementById('search-box');
const sendButton = document.getElementById('send-button');

const historyPanel = document.getElementById('history-panel');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historyList = document.getElementById('history-list');

const createNewChatBtn = document.getElementById('create-new-chat-btn');
const exportCurrentChatBtn = document.getElementById('export-current-chat-btn');
const toggleDarkModeBtn = document.getElementById('toggle-dark-mode-btn');
const clearAllChatsBtn = document.getElementById('clear-all-chats-btn');


// API URL
const apiUrl = 'https://api-proxy-pbgb.onrender.com/api/chat'; // Assuming proxy is on the same domain

// State Variables
let messages = [];
let allChats = JSON.parse(localStorage.getItem('chat-history')) || {};
let currentChatId = null;
let lastWindowWidth = window.innerWidth; // Track width changes for resize logic

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
    // Just update localStorage, don't overwrite the reference!
    localStorage.setItem('chat-history', JSON.stringify(allChats));
  }
}

function createNewChat() {
  const newId = 'chat-' + Date.now();
  allChats[newId] = [];
  currentChatId = newId;
  messages = allChats[newId];
  chatBox.innerHTML = '';
  updateHistoryList();
  saveHistory();
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
  messages = allChats[id]; // <-- Fix: use direct reference, not a copy!
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
  //const preferredModelId = 'deepseek/deepseek-r1:free';
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

// --- Add Company Select Menu above model select ---
const companySelect = document.createElement('select');
companySelect.id = 'company-select';
companySelect.style.width = '100%';
companySelect.style.marginBottom = '10px';

const companyOptions = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'google', label: 'Google Gemini' }
];
companyOptions.forEach(opt => {
  const option = document.createElement('option');
  option.value = opt.value;
  option.textContent = opt.label;
  companySelect.appendChild(option);
});

// Insert above model select in the panel
document.addEventListener('DOMContentLoaded', () => {
  const modelLabel = document.querySelector('label[for="model-select"]');
  if (modelLabel && modelLabel.parentNode) {
    modelLabel.parentNode.insertBefore(companySelect, modelLabel);
  }
});

// --- Gemini models data ---
const geminiModels = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
  { id: 'gemini-live-2.5-flash-preview', name: 'Gemini 2.5 Flash Live' },
  { id: 'gemini-2.5-flash-preview-native-audio-dialog', name: 'Gemini 2.5 Flash Native Audio' },
  { id: 'gemini-2.5-flash-exp-native-audio-thinking-dialog', name: 'Gemini 2.5 Flash Native Audio (Thinking)' },
  { id: 'gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image Preview' },
  { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash Preview TTS' },
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro Preview TTS' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Preview Image Generation' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite' },
  { id: 'gemini-2.0-flash-live-001', name: 'Gemini 2.0 Flash Live' }
];

// --- Company select logic ---
companySelect.addEventListener('change', function () {
  const modelLabel = document.querySelector('label[for="model-select"]');
  if (companySelect.value === 'google') {
    if (modelLabel) modelLabel.textContent = 'Gemini 选择模型：';
    modelSelect.innerHTML = '';
    geminiModels.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      modelSelect.appendChild(option);
    });
    modelSelect.value = geminiModels[0].id;
  } else {
    if (modelLabel) modelLabel.textContent = '选择模型：';
    loadModels();
  }
});

// --- Chat Message Sending ---
async function sendMessage() {
  const content = inputBox.value.trim();
  const selectedModel = modelSelect.value;
  const selectedCompany = companySelect.value;
  if (!content) {
      inputBox.focus();
      return;
  }
  if (!selectedModel) {
    alert("请先选择一个模型。");
    modelSelect.focus();
    return;
  }

  // Ensure chat is initialized before sending
  if (!currentChatId || !allChats[currentChatId] || !messages) {
    createNewChat();
  }

  // Double-check after creation
  if (!currentChatId || !allChats[currentChatId] || !messages) {
    alert("对话初始化失败，请刷新页面重试。");
    return;
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        model: selectedModel, 
        messages: apiMessages,
        company: selectedCompany // <-- Add company info
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `API request failed with status ${response.status}.` }}));
        let errorMsg = errorData.error?.message || `Error ${response.status}`;
        console.error('API Error:', errorData);
        assistantMsgElement.textContent = `[请求错误: ${errorMsg}]`;
        assistantMsgElement.classList.add('error-message');
        messages.push({ role: 'assistant', content: `[请求错误: ${errorMsg}]`});
        return; 
    }

    // Only handle non-streaming (full JSON) response
    const data = await response.json();
    fullAssistantReply = data.choices?.[0]?.message?.content || '[无回复内容]';
    assistantMsgElement.textContent = fullAssistantReply;

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