import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import AudioCapture from './components/AudioCapture'
import ConversationDisplay from './components/ConversationDisplay'
import Controls from './components/Controls'
import OutcomeDisplay from './components/OutcomeDisplay'
import './App.css'

function App() {
  const [conversation, setConversation] = useState([])
  const [status, setStatus] = useState('disconnected')
  const [isRecording, setIsRecording] = useState(false)
  const [lastOutcome, setLastOutcome] = useState(null)
  const ws = useWebSocket()
  const wsRef = useRef(ws)

  // Update ref whenever ws changes
  useEffect(() => {
    wsRef.current = ws
  }, [ws])

  // Set up message handlers
  useEffect(() => {
    if (!ws) {
      console.log('⚠️ WebSocket is null')
      setStatus('disconnected')
      return
    }

    console.log('📌 Setting up event listeners for ws:', ws.readyState)

    // Handle open event
    const handleOpen = () => {
      console.log('✅ WebSocket OPEN event fired')
      setStatus('connected')
      setConversation(prev => [...prev, { 
        type: 'system', 
        text: 'Connected to Loan Collection Agent. Click start to begin.' 
      }])
    }

    // Handle message event
    const handleMessage = (event) => {
      try {
        let message
        
        try {
          message = JSON.parse(event.data)
        } catch {
          console.log('📦 Received binary data:', event.data.byteLength, 'bytes')
          return
        }

        console.log('📨 Received:', message)

        if (message.type === 'system') {
          setConversation(prev => [...prev, { type: 'system', text: message.message }])
        } else if (message.type === 'transcription') {
          setConversation(prev => [...prev, { type: 'user', text: message.text, confidence: message.confidence }])
        } else if (message.type === 'response') {
          setConversation(prev => [...prev, { type: 'agent', text: message.text }])
        } else if (message.type === 'status') {
          setStatus(message.status)
          // Auto-reset recording button when ready
          if (message.status === 'ready') {
            setIsRecording(false)
            console.log('✅ Backend ready - reset recording state')
          }
        } else if (message.type === 'outcome') {
          // Outcome detected - display it
          console.log('🎯 Outcome detected:', message.status)
          setLastOutcome({
            status: message.status,
            promisedDate: message.promisedDate,
            reason: message.reason,
            confidence: message.confidence,
            detectionMethod: message.detectionMethod || 'unknown',
          })
        } else if (message.type === 'error') {
          setConversation(prev => [...prev, { type: 'error', text: `Error: ${message.error}` }])
        }
      } catch (error) {
        console.error('Error processing message:', error)
      }
    }

    // Handle error event
    const handleError = (error) => {
      console.error('❌ WebSocket error:', error)
      setStatus('error')
    }

    // Handle close event
    const handleClose = () => {
      console.log('📴 WebSocket closed')
      setStatus('disconnected')
    }

    // Attach listeners
    ws.addEventListener('open', handleOpen)
    ws.addEventListener('message', handleMessage)
    ws.addEventListener('error', handleError)
    ws.addEventListener('close', handleClose)

    // If already connected, trigger open handler
    if (ws.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already OPEN, triggering handler')
      handleOpen()
    }

    // Cleanup
    return () => {
      ws.removeEventListener('open', handleOpen)
      ws.removeEventListener('message', handleMessage)
      ws.removeEventListener('error', handleError)
      ws.removeEventListener('close', handleClose)
    }
  }, [ws])

  const handleStartRecording = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('Not connected to backend')
      return
    }
    setIsRecording(true)
    // AudioCapture component will send the "start" message
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // AudioCapture component will send the "end" message
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎤 Loan Collection Voice Agent</h1>
        <p className="status-badge" data-status={status}>
          {status.toUpperCase()}
        </p>
      </header>

      <main className="app-main">
        <ConversationDisplay conversation={conversation} />

        {lastOutcome && <OutcomeDisplay outcome={lastOutcome} />}

        <AudioCapture
          ws={ws}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={isRecording}
        />

        <Controls
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          status={status}
        />
      </main>
    </div>
  )
}

export default App
