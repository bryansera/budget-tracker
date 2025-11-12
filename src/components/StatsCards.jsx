import React from 'react';

function StatsCards({ stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Total Expenses</div>
        <div className="stat-value">-${stats.totalExpenses.toFixed(2)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Income</div>
        <div className="stat-value">${stats.totalIncome.toFixed(2)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Net Balance</div>
        <div className="stat-value">${stats.netBalance.toFixed(2)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Transactions</div>
        <div className="stat-value">{stats.transactionCount}</div>
      </div>
    </div>
  );
}

export default StatsCards;
