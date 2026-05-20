import { useEffect, useRef, useState } from 'react'

export function useWebSocket() {
  const [ws, setWs] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    // Don't create a new connection if one already exists
    if (wsRef.current) {
      console.log('📌 WebSocket already exists, reusing it')
      setWs(wsRef.current)
      return
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    console.log(`🔗 Attempting to connect to ${backendUrl}`)

    try {
      const websocket = new WebSocket(backendUrl)
      websocket.binaryType = 'arraybuffer'
      
      wsRef.current = websocket
      setWs(websocket)

      console.log('✅ WebSocket object created, state:', websocket.readyState)

      const handleOpen = () => {
        console.log('🟢 WebSocket connected (state: OPEN)')
      }

      const handleError = (error) => {
        console.error('❌ WebSocket error:', error)
      }

      const handleClose = () => {
        console.log('🔴 WebSocket closed')
        wsRef.current = null
        setWs(null)
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect...')
          wsRef.current = null
          setWs(null)
        }, 3000)
      }

      websocket.addEventListener('open', handleOpen)
      websocket.addEventListener('error', handleError)
      websocket.addEventListener('close', handleClose)

      return () => {
        websocket.removeEventListener('open', handleOpen)
        websocket.removeEventListener('error', handleError)
        websocket.removeEventListener('close', handleClose)
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
    }
  }, [])

  return ws
}
