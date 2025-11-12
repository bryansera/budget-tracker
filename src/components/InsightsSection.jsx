import React from 'react';

function InsightsSection({ insights }) {
  if (!insights) return null;

  return (
    <div className="insights-section">
      <h3>💡 AI Insights & Recommendations</h3>
      <div className="insight-content">
        {insights}
      </div>
    </div>
  );
}

export default InsightsSection;
