const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const WEB_ROOT = path.join(ROOT, 'web');
const LOG_ROOT = path.join(ROOT, 'logs');
const RAG_ROOT = path.join(ROOT, 'rag_data');
const DEPENDENTS_ROOT = path.join(ROOT, 'dependents');

let dependentsManifest = null;

const serverState = {
  rag: {
    loaded: false,
    documents: [],
    totalBytes: 0,
    loadedAt: null,
  },
};

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  let pathname = url.parse(req.url).pathname;
  if (pathname === '/') {
    pathname = '/index.html';
  }
  const filePath = path.join(WEB_ROOT, pathname);
  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
    }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseVendorTokens(input, vendorSet) {
  if (!input) return;
  const checks = [
    { regex: /nvidia/i, value: 'nvidia' },
    { regex: /amd|radeon/i, value: 'amd' },
    { regex: /intel/i, value: 'intel' },
    { regex: /apple|metal/i, value: 'apple' },
  ];
  checks.forEach(check => {
    if (check.regex.test(input)) {
      vendorSet.add(check.value);
    }
  });
}

function safeShellExec(command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    return '';
  }
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  return output;
}

function detectGpuVendors() {
  const vendors = new Set();
  if (process.platform === 'linux') {
    parseVendorTokens(safeShellExec('lspci -nnk | grep -iE "vga|3d"'), vendors);
  } else if (process.platform === 'darwin') {
    parseVendorTokens(safeShellExec('/usr/sbin/system_profiler SPDisplaysDataType'), vendors);
  } else if (process.platform === 'win32') {
    parseVendorTokens(safeShellExec('wmic path win32_VideoController get name'), vendors);
  }

  if (vendors.size === 0) {
    const envBlob = Object.values(process.env || {}).join(' ');
    parseVendorTokens(envBlob, vendors);
  }

  if (vendors.size === 0) {
    vendors.add('unknown');
  }
  return Array.from(vendors);
}

function loadDependentsManifest() {
  if (dependentsManifest) return dependentsManifest;
  const manifestPath = path.join(DEPENDENTS_ROOT, 'manifest.json');
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    dependentsManifest = JSON.parse(raw);
  } catch (err) {
    dependentsManifest = { version: 1, platforms: {}, common: {} };
  }
  return dependentsManifest;
}

function normalizeRecommendations(platformId, vendors) {
  const manifest = loadDependentsManifest();
  const platformData = (manifest.platforms && manifest.platforms[platformId]) || null;
  const result = {
    platform: {
      id: platformId,
      label: (platformData && platformData.label) || platformId,
    },
    runtimes: [],
    tools: [],
    gpu: [],
  };

  if (manifest.common) {
    if (Array.isArray(manifest.common.runtimes)) {
      result.runtimes.push(...manifest.common.runtimes);
    }
    if (Array.isArray(manifest.common.tools)) {
      result.tools.push(...manifest.common.tools);
    }
  }

  if (platformData) {
    if (Array.isArray(platformData.runtimes)) {
      result.runtimes.push(...platformData.runtimes);
    }
    if (platformData.gpus) {
      vendors.forEach(vendor => {
        const items = platformData.gpus[vendor];
        if (Array.isArray(items) && items.length > 0) {
          result.gpu.push({ vendor, items });
        }
      });
    }
  }

  return result;
}

function loadRag() {
  const files = fs.readdirSync(RAG_ROOT, { withFileTypes: true });
  const docs = [];
  let totalBytes = 0;
  files.forEach(entry => {
    if (!entry.isFile()) return;
    const filePath = path.join(RAG_ROOT, entry.name);
    const content = fs.readFileSync(filePath, 'utf8');
    docs.push({ id: entry.name, content });
    totalBytes += Buffer.byteLength(content, 'utf8');
  });
  serverState.rag = {
    loaded: true,
    documents: docs,
    totalBytes,
    loadedAt: new Date().toISOString(),
  };
  return serverState.rag;
}

function sampleKnowledgeSnippet() {
  if (!serverState.rag.loaded || serverState.rag.documents.length === 0) {
    return '';
  }
  const doc = serverState.rag.documents[Math.floor(Math.random() * serverState.rag.documents.length)];
  return `\n\n[Knowledge snippet from ${doc.id}]: ${doc.content.slice(0, 200)}`;
}

function buildAiResponse(slotConfig, message) {
  if (!slotConfig || slotConfig.enabled === false) {
    return null;
  }
  const personaPrefix = slotConfig.persona ? `${slotConfig.persona.trim()} says: ` : '';
  const knowledgeSnippet = sampleKnowledgeSnippet();
  const content = `${personaPrefix}Responding as ${slotConfig.name || 'AI'} (model: ${slotConfig.model || 'unspecified'}) to "${message}".${knowledgeSnippet}`;
  return {
    slot: slotConfig.slot,
    name: slotConfig.name || 'AI',
    model: slotConfig.model || 'unspecified',
    content,
  };
}

function buildArenaExchange(aiSlots, seedMessage) {
  const active = aiSlots.filter(slot => slot && slot.enabled !== false);
  if (active.length < 2) {
    throw new Error('Arena mode requires two enabled AI slots.');
  }

  const pool = active.slice();
  const firstIndex = Math.floor(Math.random() * pool.length);
  const first = pool.splice(firstIndex, 1)[0];
  const second = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;

  if (!first || !second) {
    throw new Error('Arena mode requires at least two enabled AI slots.');
  }

  const turns = 6; // three responses each by default
  const responses = [];
  let previousMessage = seedMessage && seedMessage.trim().length > 0
    ? seedMessage.trim()
    : 'Consider the user-provided scenario.';

  for (let turn = 0; turn < turns; turn += 1) {
    const speaker = turn % 2 === 0 ? first : second;
    const listener = speaker === first ? second : first;
    if (!speaker) {
      continue;
    }
    const personaHint = speaker.persona ? `${speaker.persona.trim()} perspective.` : 'Offering perspective.';
    const knowledgeSnippet = sampleKnowledgeSnippet();
    const content = `${speaker.name || 'AI'} replying to ${listener && listener.name ? listener.name : 'their peer'} after hearing "${previousMessage}". ${personaHint}${knowledgeSnippet}`;
    const delayMs = 900 + Math.floor(Math.random() * 600);
    responses.push({
      slot: speaker.slot,
      name: speaker.name || 'AI',
      model: speaker.model || 'unspecified',
      content,
      delayMs,
    });
    previousMessage = content;
  }

  return {
    starterSlot: first.slot,
    responses,
  };
}

function ensureLogsRoot() {
  fs.mkdirSync(LOG_ROOT, { recursive: true });
}

function createSessionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidSessionId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]+$/.test(value);
}

function loadConversation(sessionId) {
  ensureLogsRoot();
  if (!isValidSessionId(sessionId)) {
    throw new Error('Invalid session identifier');
  }
  const filePath = path.resolve(LOG_ROOT, `${sessionId}.json`);
  if (!filePath.startsWith(LOG_ROOT)) {
    throw new Error('Invalid session identifier');
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function persistConversation(session) {
  ensureLogsRoot();
  if (!isValidSessionId(session.sessionId)) {
    throw new Error('Invalid session identifier');
  }
  const filePath = path.resolve(LOG_ROOT, `${session.sessionId}.json`);
  if (!filePath.startsWith(LOG_ROOT)) {
    throw new Error('Invalid session path');
  }
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
  return session;
}

function appendToConversation(sessionId, mode, entry) {
  if (!isValidSessionId(sessionId)) {
    throw new Error('Invalid session identifier');
  }
  let conversation = loadConversation(sessionId);
  if (!conversation) {
    conversation = {
      sessionId,
      mode,
      createdAt: entry.timestamp,
      updatedAt: entry.timestamp,
      entries: [],
    };
  }
  conversation.mode = mode;
  conversation.updatedAt = entry.timestamp;
  conversation.entries = Array.isArray(conversation.entries) ? conversation.entries : [];
  conversation.entries.push(entry);
  return persistConversation(conversation);
}

function listConversations() {
  ensureLogsRoot();
  const files = fs.existsSync(LOG_ROOT) ? fs.readdirSync(LOG_ROOT) : [];
  const items = [];
  files
    .filter(file => file.endsWith('.json'))
    .forEach(file => {
      const fullPath = path.join(LOG_ROOT, file);
      try {
        const conversation = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (!conversation || !conversation.sessionId) return;
        const firstEntry = Array.isArray(conversation.entries) ? conversation.entries[0] : null;
        const lastEntry = Array.isArray(conversation.entries) && conversation.entries.length > 0
          ? conversation.entries[conversation.entries.length - 1]
          : null;
        items.push({
          sessionId: conversation.sessionId,
          mode: conversation.mode,
          createdAt: conversation.createdAt || (firstEntry ? firstEntry.timestamp : null),
          updatedAt: conversation.updatedAt || (lastEntry ? lastEntry.timestamp : null),
          preview: firstEntry ? firstEntry.message : 'New conversation',
        });
      } catch (error) {
        items.push({
          sessionId: file.replace(/\.json$/, ''),
          mode: 'unknown',
          createdAt: null,
          updatedAt: null,
          preview: `Unable to read conversation: ${error.message}`,
        });
      }
    });
  return items.sort((a, b) => {
    const timeA = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const timeB = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return timeB - timeA;
  });
}

const apiRoutes = {
  async '/api/rag/load'(req, res) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      const rag = loadRag();
      sendJSON(res, 200, { message: 'Knowledge base loaded into RAM', rag });
    } catch (err) {
      sendJSON(res, 500, { error: err.message });
    }
  },
  async '/api/rag/status'(req, res) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    sendJSON(res, 200, { rag: serverState.rag });
  },
  async '/api/chat'(req, res) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      const body = await collectRequestBody(req);
      const payload = body ? JSON.parse(body) : {};
      const mode = payload.mode || 'standalone';
      const incomingSessionId = typeof payload.sessionId === 'string' && payload.sessionId.trim().length > 0
        ? payload.sessionId.trim()
        : null;
      const sessionId = incomingSessionId || createSessionId();
      const message = payload.message || '';
      const aiSlots = (payload.aiSlots || []).map((slot, index) => ({
        slot: slot.slot ?? `ai${index + 1}`,
        name: slot.name,
        persona: slot.persona,
        model: slot.model,
        enabled: slot.enabled !== false,
      }));

      const timestamp = new Date().toISOString();
      let entry;

      if (mode === 'arena') {
        const arenaExchange = buildArenaExchange(aiSlots, message);
        entry = {
          timestamp,
          mode,
          message,
          aiSlots,
          responses: arenaExchange.responses,
          arena: {
            starterSlot: arenaExchange.starterSlot,
            totalTurns: arenaExchange.responses.length,
          },
        };
      } else {
        const responses = aiSlots
          .map(slotConfig => buildAiResponse(slotConfig, message))
          .filter(Boolean);

        entry = {
          timestamp,
          mode,
          message,
          aiSlots,
          responses,
        };
      }
      const conversation = appendToConversation(sessionId, mode, entry);

      sendJSON(res, 200, { conversation });
    } catch (err) {
      sendJSON(res, 400, { error: err.message });
    }
  },
  async '/api/modes'(req, res) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    sendJSON(res, 200, {
      modes: [
        { id: 'standalone', label: 'Standalone Human ↔ AI' },
        { id: 'duet', label: 'Duet Human ↔ Dual AI' },
        { id: 'arena', label: 'Arena AI ↔ AI' },
      ],
    });
  },
  async '/api/system/info'(req, res) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    const platformId = process.platform;
    const arch = process.arch;
    const release = os.release();
    const vendors = detectGpuVendors();
    const recommendations = normalizeRecommendations(platformId, vendors);
    sendJSON(res, 200, {
      system: {
        platformId,
        platformLabel: recommendations.platform.label,
        arch,
        release,
        detectedGpuVendors: vendors,
      },
      recommendations,
    });
  },
  async '/api/dependents'(req, res) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    const query = req.query || {};
    const platformId = query.platform || process.platform;
    const vendors = (query.gpu || '')
      .split(',')
      .map(token => token.trim().toLowerCase())
      .filter(Boolean);
    const vendorList = vendors.length > 0 ? vendors : detectGpuVendors();
    const recommendations = normalizeRecommendations(platformId, vendorList);
    sendJSON(res, 200, {
      platform: recommendations.platform,
      vendors: vendorList,
      recommendations,
    });
  },
  async '/api/logs'(req, res) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      const logs = listConversations();
      sendJSON(res, 200, { logs });
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
  },
  async '/api/logs/read'(req, res) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }
    const sessionId = (req.query && req.query.sessionId) || '';
    if (!sessionId || !isValidSessionId(sessionId)) {
      sendJSON(res, 400, { error: 'Invalid session identifier' });
      return;
    }
    try {
      const conversation = loadConversation(sessionId);
      if (!conversation) {
        sendJSON(res, 404, { error: 'Conversation not found' });
        return;
      }
      sendJSON(res, 200, { conversation });
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
  },
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  req.query = parsedUrl.query || {};
  if (apiRoutes[pathname]) {
    await apiRoutes[pathname](req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Dual AI Studio server running at http://localhost:${PORT}`);
});
