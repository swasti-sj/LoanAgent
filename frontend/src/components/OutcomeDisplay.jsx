/**
 * Outcome Display Component
 * 
 * Displays detected loan collection call outcomes visually.
 * Shows: Status, promised date, confidence level, and reason.
 * 
 * Supported Outcomes:
 * - payment_completed: ✅ Green badge
 * - promise_to_pay: 📅 Blue badge with date
 * - callback_requested: 📞 Purple badge
 * - dispute: ⚠️ Orange badge
 * - unable_to_pay: ❌ Red badge
 */

export default function OutcomeDisplay({ outcome }) {
  if (!outcome || outcome.status === "no_outcome") {
    return null;
  }

  // Color and icon mapping for different outcomes
  const outcomeConfig = {
    payment_completed: {
      icon: "✅",
      label: "Payment Completed",
      color: "outcome-success",
      bgColor: "#d4edda",
    },
    promise_to_pay: {
      icon: "📅",
      label: "Promise to Pay",
      color: "outcome-info",
      bgColor: "#d1ecf1",
    },
    callback_requested: {
      icon: "📞",
      label: "Callback Scheduled",
      color: "outcome-warning",
      bgColor: "#fff3cd",
    },
    dispute: {
      icon: "⚠️",
      label: "Dispute Raised",
      color: "outcome-danger",
      bgColor: "#f8d7da",
    },
    unable_to_pay: {
      icon: "❌",
      label: "Unable to Pay",
      color: "outcome-secondary",
      bgColor: "#e2e3e5",
    },
  };

  const config = outcomeConfig[outcome.status] || outcomeConfig.unable_to_pay;

  return (
    <div
      className="outcome-badge"
      style={{
        backgroundColor: config.bgColor,
        border: `2px solid ${config.color}`,
        borderRadius: "8px",
        padding: "12px",
        margin: "10px 0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "8px",
        }}
      >
        {config.icon} {config.label}
      </div>

      {outcome.promisedDate && (
        <div style={{ fontSize: "13px", marginBottom: "6px" }}>
          📅 <strong>Date:</strong> {outcome.promisedDate}
        </div>
      )}

      <div style={{ fontSize: "12px", color: "#666" }}>
        📝 {outcome.reason}
      </div>

      <div
        style={{
          fontSize: "11px",
          color: "#999",
          marginTop: "6px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Confidence: {(outcome.confidence * 100).toFixed(0)}%</span>
        <span>Method: {outcome.detectionMethod}</span>
      </div>
    </div>
  );
}
