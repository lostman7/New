const state = {
  modes: [
    { id: 'standalone', label: 'Standalone human ↔ AI' },
    { id: 'duet', label: 'Duet human ↔ dual AI' },
    { id: 'arena', label: 'Arena AI ↔ AI' },
  ],
  mode: 'standalone',
  aiSlots: {
    ai1: { slot: 'ai1', name: 'Nova', persona: 'Supportive navigator.', model: 'openai/gpt-4o', enabled: true },
    ai2: { slot: 'ai2', name: 'Echo', persona: 'Analytical strategist.', model: 'ollama/llama3', enabled: false },
  },
  transcript: [],
  sessionId: null,
  history: [],
  system: null,
  recommendations: null,
  isArenaPlaying: false,
};

const els = {
  modeSwitcher: document.getElementById('modeSwitcher'),
  chatHistory: document.getElementById('chatHistory'),
  historyEmpty: document.getElementById('historyEmpty'),
  newChatButton: document.getElementById('newChatButton'),
  chatModeLabel: document.getElementById('chatModeLabel'),
  modeSummary: document.getElementById('modeSummary'),
  sessionBadge: document.getElementById('sessionBadge'),
  chatTranscript: document.getElementById('chatTranscript'),
  chatForm: document.getElementById('chatForm'),
  chatMessage: document.getElementById('chatMessage'),
  chatActions: document.getElementById('chatActions'),
  loadRagButton: document.getElementById('loadRagButton'),
  ragStatus: document.getElementById('ragStatus'),
  systemInfo: document.getElementById('systemInfo'),
  dependencyList: document.getElementById('dependencyList'),
};

function safeRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureSessionId() {
  if (!state.sessionId) {
    state.sessionId = safeRandomId();
    updateSessionBadge();
  }
  return state.sessionId;
}

function updateSessionBadge() {
  if (!els.sessionBadge) return;
  els.sessionBadge.textContent = state.sessionId ? `Session ${state.sessionId.slice(0, 8)}` : 'New session';
}

function renderModes() {
  if (!els.modeSwitcher) return;
  els.modeSwitcher.innerHTML = '';
  state.modes.forEach(mode => {
    const button = document.createElement('button');
    button.className = 'sidebar-item';
    button.textContent = mode.label;
    button.dataset.mode = mode.id;
    if (state.mode === mode.id) {
      button.classList.add('active');
    }
    button.addEventListener('click', () => {
      state.mode = mode.id;
      renderModes();
      updateModeLabel();
      updateModeSummary();
      updateChatInputState();
    });
    els.modeSwitcher.appendChild(button);
  });
}

function updateModeLabel() {
  if (!els.chatModeLabel) return;
  const current = state.modes.find(m => m.id === state.mode);
  els.chatModeLabel.textContent = current ? current.label : state.mode;
}

function updateModeSummary() {
  if (!els.modeSummary) return;
  const summaries = {
    standalone: 'Send a single prompt and receive one AI response.',
    duet: 'Mirror your prompt to two configured AIs and compare answers side by side.',
    arena: 'Seed the conversation, then watch both AI personas take turns responding.',
  };
  els.modeSummary.textContent = summaries[state.mode] || '';
}

function updateChatInputState() {
  if (!els.chatMessage || !els.chatActions) return;
  const placeholders = {
    standalone: 'Ask anything…',
    duet: 'Share a prompt for both AIs…',
    arena: 'Describe the topic to kick off the AI vs. AI dialogue…',
  };
  els.chatMessage.placeholder = placeholders[state.mode] || 'Ask anything…';
  const submitButton = els.chatActions.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = state.mode === 'arena' ? 'Start conversation' : 'Send';
  }
  if (state.mode === 'arena') {
    els.chatMessage.rows = 2;
  } else {
    els.chatMessage.rows = 3;
  }
}

function setChatControlsDisabled(disabled) {
  if (els.chatMessage) {
    els.chatMessage.disabled = disabled;
  }
  if (els.chatActions) {
    const submitButton = els.chatActions.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = disabled;
    }
  }
}

function renderTranscript() {
  if (!els.chatTranscript) return;
  if (!Array.isArray(state.transcript) || state.transcript.length === 0) {
    els.chatTranscript.innerHTML = `
      <div class="chat-placeholder">
        <div class="chat-placeholder-icon">💬</div>
        <div class="chat-placeholder-title">Start a conversation</div>
        <div class="chat-placeholder-body">Choose a mode on the left, then send a message to your configured AI companions.</div>
      </div>`;
    return;
  }
  els.chatTranscript.innerHTML = '';
  state.transcript.forEach(entry => {
    const humanMsg = document.createElement('div');
    humanMsg.className = 'message human';
    const time = new Date(entry.timestamp).toLocaleTimeString();
    humanMsg.innerHTML = `
      <div class="meta">You • ${time}</div>
      <div class="bubble">${(entry.message || '').replace(/</g, '&lt;')}</div>`;
    els.chatTranscript.appendChild(humanMsg);

    (entry.responses || []).forEach(resp => {
      const aiMsg = document.createElement('div');
      aiMsg.className = 'message ai';
      aiMsg.innerHTML = `
        <div class="meta">${resp.name || 'AI'} (${resp.model || 'model'})</div>
        <div class="bubble">${(resp.content || '').replace(/</g, '&lt;')}</div>`;
      els.chatTranscript.appendChild(aiMsg);
    });
  });
  els.chatTranscript.scrollTop = els.chatTranscript.scrollHeight;
}

function playArenaEntry(entry) {
  if (!entry) return;
  const stagedEntry = {
    ...entry,
    responses: [],
  };
  const entryIndex = state.transcript.length;
  state.transcript.push(stagedEntry);
  renderTranscript();

  const responses = Array.isArray(entry.responses) ? entry.responses : [];
  let accumulatedDelay = 0;

  if (responses.length === 0) {
    state.transcript[entryIndex] = entry;
    state.isArenaPlaying = false;
    setChatControlsDisabled(false);
    renderTranscript();
    return;
  }

  responses.forEach((response, index) => {
    const delay = typeof response.delayMs === 'number' ? response.delayMs : 1200;
    accumulatedDelay += delay;
    setTimeout(() => {
      stagedEntry.responses.push(response);
      renderTranscript();
      if (index === responses.length - 1) {
        state.transcript[entryIndex] = entry;
        state.isArenaPlaying = false;
        setChatControlsDisabled(false);
      }
    }, accumulatedDelay);
  });
}

function renderSystemInfo() {
  if (!els.systemInfo) return;
  if (!state.system) {
    els.systemInfo.textContent = 'Detecting operating system and GPU support…';
    if (els.dependencyList) {
      els.dependencyList.innerHTML = '';
    }
    return;
  }
  const { system, recommendations } = state;
  const vendors = (system.detectedGpuVendors || []).join(', ');
  els.systemInfo.textContent = `Platform: ${system.platformLabel} (${system.platformId})\nArchitecture: ${system.arch}\nKernel/Release: ${system.release}\nDetected GPU Vendors: ${vendors}`;

  if (!els.dependencyList) return;
  els.dependencyList.innerHTML = '';

  const createList = (title, items) => {
    if (!items || items.length === 0) return;
    const group = document.createElement('div');
    group.className = 'dependency-group';
    const heading = document.createElement('h3');
    heading.textContent = title;
    group.appendChild(heading);
    const list = document.createElement('ul');
    items.forEach(item => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      link.textContent = item.name;
      li.appendChild(link);
      if (item.description) {
        const desc = document.createElement('div');
        desc.textContent = item.description;
        li.appendChild(desc);
      }
      list.appendChild(li);
    });
    group.appendChild(list);
    els.dependencyList.appendChild(group);
  };

  const rec = recommendations || {};
  createList('Runtime essentials', rec.runtimes);
  createList('Tooling', rec.tools);
  if (Array.isArray(rec.gpu)) {
    rec.gpu.forEach(entry => {
      createList(`GPU drivers (${entry.vendor.toUpperCase()})`, entry.items);
    });
  }
}

function collectSlotData(slotEl) {
  const slotId = slotEl.dataset.slot;
  const slotState = state.aiSlots[slotId];
  if (!slotState) return;
  slotEl.querySelectorAll('[data-field]').forEach(input => {
    const field = input.dataset.field;
    if (field === 'enabled') {
      slotState.enabled = input.checked;
    } else {
      slotState[field] = input.value;
    }
  });
}

function syncSlotInputs() {
  document.querySelectorAll('.ai-slot').forEach(slotEl => {
    const slotId = slotEl.dataset.slot;
    const data = state.aiSlots[slotId];
    if (!data) return;
    slotEl.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      if (field === 'enabled') {
        input.checked = !!data.enabled;
      } else {
        input.value = data[field] || '';
      }
    });
  });
}

function attachSlotListeners() {
  document.querySelectorAll('.ai-slot').forEach(slotEl => {
    slotEl.addEventListener('input', () => collectSlotData(slotEl));
    slotEl.addEventListener('change', () => collectSlotData(slotEl));
  });
  const mirrorButton = document.querySelector('[data-action="mirror-primary"]');
  if (mirrorButton) {
    mirrorButton.addEventListener('click', () => {
      const primary = { ...state.aiSlots.ai1 };
      state.aiSlots.ai2 = {
        ...state.aiSlots.ai2,
        name: `${primary.name || 'AI'} Twin`,
        persona: primary.persona,
        model: primary.model,
        enabled: true,
      };
      syncSlotInputs();
    });
  }
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }
  return response.json();
}

async function loadRag() {
  if (!els.ragStatus) return;
  els.ragStatus.textContent = 'Loading knowledge into RAM…';
  try {
    const data = await fetchJSON('/api/rag/load', { method: 'POST' });
    const { rag } = data;
    els.ragStatus.textContent = `Loaded ${rag.documents.length} document(s) at ${rag.loadedAt}.\nMemory footprint: ${Math.round(rag.totalBytes / 1024)} KB.`;
  } catch (error) {
    els.ragStatus.textContent = `Failed to load RAG: ${error.message}`;
  }
}

async function refreshRagStatus() {
  if (!els.ragStatus) return;
  try {
    const data = await fetchJSON('/api/rag/status');
    const { rag } = data;
    if (!rag.loaded) {
      els.ragStatus.textContent = 'Knowledge cache is empty. Click "Load" to hydrate RAM.';
    } else {
      els.ragStatus.textContent = `Loaded ${rag.documents.length} document(s) at ${rag.loadedAt}.\nMemory footprint: ${Math.round(rag.totalBytes / 1024)} KB.`;
    }
  } catch (error) {
    els.ragStatus.textContent = `Unable to check status: ${error.message}`;
  }
}

function collectAllSlots() {
  document.querySelectorAll('.ai-slot').forEach(collectSlotData);
}

async function submitMessage(event) {
  event.preventDefault();
  const message = els.chatMessage.value.trim();
  if (!message) return;
  if (state.mode === 'arena' && state.isArenaPlaying) {
    return;
  }

  collectAllSlots();
  els.chatMessage.value = '';

  const previousTranscript = state.transcript.slice();
  setChatControlsDisabled(true);
  if (state.mode === 'arena') {
    state.isArenaPlaying = true;
  }

  try {
    const payload = {
      mode: state.mode,
      message,
      aiSlots: Object.values(state.aiSlots),
      sessionId: ensureSessionId(),
    };
    const data = await fetchJSON('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const { conversation } = data;
    state.sessionId = conversation.sessionId;
    const entries = Array.isArray(conversation.entries) ? conversation.entries : [];
    updateSessionBadge();

    if (state.mode === 'arena' && entries.length > 0) {
      const baseEntries = entries.slice(0, entries.length - 1);
      const arenaEntry = entries[entries.length - 1];
      state.transcript = baseEntries;
      renderTranscript();
      playArenaEntry(arenaEntry);
    } else {
      state.transcript = entries;
      renderTranscript();
      setChatControlsDisabled(false);
    }
    await fetchHistory();
  } catch (error) {
    state.transcript = previousTranscript;
    alert(`Chat failed: ${error.message}`);
    state.isArenaPlaying = false;
    setChatControlsDisabled(false);
    renderTranscript();
  }
}

function renderHistory() {
  if (!els.chatHistory) return;
  els.chatHistory.innerHTML = '';
  if (!state.history || state.history.length === 0) {
    if (els.historyEmpty) {
      els.historyEmpty.style.display = 'block';
      els.historyEmpty.textContent = 'No chats yet. Start a conversation to see it listed here.';
    }
    return;
  }
  if (els.historyEmpty) {
    els.historyEmpty.style.display = 'none';
  }
  state.history.forEach(item => {
    const button = document.createElement('button');
    button.className = 'sidebar-item history-item';
    button.dataset.sessionId = item.sessionId;
    if (state.sessionId === item.sessionId) {
      button.classList.add('active');
    }
    const updated = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Unknown time';
    const title = item.preview ? item.preview.slice(0, 80) : 'Untitled chat';
    button.innerHTML = `
      <span class="history-title">${title}</span>
      <span class="history-meta">${updated}</span>`;
    button.addEventListener('click', () => loadConversation(item.sessionId));
    els.chatHistory.appendChild(button);
  });
}

async function fetchHistory() {
  try {
    const data = await fetchJSON('/api/logs');
    state.history = Array.isArray(data.logs) ? data.logs : [];
    renderHistory();
  } catch (error) {
    if (els.historyEmpty) {
      els.historyEmpty.style.display = 'block';
      els.historyEmpty.textContent = `Unable to load history: ${error.message}`;
    }
  }
}

async function loadConversation(sessionId) {
  if (!sessionId) return;
  try {
    const data = await fetchJSON(`/api/logs/read?sessionId=${encodeURIComponent(sessionId)}`);
    const { conversation } = data;
    state.sessionId = conversation.sessionId;
    state.mode = conversation.mode || state.mode;
    state.transcript = Array.isArray(conversation.entries) ? conversation.entries : [];
    state.isArenaPlaying = false;
    setChatControlsDisabled(false);
    updateModeLabel();
    updateModeSummary();
    renderModes();
    updateChatInputState();
    updateSessionBadge();
    renderTranscript();
    renderHistory();
  } catch (error) {
    alert(`Unable to load conversation: ${error.message}`);
  }
}

function startNewChat() {
  state.sessionId = safeRandomId();
  state.transcript = [];
  state.isArenaPlaying = false;
  setChatControlsDisabled(false);
  updateSessionBadge();
  renderHistory();
  renderTranscript();
  if (els.chatMessage) {
    els.chatMessage.value = '';
    els.chatMessage.focus();
  }
}

function boot() {
  renderModes();
  updateModeLabel();
  updateModeSummary();
  updateChatInputState();
  syncSlotInputs();
  attachSlotListeners();
  refreshRagStatus();
  renderTranscript();
  updateSessionBadge();

  if (els.loadRagButton) {
    els.loadRagButton.addEventListener('click', loadRag);
  }
  if (els.chatForm) {
    els.chatForm.addEventListener('submit', submitMessage);
  }
  if (els.newChatButton) {
    els.newChatButton.addEventListener('click', startNewChat);
  }

  loadSystemInfo();
  fetchHistory();
}

async function loadSystemInfo() {
  if (!els.systemInfo) return;
  renderSystemInfo();
  try {
    const data = await fetchJSON('/api/system/info');
    state.system = data.system;
    state.recommendations = data.recommendations;
    renderSystemInfo();
  } catch (error) {
    els.systemInfo.textContent = `Unable to detect system info: ${error.message}`;
  }
}

boot();
