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
      className: "outcome-success",
    },
    promise_to_pay: {
      icon: "📅",
      label: "Promise to Pay",
      className: "outcome-info",
    },
    callback_requested: {
      icon: "📞",
      label: "Callback Scheduled",
      className: "outcome-warning",
    },
    dispute: {
      icon: "⚠️",
      label: "Dispute Raised",
      className: "outcome-danger",
    },
    unable_to_pay: {
      icon: "❌",
      label: "Unable to Pay",
      className: "outcome-secondary",
    },
  };

  const config = outcomeConfig[outcome.status] || outcomeConfig.unable_to_pay;

  return (
    <div className={`outcome-badge ${config.className}`}>
      <div className="outcome-header">
        {config.icon} {config.label}
      </div>

      {outcome.promisedDate && (
        <div className="outcome-date">
          📅 <strong>Date:</strong> {outcome.promisedDate}
        </div>
      )}

      <div className="outcome-reason">
        📝 {outcome.reason}
      </div>

      <div className="outcome-footer">
        <span>Confidence: {(outcome.confidence * 100).toFixed(0)}%</span>
        <span>Method: {outcome.detectionMethod}</span>
      </div>
    </div>
  );
}
