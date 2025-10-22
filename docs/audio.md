# Audio Guide

Dual AI Studio ships with browser-native speech tools so you can talk to the workspace and hear each AI reply. This guide explains how the built-in controls work, what browsers support them, and how to wire up more advanced/offline audio backends when you are ready.

## Built-in capabilities

| Feature | Implementation | Notes |
| --- | --- | --- |
| Text-to-speech playback | Web Speech API `speechSynthesis` | Available in Chromium-based browsers, Safari, and most desktop builds. Voices come from the host OS. |
| Speech-to-text capture | Web Speech API `SpeechRecognition`/`webkitSpeechRecognition` | Supported in Chromium (Chrome/Edge/Brave/Arc) and Safari. Firefox has partial/inactive support. |
| Auto-read first reply | UI toggle in **Options → Audio & voice** | Uses your preferred voice to play back the first response after each message. |

### Enabling the microphone

1. Launch the workspace (`npm start`) and open it in a compatible browser.
2. Click the **🎤 Talk** button under the chat box. Your browser will ask for microphone permission the first time.
3. Speak clearly. The captured transcript is inserted into the chat input once recognition stops.
4. Press **⏹ Stop** to cancel listening early.

If the **🎤 Talk** button is disabled or hidden, your browser does not expose the Web Speech API. Switch to a supported browser or integrate an offline recognizer (see below).

### Playing AI responses aloud

* Every AI message includes a **🔊 Read aloud** button. Click it to queue the message with the system or selected voice.
* Click **⏹ Stop audio** while a message is speaking to cancel playback.
* Pick a preferred voice (or stick with the system default) under **Options → Audio & voice**. The dropdown lists the Web Speech voices your browser exposes.

### Choosing a voice & auto-read

Open the **Options** workspace and scroll to the **Audio & voice** panel:

1. **Preferred voice** — Select from the voices exposed by your browser/OS. Leaving it blank uses the default system voice.
2. **Auto-read replies** — Enable the checkbox to have the first AI response spoken automatically after each prompt. This uses the same preferred voice and still allows manual playback on additional responses.

These settings are saved inside `config/ai-config.json`, so you do not need to reconfigure them between launches.

## Offline and advanced options

When you need deterministic voices, custom languages, or offline support, layer an external engine behind the existing UI. Recommended starting points:

### Text-to-speech

- [Coqui TTS](https://github.com/coqui-ai/TTS): Python toolkit with neural voices. Run a local server and call it from the backend, then stream audio via `<audio>` tags.
- [Piper](https://github.com/rhasspy/piper): Lightweight, fast TTS that runs on CPU. Package models alongside the app and expose an HTTP endpoint (there is a Docker image too).
- [Azure Speech](https://learn.microsoft.com/azure/cognitive-services/speech-service/): Cloud API with neural voices and SSML controls. Works with the existing provider-config workflow.

### Speech-to-text

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp): Portable Whisper inference that can run on CPU or GPU. Wrap it with a local web service and have the front-end POST audio blobs.
- [Vosk](https://alphacephei.com/vosk/): Offline recognizer with bindings for C++, Python, Node.js, and Java. Good for running inside the Node server directly.
- [Deepgram](https://deepgram.com/): Streaming cloud STT with WebSocket APIs. Ideal if you want higher accuracy plus diarization.

### Integration tips

1. Extend the Node server with endpoints such as `/api/audio/synthesize` and `/api/audio/transcribe` that proxy to your chosen engine.
2. Swap the front-end controls to call those endpoints instead of the Web Speech API when available (keep the browser implementation as a fallback).
3. Cache generated audio clips per message ID so repeated playback stays instant, even offline.
4. For arena mode, stagger playback to match the existing delay metadata for natural pacing.

## Troubleshooting

- **No microphone permission prompt:** Clear site permissions or use a secure origin (`https://` or `localhost`).
- **Voices missing:** Some browsers load voices asynchronously. Wait a moment after startup before playing, or pick a different default voice in system settings.
- **Recognition stops immediately:** Another app may be using the microphone, or your browser blocked audio input due to OS privacy rules.

With the Web Speech API baseline and these extension pointers, you can scale from quick demos to a fully offline audio stack that matches your GPU-backed LLM workflow.
