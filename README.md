# 🎤 Real-Time Loan Collection Voice Agent

A production-ready AI-powered voice agent that simulates professional loan collection calls using real-time audio streaming, ASR, LLM, and TTS.

## 🚀 Features

- **Real-time Audio Streaming**: WebSocket-based bidirectional audio streaming
- **ASR Integration**: Deepgram Nova-2 for accurate speech-to-text
- **LLM Processing**: OpenAI GPT-4o-mini for intelligent responses
- **TTS Conversion**: OpenAI TTS for natural-sounding audio
- **Conversation Context**: Maintains full conversation history
- **Professional Agent Behavior**: Follows loan collection best practices
- **Safety Guardrails**: Prevents asking for sensitive information

## 📋 Tech Stack

### Frontend
- **React 18** with Vite
- **WebSocket API** for real-time communication
- **Web Audio API** for microphone capture
- **Modern CSS** with responsive design

### Backend
- **Express.js** for HTTP server
- **ws** (WebSocket library) for real-time communication
- **Deepgram SDK** for ASR
- **OpenAI SDK** for LLM and TTS
- **Node.js** runtime

## 🔧 Prerequisites

Before you start, ensure you have:
- **Node.js 16+** (download from [nodejs.org](https://nodejs.org))
- **npm** (comes with Node.js)
- **API Keys**:
  - OpenAI API Key ([get here](https://platform.openai.com/api-keys))
  - Deepgram API Key ([get here](https://console.deepgram.com))

## 📦 Installation

### Step 1: Install Backend Dependencies

```powershell
cd backend
npm install
```

### Step 2: Setup Backend Environment Variables

Edit `backend/.env` and add your API keys:

```env
OPENAI_API_KEY=your_openai_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
PORT=8080
NODE_ENV=development
TTS_VOICE=nova
FRONTEND_URL=http://localhost:5173
```

### Step 3: Install Frontend Dependencies

```powershell
cd ../frontend
npm install
```

## 🎯 Running the Application

### Terminal 1: Start Backend Server

```powershell
cd backend
npm start
# or
node server.js
```

Expected output:
```
🚀 Server running on ws://localhost:8080
📊 Health check: http://localhost:8080/health
```

### Terminal 2: Start Frontend Development Server

```powershell
cd frontend
npm run dev
```

Expected output:
```
  VITE v4.3.9  ready in 246 ms
  ➜  Local:   http://localhost:5173/
```

### Step 4: Open in Browser

Open `http://localhost:5173` in your browser and:

1. Wait for the status badge to show **CONNECTED** (green)
2. Click **🎤 Start Recording** button
3. Speak into your microphone
4. Wait for the agent to respond
5. Repeat for multi-turn conversation

## 🏗️ Project Structure

```
speechtotext/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioCapture.jsx       # Microphone input handler
│   │   │   ├── ConversationDisplay.jsx # Chat display
│   │   │   └── Controls.jsx           # UI buttons
│   │   ├── hooks/
│   │   │   └── useWebSocket.js        # WebSocket connection hook
│   │   ├── App.jsx                    # Main component
│   │   ├── App.css                    # Styling
│   │   └── main.jsx                   # React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.local                     # Frontend env vars
│
├── backend/
│   ├── server.js                      # Express + WebSocket server
│   ├── websocket.js                   # WebSocket handler
│   ├── services/
│   │   ├── asr.js                     # Deepgram ASR service
│   │   ├── llm.js                     # OpenAI LLM service
│   │   └── tts.js                     # OpenAI TTS service
│   ├── prompts/
│   │   └── collectionAgent.js         # Loan collection prompt
│   ├── package.json
│   ├── .env                           # Backend env vars
│   └── .gitignore
│
└── README.md
```

## 🔄 Data Flow

1. **User speaks** into microphone
2. **Frontend** captures audio using MediaRecorder API
3. **WebSocket** sends audio chunks to backend
4. **Backend** processes audio through Deepgram ASR
5. **ASR result** (text) sent to OpenAI LLM
6. **LLM** generates collection agent response
7. **TTS** converts response to speech
8. **Audio** streamed back to frontend
9. **Frontend** plays audio using Web Audio API
10. **Loop** continues for multi-turn conversation

## 🤖 Agent Behavior

The loan collection agent:
- ✅ Greets professionally
- ✅ Identifies payment issue
- ✅ Offers payment options
- ✅ Records promises to pay
- ✅ Schedules callbacks
- ✅ Escalates disputes
- ❌ Never asks for sensitive data
- ❌ Never threatens or harasses
- ❌ Never uses abusive language

## 🛡️ Safety Guardrails

The system prevents:
- ❌ Asking for OTP/CVV/PIN/Aadhaar
- ❌ Aggressive or abusive tone
- ❌ Threatening language
- ❌ Personal harassment

## 🐛 Troubleshooting

### Backend Won't Start
```
Error: listen EADDRINUSE: address already in use :::8080
```
**Solution**: Change PORT in `.env` or kill process using port 8080

### Frontend Can't Connect
```
WebSocket connection failed
```
**Solution**: Ensure backend is running and check VITE_BACKEND_URL in `.env.local`

### Microphone Permission Denied
**Solution**: 
1. Check browser console (F12) for permission prompt
2. Allow microphone access
3. Refresh page

### No Audio Playback
**Solution**: Ensure speakers are on and browser volume isn't muted

### API Errors
**Solution**: 
1. Verify API keys in `.env`
2. Check quota/billing in OpenAI and Deepgram dashboards
3. Check console logs for detailed error messages

## 📊 API Costs

- **Deepgram ASR**: ~$0.0043 per minute
- **OpenAI GPT-4o-mini**: ~$0.15 per 1M input tokens
- **OpenAI TTS**: ~$0.015 per 1K characters

Typical conversation costs ~$0.05-0.10

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Render or Railway)
```bash
# Set environment variables in platform UI
# Deploy backend/ folder
```

## 📚 Learning Resources

- [Deepgram API Docs](https://developers.deepgram.com)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Hooks](https://react.dev/reference/react)

## 📝 License

ISC

## 👨‍💻 Author

Built for internship assignment. Use as learning reference.

---

**Built with ❤️ for real-time voice interactions**
