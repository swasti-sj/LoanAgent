import { useEffect, useRef } from 'react'

export default function ConversationDisplay({ conversation }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  return (
    <div className="conversation-display">
      <div className="conversation-list">
        {conversation.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.type}`}>
            <span className="message-role">
              {msg.type === 'user' && '🎤 You'}
              {msg.type === 'agent' && '🤖 Agent'}
              {msg.type === 'system' && '📋 System'}
            </span>
            <p className="message-text">{msg.text}</p>
            {msg.confidence && (
              <span className="confidence-badge">
                Confidence: {(msg.confidence * 100).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
