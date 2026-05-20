export default function Controls({ isRecording, onStartRecording, onStopRecording, status }) {
  const isEnabled = status === 'connected' || status === 'ready'
  
  return (
    <div className="controls">
      {isRecording ? (
        <button className="btn btn-stop" onClick={onStopRecording}>
          ⏹️ Stop Recording
        </button>
      ) : (
        <button
          className="btn btn-start"
          onClick={onStartRecording}
          disabled={!isEnabled}
        >
          🎤 Start Recording
        </button>
      )}
    </div>
  )
}
