import React from 'react';

function TransactionTable({ transactions, categories, onCategoryChange }) {
  return (
    <>
      <h2 style={{ marginTop: '30px' }}>
        📋 Transactions
        <span style={{ fontSize: '0.8em', color: '#667eea', marginLeft: '10px' }}>
          (🤖 = AI categorized)
        </span>
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className={t.aiCategorized ? 'ai-categorized' : ''}>
                <td>{t.date}</td>
                <td>
                  {t.aiCategorized && '🤖 '}
                  {t.description}
                </td>
                <td className={t.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                  ${Math.abs(t.amount).toFixed(2)}
                </td>
                <td>
                  <select
                    value={t.category}
                    onChange={(e) => onCategoryChange(t.id, e.target.value)}
                    style={{ 
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </td>
                <td style={{ fontSize: '0.9em', color: '#666' }}>{t.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default TransactionTable;
