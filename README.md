# Dual AI Studio (Prototype)

This prototype provides a local-first dual-AI chat studio that runs in a desktop-sized browser window while keeping its retrieval-augmented knowledge base in RAM.

## Features

- Dark, ChatGPT-style workspace with sidebar navigation, mode picker, and saved-chat history.
- Mode switcher for **Standalone**, **Duet**, and **Arena** conversation styles.
- Two independent AI slots, each with its own name, persona, model selector, and enable toggle.
- Quick "Mirror primary" action to clone the primary AI configuration to the secondary slot.
- RAM-backed knowledge cache loader that reads text files from `rag_data/` into memory.
- Chat orchestration endpoint that records every exchange and persists per-session JSON logs under `logs/`, which automatically feed the sidebar history list.
- Static front-end served by the Node.js runtime—no external dependencies required.
- Cross-platform system readiness checks that surface OS/GPU-specific dependency downloads from the `dependents/` catalog.
- GPU requirement guides for AMD, NVIDIA, and Intel under `requirements/` with quick driver/runtime links.

## Getting Started

1. Ensure you have Node.js 18+ available.
2. From the repository root, run:

   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in a browser or an Electron/Tauri shell to interact with the UI.
4. Use the **Load knowledge into RAM** button in the sidebar to hydrate the cache from `rag_data/`.
5. Review the **System Readiness** card in the sidebar. It auto-detects your OS and GPU vendor and links to the appropriate drivers/runtimes stored in `dependents/`.
6. Configure your AI slots and start chatting. Responses currently simulate provider output while demonstrating how RAM-cached snippets are included.
7. Need offline installer links? Browse `requirements/amd.md`, `requirements/nvidia.md`, or `requirements/intel.md` for per-vendor setup checklists.

## Next Steps

- Integrate real provider SDKs/APIs (OpenAI, OpenRouter, LM Studio, Ollama, etc.).
- Expand the RAG pipeline to ingest entire folders, compute embeddings, and perform semantic retrieval.
- Add GPU-aware inference orchestration and streaming response handling across NVIDIA, AMD, Intel, and Apple GPUs.
- Package the experience in Electron or Tauri for a standalone desktop build with fullscreen and resolution controls.
