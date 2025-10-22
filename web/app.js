const CUSTOM_MODEL_OPTION = '__custom__';

const PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelMode: 'list',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'o1-mini', label: 'O1 mini (reasoning)' },
    ],
    description: 'Connect to OpenAI hosted models with API key authentication.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    requiresApiKey: true,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    modelMode: 'list',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'google/gemini-pro', label: 'Gemini Pro' },
      { id: 'meta-llama/llama-3.1-70b-instruct:free', label: 'LLaMA 3.1 70B instruct' },
      { id: 'mistralai/mistral-large', label: 'Mistral Large' },
    ],
    description: 'Use OpenRouter to access many model vendors from a single API.',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    requiresApiKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    modelMode: 'list',
    models: [
      { id: 'llama3', label: 'llama3' },
      { id: 'phi3', label: 'phi3' },
      { id: 'mistral', label: 'mistral' },
      { id: 'qwen2', label: 'qwen2' },
    ],
    description: 'Runs local models served by Ollama on your machine.',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    requiresApiKey: false,
    defaultBaseUrl: 'http://localhost:1234/v1',
    modelMode: 'external',
    description: 'Uses whichever model is currently loaded in LM Studio.',
  },
  {
    id: 'azure',
    label: 'Azure OpenAI',
    requiresApiKey: true,
    defaultBaseUrl: 'https://YOUR-RESOURCE-NAME.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
    modelMode: 'text',
    modelPlaceholder: 'Enter deployment/model name',
    description: 'Provide your Azure deployment URL and API key.',
  },
  {
    id: 'custom',
    label: 'Custom API',
    requiresApiKey: false,
    defaultBaseUrl: '',
    modelMode: 'text',
    modelPlaceholder: 'Enter model identifier',
    description: 'Bring your own OpenAI-compatible endpoint.',
  },
];

function defaultSlot(slotId) {
  if (slotId === 'ai1') {
    return {
      slot: 'ai1',
      name: 'Nova',
      persona: 'Supportive navigator.',
      provider: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      enabled: true,
    };
  }
  if (slotId === 'ai2') {
    return {
      slot: 'ai2',
      name: 'Echo',
      persona: 'Analytical strategist.',
      provider: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
      enabled: false,
    };
  }
  return {
    slot: slotId,
    name: 'AI Companion',
    persona: '',
    provider: 'custom',
    apiKey: '',
    baseUrl: '',
    model: '',
    enabled: true,
  };
}

const state = {
  view: 'options',
  modes: [
    { id: 'standalone', label: 'Standalone human ↔ AI' },
    { id: 'duet', label: 'Duet human ↔ dual AI' },
    { id: 'arena', label: 'Arena AI ↔ AI' },
  ],
  mode: 'standalone',
  aiSlots: {
    ai1: defaultSlot('ai1'),
    ai2: defaultSlot('ai2'),
  },
  transcript: [],
  sessionId: null,
  history: [],
  system: null,
  recommendations: null,
  isArenaPlaying: false,
  configSavedAt: null,
  configDirty: false,
  configLoaded: false,
  audio: {
    supportsTTS: false,
    supportsSTT: false,
    statusMessage: '',
    recognitionCtor: null,
    recognition: null,
    isListening: false,
    isSpeaking: false,
    speakingResponseId: null,
    currentUtterance: null,
    voices: [],
    preferredVoiceUri: null,
    autoReadResponses: false,
    lastAutoSpokenId: null,
  },
};

const els = {
  openOptionsButton: document.getElementById('openOptionsButton'),
  openOptionsFromCard: document.getElementById('openOptionsFromCard'),
  headerOptionsButton: document.getElementById('headerOptionsButton'),
  beginChatButton: document.getElementById('beginChatButton'),
  optionsView: document.getElementById('optionsView'),
  chatWorkspace: document.getElementById('chatWorkspace'),
  optionsHeader: document.getElementById('optionsHeader'),
  chatHeader: document.getElementById('chatHeader'),
  configStatus: document.getElementById('configStatus'),
  optionsForm: document.getElementById('optionsForm'),
  resetOptionsButton: document.getElementById('resetOptionsButton'),
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
  voiceInputButton: document.getElementById('voiceInputButton'),
  voiceStopButton: document.getElementById('voiceStopButton'),
  voiceStatus: document.getElementById('voiceStatus'),
  voicePreference: document.getElementById('voicePreference'),
  autoReadToggle: document.getElementById('autoReadToggle'),
  voiceHelp: document.getElementById('voiceHelp'),
  loadRagButton: document.getElementById('loadRagButton'),
  ragStatus: document.getElementById('ragStatus'),
  systemInfo: document.getElementById('systemInfo'),
  dependencyList: document.getElementById('dependencyList'),
};

let audioStatusTimeout = null;

function setAudioStatus(message, options = {}) {
  const { autoClear = true, delay = 4000 } = options;
  state.audio.statusMessage = message || '';
  if (audioStatusTimeout) {
    clearTimeout(audioStatusTimeout);
    audioStatusTimeout = null;
  }
  if (state.audio.statusMessage && autoClear) {
    audioStatusTimeout = setTimeout(() => {
      audioStatusTimeout = null;
      state.audio.statusMessage = '';
      renderVoiceControls();
    }, delay);
  }
  renderVoiceControls();
}

function initializeAudio() {
  const supportsTTS = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.speechSynthesis.speak === 'function';
  const RecognitionCtor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
    : null;

  state.audio.supportsTTS = supportsTTS;
  state.audio.supportsSTT = Boolean(RecognitionCtor);
  state.audio.recognitionCtor = RecognitionCtor;
  state.audio.voices = [];
  state.audio.lastAutoSpokenId = null;

  if (!state.audio.supportsSTT) {
    setAudioStatus('Speech input not supported in this browser.', { autoClear: false });
  }

  renderAudioPreferences();

  if (supportsTTS && typeof window !== 'undefined') {
    const populateVoices = () => {
      state.audio.voices = window.speechSynthesis.getVoices();
      renderAudioPreferences();
    };
    populateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', populateVoices);
  } else {
    renderAudioPreferences();
  }

  renderVoiceControls();
}

function renderVoiceControls() {
  const supportsSTT = state.audio.supportsSTT;
  const isListening = state.audio.isListening;
  if (els.voiceInputButton) {
    els.voiceInputButton.classList.toggle('is-hidden', !supportsSTT);
    els.voiceInputButton.disabled = !supportsSTT || state.view !== 'chat' || state.isArenaPlaying;
  }
  if (els.voiceStopButton) {
    const showStop = supportsSTT && isListening;
    els.voiceStopButton.classList.toggle('is-hidden', !showStop);
    els.voiceStopButton.disabled = !supportsSTT || !isListening;
  }
  if (els.voiceStatus) {
    if (!supportsSTT) {
      els.voiceStatus.textContent = state.audio.statusMessage || 'Speech input unavailable in this browser.';
    } else if (state.audio.statusMessage) {
      els.voiceStatus.textContent = state.audio.statusMessage;
    } else if (isListening) {
      els.voiceStatus.textContent = 'Listening…';
    } else {
      els.voiceStatus.textContent = '';
    }
  }
}

function renderAudioPreferences() {
  if (els.voicePreference) {
    els.voicePreference.innerHTML = '';
    if (!state.audio.supportsTTS) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Speech synthesis unavailable';
      els.voicePreference.appendChild(option);
      els.voicePreference.disabled = true;
    } else {
      const voices = Array.isArray(state.audio.voices) ? state.audio.voices : [];
      if (voices.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Loading available voices…';
        els.voicePreference.appendChild(option);
        els.voicePreference.disabled = true;
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'System default voice';
        els.voicePreference.appendChild(defaultOption);
        voices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.voiceURI || voice.name;
          option.textContent = `${voice.name}${voice.lang ? ` (${voice.lang})` : ''}${voice.default ? ' • default' : ''}`;
          els.voicePreference.appendChild(option);
        });
        const preferred = state.audio.preferredVoiceUri;
        const match = preferred && voices.some(voice => (voice.voiceURI || voice.name) === preferred);
        els.voicePreference.value = match ? preferred : '';
        els.voicePreference.disabled = false;
      }
    }
  }

  if (els.voiceHelp) {
    if (!state.audio.supportsTTS) {
      els.voiceHelp.textContent = 'Your browser does not expose built-in speech synthesis. Try Chrome, Edge, or Safari for read aloud.';
    } else {
      els.voiceHelp.textContent = 'Dual AI Studio uses the Web Speech API built into your browser—no extra downloads required.';
    }
  }

  if (els.autoReadToggle) {
    els.autoReadToggle.disabled = !state.audio.supportsTTS;
    els.autoReadToggle.checked = Boolean(state.audio.autoReadResponses) && state.audio.supportsTTS;
  }
}

function handleVoicePreferenceChange() {
  if (!els.voicePreference) return;
  const value = els.voicePreference.value;
  state.audio.preferredVoiceUri = value && value.length > 0 ? value : null;
  markConfigDirty(true);
  renderAudioPreferences();
}

function handleAutoReadToggle(event) {
  const checked = Boolean(event.target && event.target.checked);
  state.audio.autoReadResponses = checked && state.audio.supportsTTS;
  markConfigDirty(true);
  renderAudioPreferences();
}

function collectAudioPreferences() {
  if (els.voicePreference) {
    const value = els.voicePreference.value;
    state.audio.preferredVoiceUri = value && value.length > 0 ? value : null;
  }
  if (els.autoReadToggle) {
    state.audio.autoReadResponses = Boolean(els.autoReadToggle.checked) && state.audio.supportsTTS;
  }
}

function stopSpeechSynthesis() {
  if (!state.audio.supportsTTS) return;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  state.audio.isSpeaking = false;
  state.audio.speakingResponseId = null;
  state.audio.currentUtterance = null;
  renderTranscript();
  renderVoiceControls();
}

function startSpeechSynthesis(responseId, text) {
  if (!state.audio.supportsTTS || !text) return;
  stopSpeechSynthesis();
  if (typeof window === 'undefined' || !window.SpeechSynthesisUtterance) {
    setAudioStatus('Speech synthesis is unavailable in this environment.', { autoClear: false });
    return;
  }
  const utterance = new window.SpeechSynthesisUtterance(text);
  const voices = Array.isArray(state.audio.voices) ? state.audio.voices : [];
  let selectedVoice = null;
  if (state.audio.preferredVoiceUri) {
    selectedVoice = voices.find(voice => (voice.voiceURI || voice.name) === state.audio.preferredVoiceUri) || null;
  }
  if (!selectedVoice && voices.length > 0) {
    selectedVoice = voices.find(voice => voice.default) || voices[0];
  }
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    if (selectedVoice.lang) {
      utterance.lang = selectedVoice.lang;
    }
  }
  utterance.onend = () => {
    state.audio.isSpeaking = false;
    state.audio.speakingResponseId = null;
    state.audio.currentUtterance = null;
    setAudioStatus('Playback complete.', { autoClear: true });
    renderTranscript();
  };
  utterance.onerror = event => {
    state.audio.isSpeaking = false;
    state.audio.speakingResponseId = null;
    state.audio.currentUtterance = null;
    const errorMessage = event && event.error ? `Playback error: ${event.error}` : 'Playback error occurred.';
    setAudioStatus(errorMessage, { autoClear: false });
    renderTranscript();
  };
  state.audio.isSpeaking = true;
  state.audio.speakingResponseId = responseId;
  state.audio.currentUtterance = utterance;
  state.audio.lastAutoSpokenId = responseId;
  setAudioStatus('Playing response…', { autoClear: false });
  window.speechSynthesis.speak(utterance);
  renderTranscript();
}

function toggleSpeechForResponse(responseId, response) {
  if (!state.audio.supportsTTS || !response || !response.content) return;
  if (state.audio.isSpeaking && state.audio.speakingResponseId === responseId) {
    stopSpeechSynthesis();
    setAudioStatus('Playback stopped.', { autoClear: true });
    renderTranscript();
    return;
  }
  startSpeechSynthesis(responseId, response.content);
}

function startVoiceCapture() {
  if (!state.audio.supportsSTT || state.audio.isListening) return;
  const RecognitionCtor = state.audio.recognitionCtor;
  if (!RecognitionCtor) {
    setAudioStatus('Speech input not supported in this browser.', { autoClear: false });
    return;
  }
  const recognition = new RecognitionCtor();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = event => {
    const transcript = event && event.results && event.results[0] && event.results[0][0]
      ? event.results[0][0].transcript
      : '';
    if (transcript && els.chatMessage) {
      const existing = els.chatMessage.value.trim();
      els.chatMessage.value = existing ? `${existing}\n${transcript}` : transcript;
      els.chatMessage.dispatchEvent(new Event('input'));
    }
    setAudioStatus('Transcribed speech input.', { autoClear: true });
  };

  recognition.onerror = event => {
    const errorMessage = event && event.error ? `Speech error: ${event.error}` : 'Speech recognition error occurred.';
    setAudioStatus(errorMessage, { autoClear: false });
  };

  recognition.onend = () => {
    state.audio.isListening = false;
    state.audio.recognition = null;
    if (!state.audio.statusMessage || state.audio.statusMessage === 'Listening…') {
      setAudioStatus('Listening finished.', { autoClear: true });
    } else {
      renderVoiceControls();
    }
  };

  try {
    state.audio.isListening = true;
    state.audio.recognition = recognition;
    setAudioStatus('Listening…', { autoClear: false });
    recognition.start();
  } catch (error) {
    state.audio.isListening = false;
    state.audio.recognition = null;
    setAudioStatus(`Unable to start speech capture: ${error.message}`, { autoClear: false });
  }
}

function stopVoiceCapture(options = {}) {
  const recognition = state.audio.recognition;
  if (recognition) {
    try {
      recognition.stop();
    } catch (error) {
      // Ignore stop errors.
    }
  }
  if (state.audio.isListening) {
    state.audio.isListening = false;
  }
  if (options.userCancelled) {
    setAudioStatus('Listening cancelled.', { autoClear: true });
  } else {
    renderVoiceControls();
  }
}

async function copyResponseContent(response) {
  if (!response || !response.content) return;
  const text = response.content;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    setAudioStatus('Response copied to clipboard.', { autoClear: true });
  } catch (error) {
    setAudioStatus(`Unable to copy response: ${error.message}`, { autoClear: false });
  }
}

function handleResponseFeedback(response, direction) {
  if (!response) return;
  response.feedback = direction;
  const label = direction === 'up' ? 'Feedback noted (👍).' : 'Feedback noted (👎).';
  setAudioStatus(label, { autoClear: true });
  renderTranscript();
}

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

function getProviderDef(id) {
  return PROVIDERS.find(provider => provider.id === id) || PROVIDERS.find(provider => provider.id === 'custom');
}

function populateProviderSelects() {
  document.querySelectorAll('.option-slot select[data-field="provider"]').forEach(select => {
    select.innerHTML = '';
    PROVIDERS.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.id;
      option.textContent = provider.label;
      select.appendChild(option);
    });
  });
}
function markConfigDirty(isDirty) {
  state.configDirty = isDirty;
  renderConfigStatus();
}

function renderConfigStatus() {
  if (!els.configStatus) return;
  if (state.configDirty) {
    els.configStatus.textContent = 'Unsaved changes';
    return;
  }
  if (state.configSavedAt) {
    const when = new Date(state.configSavedAt);
    els.configStatus.textContent = `Saved ${when.toLocaleString()}`;
  } else {
    els.configStatus.textContent = 'Configuration not saved yet.';
  }
}

function renderView() {
  const isOptions = state.view === 'options';
  if (els.optionsView) {
    els.optionsView.classList.toggle('is-hidden', !isOptions);
  }
  if (els.chatWorkspace) {
    els.chatWorkspace.classList.toggle('is-hidden', isOptions);
  }
  if (els.optionsHeader) {
    els.optionsHeader.classList.toggle('is-hidden', !isOptions);
  }
  if (els.chatHeader) {
    els.chatHeader.classList.toggle('is-hidden', isOptions);
  }
  if (els.openOptionsButton) {
    els.openOptionsButton.classList.toggle('active', isOptions);
  }
  if (els.openOptionsFromCard) {
    els.openOptionsFromCard.classList.toggle('active', isOptions);
  }
  if (els.headerOptionsButton) {
    els.headerOptionsButton.disabled = isOptions;
  }
  const shouldDisableChat = isOptions || state.isArenaPlaying;
  setChatControlsDisabled(shouldDisableChat);
  if (!shouldDisableChat && els.chatMessage) {
    els.chatMessage.focus();
  }
}

function setView(view) {
  state.view = view;
  renderView();
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
      setView('chat');
    });
    els.modeSwitcher.appendChild(button);
  });
}

function updateModeLabel() {
  if (!els.chatModeLabel) return;
  const current = state.modes.find(mode => mode.id === state.mode);
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
  els.chatMessage.rows = state.mode === 'arena' ? 2 : 3;
  renderVoiceControls();
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
  if (els.voiceInputButton) {
    els.voiceInputButton.disabled = disabled || !state.audio.supportsSTT;
  }
  if (els.voiceStopButton) {
    els.voiceStopButton.disabled = disabled || !state.audio.supportsSTT;
  }
  if (disabled && state.audio.isListening) {
    stopVoiceCapture({ userCancelled: true });
  }
  if (disabled) {
    stopSpeechSynthesis();
  }
  renderVoiceControls();
}

function renderTranscript() {
  if (!els.chatTranscript) return;
  if (!Array.isArray(state.transcript) || state.transcript.length === 0) {
    els.chatTranscript.innerHTML = `
      <div class="chat-placeholder">
        <div class="chat-placeholder-icon">💬</div>
        <div class="chat-placeholder-title">Ready when you are</div>
        <div class="chat-placeholder-body">Configure your AI companions in Options, choose a mode, then start chatting.</div>
      </div>`;
    return;
  }
  els.chatTranscript.innerHTML = '';
  state.transcript.forEach(entry => {
    const humanMsg = document.createElement('div');
    humanMsg.className = 'message human';
    const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
    const validTime = timestamp && !Number.isNaN(timestamp.valueOf()) ? timestamp.toLocaleTimeString() : null;
    const humanMeta = document.createElement('div');
    humanMeta.className = 'meta';
    humanMeta.textContent = validTime ? `You • ${validTime}` : 'You';
    const humanBubble = document.createElement('div');
    humanBubble.className = 'bubble';
    humanBubble.textContent = entry.message || '';
    humanMsg.appendChild(humanMeta);
    humanMsg.appendChild(humanBubble);
    els.chatTranscript.appendChild(humanMsg);

    const responses = Array.isArray(entry.responses) ? entry.responses : [];
    responses.forEach((resp, respIndex) => {
      const aiMsg = document.createElement('div');
      aiMsg.className = 'message ai';
      const provider = resp.provider ? ` • ${resp.provider}` : '';
      const aiMeta = document.createElement('div');
      aiMeta.className = 'meta';
      aiMeta.textContent = `${resp.name || 'AI'} (${resp.model || 'model'}${provider})`;
      const aiBubble = document.createElement('div');
      aiBubble.className = 'bubble';
      aiBubble.textContent = resp.content || '';
      aiMsg.appendChild(aiMeta);
      aiMsg.appendChild(aiBubble);

      const actions = document.createElement('div');
      actions.className = 'message-actions';
      const responseId = `${entry.timestamp || entry.message || 'entry'}-${resp.slot || respIndex}-${respIndex}`;

      if (state.audio.supportsTTS && resp.content) {
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'message-action-button';
        const isSpeaking = state.audio.isSpeaking && state.audio.speakingResponseId === responseId;
        speakBtn.textContent = isSpeaking ? '⏹ Stop audio' : '🔊 Read aloud';
        speakBtn.title = isSpeaking ? 'Stop audio playback' : 'Read this response out loud';
        speakBtn.addEventListener('click', () => toggleSpeechForResponse(responseId, resp));
        actions.appendChild(speakBtn);
      }

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'message-action-button';
      copyBtn.textContent = '📋 Copy';
      copyBtn.title = 'Copy response to clipboard';
      copyBtn.addEventListener('click', () => copyResponseContent(resp));
      actions.appendChild(copyBtn);

      const thumbsUp = document.createElement('button');
      thumbsUp.type = 'button';
      thumbsUp.className = 'message-action-button';
      thumbsUp.textContent = '👍';
      thumbsUp.title = 'Send positive feedback';
      if (resp.feedback === 'up') {
        thumbsUp.classList.add('is-active');
      }
      thumbsUp.addEventListener('click', () => handleResponseFeedback(resp, 'up'));
      actions.appendChild(thumbsUp);

      const thumbsDown = document.createElement('button');
      thumbsDown.type = 'button';
      thumbsDown.className = 'message-action-button';
      thumbsDown.textContent = '👎';
      thumbsDown.title = 'Send negative feedback';
      if (resp.feedback === 'down') {
        thumbsDown.classList.add('is-active');
      }
      thumbsDown.addEventListener('click', () => handleResponseFeedback(resp, 'down'));
      actions.appendChild(thumbsDown);

      if (actions.childNodes.length > 0) {
        aiMsg.appendChild(actions);
      }

      els.chatTranscript.appendChild(aiMsg);
    });
  });
  els.chatTranscript.scrollTop = els.chatTranscript.scrollHeight;
}

function maybeAutoReadLatestEntry(entries) {
  if (!state.audio.supportsTTS || !state.audio.autoReadResponses) return;
  if (!Array.isArray(entries) || entries.length === 0) return;
  const latestEntry = entries[entries.length - 1];
  if (!latestEntry) return;
  const responses = Array.isArray(latestEntry.responses) ? latestEntry.responses : [];
  if (responses.length === 0) return;
  const firstResponse = responses[0];
  if (!firstResponse || !firstResponse.content) return;
  const responseId = `${latestEntry.timestamp || latestEntry.message || 'entry'}-${firstResponse.slot || 0}-0`;
  if (state.audio.lastAutoSpokenId === responseId) return;
  state.audio.lastAutoSpokenId = responseId;
  setTimeout(() => {
    if (!state.audio.supportsTTS || !state.audio.autoReadResponses) return;
    startSpeechSynthesis(responseId, firstResponse.content);
  }, 250);
}

function playArenaEntry(entry) {
  if (!entry) return;
  stopSpeechSynthesis();
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
    setChatControlsDisabled(state.view !== 'chat');
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
        setChatControlsDisabled(state.view !== 'chat');
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

function slotElement(slotId) {
  return document.querySelector(`.option-slot[data-slot="${slotId}"]`);
}

function updateProviderUI(slotEl, slotState, options = {}) {
  if (!slotEl || !slotState) return slotState;
  const reason = options.reason || 'initial';
  const provider = getProviderDef(slotState.provider);
  const providerSelect = slotEl.querySelector('[data-field="provider"]');
  if (providerSelect) {
    providerSelect.value = provider.id;
  }

  const noteEl = slotEl.querySelector('[data-field-group="providerNote"]');
  if (noteEl) {
    const messages = [];
    if (provider.description) {
      messages.push(provider.description);
    }
    messages.push(provider.requiresApiKey ? 'API key required.' : 'No API key needed.');
    if (provider.modelMode === 'external') {
      messages.push('Model selection is controlled by the provider UI.');
    }
    noteEl.innerHTML = messages.map(msg => `<p>${msg}</p>`).join('');
  }

  const apiKeyGroup = slotEl.querySelector('[data-field-group="apiKey"]');
  if (apiKeyGroup) {
    apiKeyGroup.classList.toggle('is-hidden', !provider.requiresApiKey);
  }
  if (reason === 'provider-change' && !provider.requiresApiKey) {
    const apiKeyInput = slotEl.querySelector('[data-field="apiKey"]');
    if (apiKeyInput) {
      apiKeyInput.value = '';
      slotState.apiKey = '';
    }
  }

  const baseUrlInput = slotEl.querySelector('[data-field="baseUrl"]');
  if (baseUrlInput) {
    baseUrlInput.placeholder = provider.defaultBaseUrl || 'https://example.com/v1';
    if (reason === 'provider-change' || (!baseUrlInput.value && provider.defaultBaseUrl)) {
      baseUrlInput.value = provider.defaultBaseUrl || '';
      slotState.baseUrl = baseUrlInput.value;
    }
  }

  const modelSelectGroup = slotEl.querySelector('[data-field-group="modelSelect"]');
  const modelInputGroup = slotEl.querySelector('[data-field-group="modelInput"]');
  const modelSelect = slotEl.querySelector('[data-field="modelSelect"]');
  const modelInput = slotEl.querySelector('[data-field="model"]');

  if (provider.modelMode === 'list') {
    if (modelSelectGroup) modelSelectGroup.classList.remove('is-hidden');
    if (modelSelect) {
      modelSelect.innerHTML = '';
      provider.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
      const customOption = document.createElement('option');
      customOption.value = CUSTOM_MODEL_OPTION;
      customOption.textContent = 'Custom model ID…';
      modelSelect.appendChild(customOption);
      let selectedValue = slotState.model || '';
      const matchesPreset = provider.models.some(model => model.id === selectedValue);
      if (reason === 'provider-change') {
        selectedValue = provider.models.length > 0 ? provider.models[0].id : CUSTOM_MODEL_OPTION;
        slotState.model = selectedValue === CUSTOM_MODEL_OPTION ? '' : selectedValue;
      } else if (!selectedValue && provider.models.length > 0) {
        selectedValue = provider.models[0].id;
        slotState.model = selectedValue;
      } else if (!matchesPreset && selectedValue) {
        selectedValue = CUSTOM_MODEL_OPTION;
      }
      modelSelect.value = selectedValue;
      if (modelSelect.value === CUSTOM_MODEL_OPTION) {
        if (modelInputGroup) modelInputGroup.classList.remove('is-hidden');
        if (modelInput) {
          modelInput.value = slotState.model && !matchesPreset ? slotState.model : '';
        }
      } else {
        if (modelInputGroup) modelInputGroup.classList.add('is-hidden');
        if (modelInput) {
          modelInput.value = '';
          slotState.model = modelSelect.value;
        }
      }
    }
  } else if (provider.modelMode === 'text') {
    if (modelSelectGroup) modelSelectGroup.classList.add('is-hidden');
    if (modelInputGroup) modelInputGroup.classList.remove('is-hidden');
    if (modelInput) {
      if (reason === 'provider-change') {
        modelInput.value = '';
        slotState.model = '';
      } else if (slotState.model) {
        modelInput.value = slotState.model;
      } else {
        modelInput.value = '';
      }
      modelInput.placeholder = provider.modelPlaceholder || 'Enter model identifier';
    }
  } else if (provider.modelMode === 'external') {
    if (modelSelectGroup) modelSelectGroup.classList.add('is-hidden');
    if (modelInputGroup) modelInputGroup.classList.add('is-hidden');
    if (!slotState.model) {
      slotState.model = 'active-model';
    }
  } else {
    if (modelSelectGroup) modelSelectGroup.classList.add('is-hidden');
    if (modelInputGroup) modelInputGroup.classList.remove('is-hidden');
    if (modelInput) {
      modelInput.value = slotState.model || '';
    }
  }

  return slotState;
}

function collectSlotForm(slotId) {
  const slotEl = slotElement(slotId);
  if (!slotEl) return;
  const slotState = state.aiSlots[slotId] ? { ...state.aiSlots[slotId] } : defaultSlot(slotId);
  const nameInput = slotEl.querySelector('[data-field="name"]');
  const personaInput = slotEl.querySelector('[data-field="persona"]');
  const providerSelect = slotEl.querySelector('[data-field="provider"]');
  const apiKeyInput = slotEl.querySelector('[data-field="apiKey"]');
  const baseUrlInput = slotEl.querySelector('[data-field="baseUrl"]');
  const enabledCheckbox = slotEl.querySelector('[data-field="enabled"]');
  const modelSelect = slotEl.querySelector('[data-field="modelSelect"]');
  const modelInput = slotEl.querySelector('[data-field="model"]');

  slotState.name = nameInput ? nameInput.value.trim() : slotState.name;
  slotState.persona = personaInput ? personaInput.value.trim() : slotState.persona;
  slotState.provider = providerSelect ? providerSelect.value : slotState.provider;
  slotState.apiKey = apiKeyInput ? apiKeyInput.value : slotState.apiKey;
  slotState.baseUrl = baseUrlInput ? baseUrlInput.value.trim() : slotState.baseUrl;
  slotState.enabled = enabledCheckbox ? enabledCheckbox.checked : slotState.enabled;

  const provider = getProviderDef(slotState.provider);
  if (provider.modelMode === 'list') {
    if (modelSelect && modelSelect.value === CUSTOM_MODEL_OPTION) {
      slotState.model = modelInput ? modelInput.value.trim() : slotState.model;
    } else if (modelSelect) {
      slotState.model = modelSelect.value;
    }
  } else if (provider.modelMode === 'text') {
    slotState.model = modelInput ? modelInput.value.trim() : slotState.model;
  } else if (provider.modelMode === 'external') {
    slotState.model = slotState.model || 'active-model';
  } else {
    slotState.model = modelInput ? modelInput.value.trim() : slotState.model;
  }

  state.aiSlots[slotId] = { ...slotState, slot: slotId };
}

function collectAllSlots() {
  Object.keys(state.aiSlots).forEach(slotId => collectSlotForm(slotId));
}

function updateSlotForm(slotId) {
  const slotEl = slotElement(slotId);
  if (!slotEl) return;
  const slotState = state.aiSlots[slotId] || defaultSlot(slotId);
  const nameInput = slotEl.querySelector('[data-field="name"]');
  const personaInput = slotEl.querySelector('[data-field="persona"]');
  const providerSelect = slotEl.querySelector('[data-field="provider"]');
  const apiKeyInput = slotEl.querySelector('[data-field="apiKey"]');
  const baseUrlInput = slotEl.querySelector('[data-field="baseUrl"]');
  const enabledCheckbox = slotEl.querySelector('[data-field="enabled"]');
  const modelInput = slotEl.querySelector('[data-field="model"]');

  if (nameInput) nameInput.value = slotState.name || '';
  if (personaInput) personaInput.value = slotState.persona || '';
  if (providerSelect) providerSelect.value = slotState.provider || 'custom';
  if (apiKeyInput) apiKeyInput.value = slotState.apiKey || '';
  if (baseUrlInput) baseUrlInput.value = slotState.baseUrl || '';
  if (enabledCheckbox) enabledCheckbox.checked = slotState.enabled !== false;
  if (modelInput) modelInput.value = slotState.model || '';

  updateProviderUI(slotEl, { ...slotState }, { reason: 'initial' });
}
function handleSlotChange(event) {
  const slotEl = event.currentTarget;
  const slotId = slotEl.dataset.slot;
  if (!slotId) return;
  const field = event.target.dataset.field;
  if (field === 'provider') {
    const slotState = state.aiSlots[slotId] ? { ...state.aiSlots[slotId] } : defaultSlot(slotId);
    slotState.provider = event.target.value;
    state.aiSlots[slotId] = updateProviderUI(slotEl, slotState, { reason: 'provider-change' });
  } else if (field === 'modelSelect') {
    const provider = getProviderDef((state.aiSlots[slotId] && state.aiSlots[slotId].provider) || 'custom');
    if (event.target.value === CUSTOM_MODEL_OPTION) {
      const inputGroup = slotEl.querySelector('[data-field-group="modelInput"]');
      if (inputGroup) inputGroup.classList.remove('is-hidden');
      const modelInput = slotEl.querySelector('[data-field="model"]');
      if (modelInput && provider.modelMode === 'list') {
        const currentValue = state.aiSlots[slotId] ? state.aiSlots[slotId].model : '';
        if (currentValue && !provider.models.some(model => model.id === currentValue)) {
          modelInput.value = currentValue;
        } else {
          modelInput.value = '';
        }
        modelInput.focus();
      }
    } else {
      const inputGroup = slotEl.querySelector('[data-field-group="modelInput"]');
      if (inputGroup && provider.modelMode === 'list') {
        inputGroup.classList.add('is-hidden');
      }
    }
  }
  collectSlotForm(slotId);
  markConfigDirty(true);
}

function attachOptionListeners() {
  document.querySelectorAll('.option-slot').forEach(slotEl => {
    slotEl.addEventListener('input', handleSlotChange);
    slotEl.addEventListener('change', handleSlotChange);
  });
}

function applyConfig(config) {
  if (!config || !config.aiSlots) return;
  const incoming = config.aiSlots;
  state.aiSlots = {
    ai1: { ...state.aiSlots.ai1, ...(incoming.ai1 || incoming['ai1'] || {}) },
    ai2: { ...state.aiSlots.ai2, ...(incoming.ai2 || incoming['ai2'] || {}) },
  };
  state.configSavedAt = config.savedAt || config.saved_at || null;
  const audioConfig = config.audio || {};
  if (typeof audioConfig.preferredVoice === 'string' && audioConfig.preferredVoice.trim().length > 0) {
    state.audio.preferredVoiceUri = audioConfig.preferredVoice.trim();
  } else {
    state.audio.preferredVoiceUri = null;
  }
  state.audio.autoReadResponses = Boolean(audioConfig.autoReadResponses) && state.audio.supportsTTS;
  updateSlotForm('ai1');
  updateSlotForm('ai2');
  renderAudioPreferences();
  markConfigDirty(false);
  renderConfigStatus();
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

async function submitMessage(event) {
  event.preventDefault();
  stopSpeechSynthesis();
  if (state.audio.isListening) {
    stopVoiceCapture({ userCancelled: true });
  }
  if (state.view !== 'chat') {
    alert('Switch to the chat workspace to send messages.');
    return;
  }
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
      maybeAutoReadLatestEntry(entries);
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
  stopSpeechSynthesis();
  if (state.audio.isListening) {
    stopVoiceCapture({ userCancelled: true });
  }
  state.audio.lastAutoSpokenId = null;
  try {
    const data = await fetchJSON(`/api/logs/read?sessionId=${encodeURIComponent(sessionId)}`);
    const { conversation } = data;
    state.sessionId = conversation.sessionId;
    state.mode = conversation.mode || state.mode;
    state.transcript = Array.isArray(conversation.entries) ? conversation.entries : [];
    state.isArenaPlaying = false;
    setView('chat');
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
  stopSpeechSynthesis();
  if (state.audio.isListening) {
    stopVoiceCapture({ userCancelled: true });
  }
  state.sessionId = safeRandomId();
  state.transcript = [];
  state.isArenaPlaying = false;
  state.audio.lastAutoSpokenId = null;
  setView('chat');
  setChatControlsDisabled(false);
  updateSessionBadge();
  renderHistory();
  renderTranscript();
  if (els.chatMessage) {
    els.chatMessage.value = '';
    els.chatMessage.focus();
  }
}
async function loadConfig() {
  try {
    const data = await fetchJSON('/api/config');
    if (data && data.config) {
      applyConfig(data.config);
      state.configLoaded = true;
      if (state.view !== 'options') {
        renderView();
      }
    }
  } catch (error) {
    console.error('Unable to load configuration', error);
    els.configStatus.textContent = `Unable to load configuration: ${error.message}`;
  }
}

async function saveConfig(event) {
  event.preventDefault();
  collectAllSlots();
  collectAudioPreferences();
  try {
    const payload = {
      aiSlots: Object.values(state.aiSlots),
      audio: {
        preferredVoice: state.audio.preferredVoiceUri,
        autoReadResponses: Boolean(state.audio.autoReadResponses),
      },
    };
    const data = await fetchJSON('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data && data.config) {
      applyConfig(data.config);
      markConfigDirty(false);
      alert('Configuration saved.');
    }
  } catch (error) {
    alert(`Unable to save configuration: ${error.message}`);
  }
}

async function resetConfig() {
  try {
    await loadConfig();
    markConfigDirty(false);
  } catch (error) {
    alert(`Unable to reset configuration: ${error.message}`);
  }
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

function boot() {
  populateProviderSelects();
  updateSlotForm('ai1');
  updateSlotForm('ai2');
  initializeAudio();
  attachOptionListeners();
  renderModes();
  updateModeLabel();
  updateModeSummary();
  updateChatInputState();
  renderTranscript();
  updateSessionBadge();
  renderView();

  if (els.loadRagButton) {
    els.loadRagButton.addEventListener('click', loadRag);
  }
  if (els.chatForm) {
    els.chatForm.addEventListener('submit', submitMessage);
  }
  if (els.newChatButton) {
    els.newChatButton.addEventListener('click', startNewChat);
  }
  if (els.openOptionsButton) {
    els.openOptionsButton.addEventListener('click', () => setView('options'));
  }
  if (els.openOptionsFromCard) {
    els.openOptionsFromCard.addEventListener('click', () => setView('options'));
  }
  if (els.headerOptionsButton) {
    els.headerOptionsButton.addEventListener('click', () => setView('options'));
  }
  if (els.beginChatButton) {
    els.beginChatButton.addEventListener('click', () => setView('chat'));
  }
  if (els.optionsForm) {
    els.optionsForm.addEventListener('submit', saveConfig);
  }
  if (els.resetOptionsButton) {
    els.resetOptionsButton.addEventListener('click', resetConfig);
  }
  if (els.voiceInputButton) {
    els.voiceInputButton.addEventListener('click', startVoiceCapture);
  }
  if (els.voiceStopButton) {
    els.voiceStopButton.addEventListener('click', () => stopVoiceCapture({ userCancelled: true }));
  }
  if (els.voicePreference) {
    els.voicePreference.addEventListener('change', handleVoicePreferenceChange);
  }
  if (els.autoReadToggle) {
    els.autoReadToggle.addEventListener('change', handleAutoReadToggle);
  }

  loadSystemInfo();
  refreshRagStatus();
  loadConfig();
  fetchHistory();
}

boot();
