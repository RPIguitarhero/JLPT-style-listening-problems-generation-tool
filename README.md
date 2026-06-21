# JLPT FluentConnect & Speech Studio

A full-stack interactive Japanese language learning and speech laboratory designed to prepare students for the Japanese Language Proficiency Test (JLPT). This application features automated scenario building, AI-guided audio playback, text reading comprehension, and customizable offline support.

---

## 🚀 Getting Started (Setup & Installation)

Follow these simple steps to run this application on your local machine:

### 1. Configure Environment Variables
Copy the secure environment variable template to a local `.env` configuration file:
```bash
cp .env.example .env
```

Open the newly created `.env` file and insert your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
VOICEVOX_URL=http://127.0.0.1:50021
```

> **Note:** The `GEMINI_API_KEY` is completely kept server-side inside the NodeJS environment and is never exposed to the client or browser, ensuring maximum privacy and API safety.

### 2. Install Project Dependencies
Use npm to download and compile essential runtime packages:
```bash
npm install
```

### 3. Start Development Server
Boot up the full-stack server (Vite + Express):
```bash
npm run dev
```

### 4. Open the Web App
Once the dev server is active, open your web browser of choice and navigate to:
**[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

## 🎙️ Local VOICEVOX Integration (100% Offline Mode)

This application supports two distinct audio speech synthesis providers: **Google Gemini Multi-Speaker TTS** and **Local VOICEVOX**.

### Running VOICEVOX Locally
To use the local VOICEVOX engine, ensure you have a local instance running on port `50021`. You can spin it up instantly via Docker:
```bash
docker run --rm -it -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu-latest
```

### ✨ Offline Mode Compatibility & Requirements
- **No Gemini API Key Required for Local Playback:** If you do not have a Gemini API key configured, or if your local dev machine is completely offline, **Local VOICEVOX mode will still work perfectly** to synthesize audio streams for your dialogue scripts.
- **Where the Key is Necessary:** AI features such as Generating new JLPT listening scenarios from scratch, AI Text Analysis, and Gemini Multi-Speaker Speech Synthesis require a valid `GEMINI_API_KEY` provided in your local `.env` configuration file.
