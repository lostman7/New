# Dual AI Studio (Prototype)

This prototype provides a local-first dual-AI chat studio that runs in a desktop-sized browser window while keeping its retrieval-augmented knowledge base in RAM.

## Features

- Dark, ChatGPT-style workspace with sidebar navigation, mode picker, and saved-chat history.
- Mode switcher for **Standalone**, **Duet**, and **Arena** conversation styles.
- Two independent AI slots configured through the **Options** workspace with provider selection, API key entry, endpoint URL, and model picker support.
- Persistent configuration saved to `config/ai-config.json`, so API keys and endpoints survive restarts.
- RAM-backed knowledge cache loader that reads text files from `rag_data/` into memory.
- Chat orchestration endpoint that records every exchange and persists per-session JSON logs under `logs/`, which automatically feed the sidebar history list.
- Static front-end served by the Node.js runtime—no external dependencies required.
- Cross-platform system readiness checks that surface OS/GPU-specific dependency downloads from the `dependents/` catalog.
- GPU requirement guides for AMD, NVIDIA, and Intel under `requirements/` with quick driver/runtime links.
- Built-in speech input (STT) and playback (TTS) controls powered by the Web Speech API with guidance for advanced audio add-ons.
- Voice preferences, optional auto-read of replies, and a clipboard **Copy** action on every AI response so you can keep notes quickly.

## Getting Started

1. Ensure you have Node.js 18+ available.
2. From the repository root, run:

   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in a browser or an Electron/Tauri shell to interact with the UI.
4. Use the **Load knowledge into RAM** button in the sidebar to hydrate the cache from `rag_data/`.
5. Review the **System Readiness** card in the sidebar. It auto-detects your OS and GPU vendor and links to the appropriate drivers/runtimes stored in `dependents/`.
6. Start on the **Options** workspace to choose providers, supply API keys, set base URLs, and enable/disable each AI slot. Save when you're ready.
7. Switch to a chat mode, send prompts, and compare simulated responses. Knowledge snippets loaded into RAM are appended to the generated replies.
8. Need offline installer links? Browse `requirements/amd.md`, `requirements/nvidia.md`, or `requirements/intel.md` for per-vendor setup checklists.
9. Want to enable microphones or spoken responses? Review [`docs/audio.md`](docs/audio.md) for speech-to-text and text-to-speech setup tips, including offline options.

## Audio Controls

- Click **🎤 Talk** beneath the chat box to capture speech input when your browser supports the Web Speech API.
- Use **⏹ Stop** to cancel listening early or rely on automatic stop after a transcription is captured.
- Every AI response now includes a **🔊 Read aloud** toggle so you can hear answers, a **📋 Copy** shortcut, plus quick **👍/👎** feedback buttons.
- Choose your preferred system voice—or keep the default—and opt into automatic read-back from the new **Audio & voice** section in **Options**. Everything is powered by browser-native speech services, so no downloads are required.
- Need deterministic voices or offline pipelines? Start with the Web Speech defaults, then follow [`docs/audio.md`](docs/audio.md) to wire in Coqui TTS, Whisper.cpp, or other engines.

## Suggested improvements

Looking for the next upgrades? A few ideas worth exploring:

- Stream tokens from each provider so replies build in real time instead of appearing all at once.
- Surface retrieved knowledge snippets inline with citations so you can confirm which RAM-loaded files informed the answer.
- Add chat tags, favorites, or filters to organize a growing session library.
- Introduce advanced prompt tools (temperature sliders, prompt templates, diff view) in dedicated sidebar cards.
- Wire the audio controls to optional offline engines (Piper, Whisper.cpp) for environments where the Web Speech APIs are unavailable.

## Next Steps

- Integrate real provider SDKs/APIs (OpenAI, OpenRouter, LM Studio, Ollama, etc.).
- Expand the RAG pipeline to ingest entire folders, compute embeddings, and perform semantic retrieval.
- Add GPU-aware inference orchestration and streaming response handling across NVIDIA, AMD, Intel, and Apple GPUs.
- Package the experience in Electron or Tauri for a standalone desktop build with fullscreen and resolution controls.
