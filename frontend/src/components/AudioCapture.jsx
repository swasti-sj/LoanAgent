import { useRef, useEffect, useState } from 'react'

export default function AudioCapture({ ws, onStartRecording, onStopRecording, isRecording }) {
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isRecording) {
      startCapture()
    } else {
      stopCapture()
    }
  }, [isRecording, ws])

  async function startCapture() {
    try {
      setError(null)
      console.log('🎤 Requesting microphone access...')
      
      // Send start message to backend
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'start' }))
        console.log('📤 Sent START message to backend')
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      console.log('✅ Microphone access granted')

      // Use MediaRecorder directly without AudioContext manipulation
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
          console.log('📤 Sending audio chunk:', event.data.size, 'bytes')
          ws.send(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error)
        setError(`Recording error: ${event.error}`)
      }

      mediaRecorder.start(100) // Send chunks every 100ms
      console.log('🎙️ Recording started')
    } catch (err) {
      console.error('❌ Microphone error:', err)
      setError('Microphone access denied or not available')
    }
  }

  function stopCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      console.log('⏹️ Recording stopped')
      
      // Send end message to backend after recording stops
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'end' }))
          console.log('📤 Sent END message to backend')
        }
      }, 200) // Small delay to ensure all chunks are received
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      console.log('🔇 Audio stream closed')
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }

  return (
    <div className="audio-capture">
      {error && <p className="error-message">⚠️ {error}</p>}
      <p className="info-text">
        {isRecording ? '🔴 Recording...' : '⚪ Microphone ready'}
      </p>
    </div>
  )
}
