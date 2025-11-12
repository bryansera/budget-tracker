import { useState, useEffect } from 'react';
import { CATEGORIES, categorizeWithClaude, generateInsights } from './utils/categorization';
import { parseCSV, exportToCSV } from './utils/csvParser';
import {
  initGoogleAPI,
  signIn,
  signOut,
  isSignedIn,
  createSpreadsheet,
  saveTransactions,
  loadTransactions,
  updateTransactionCategory
} from './utils/googleSheets';
import TransactionTable from './components/TransactionTable';
import StatsCards from './components/StatsCards';
import ChartSection from './components/ChartSection';
import InsightsSection from './components/InsightsSection';
import './App.css';

// CONFIGURATION - Load from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('budgetSpreadsheetId') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(localStorage.getItem('claudeApiKey') || '');
  const [insights, setInsights] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('claudeApiKey'));

  // Initialize Google API on mount
  useEffect(() => {
    const loadGoogleAPI = async () => {
      try {
        // Wait for Google API to load
        await new Promise((resolve) => {
          const checkGapi = setInterval(() => {
            if (window.gapi && window.google) {
              clearInterval(checkGapi);
              resolve();
            }
          }, 100);
        });

        await initGoogleAPI(GOOGLE_CLIENT_ID);
        setIsGoogleSignedIn(isSignedIn());
      } catch (error) {
        console.error('Failed to initialize Google API:', error);
      }
    };

    loadGoogleAPI();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      setIsGoogleSignedIn(true);
      showMessage('success', 'Successfully signed in to Google!');
      
      // Try to load existing transactions
      if (spreadsheetId) {
        handleLoadTransactions();
      }
    } catch (error) {
      showMessage('error', `Sign in failed: ${error.message}`);
    }
  };

  const handleGoogleSignOut = () => {
    signOut();
    setIsGoogleSignedIn(false);
    showMessage('success', 'Signed out successfully');
  };

  const handleSaveApiKey = () => {
    if (!claudeApiKey) {
      showMessage('error', 'Please enter an API key');
      return;
    }
    localStorage.setItem('claudeApiKey', claudeApiKey);
    setShowApiKeyInput(false);
    showMessage('success', 'Claude API key saved! AI features are now enabled.');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const content = await file.text();
      let newTransactions = parseCSV(content, file.name);

      showMessage('', 'Processing transactions...');

      // Use AI categorization if API key is available
      if (claudeApiKey) {
        try {
          newTransactions = await categorizeWithClaude(newTransactions, claudeApiKey);
          showMessage('success', `✨ AI categorized ${newTransactions.length} transactions!`);
        } catch (error) {
          console.error('AI categorization failed:', error);
          showMessage('warning', `Loaded ${newTransactions.length} transactions with basic categorization (AI failed: ${error.message})`);
        }
      } else {
        showMessage('success', `Loaded ${newTransactions.length} transactions with basic categorization`);
      }

      const combined = [...transactions, ...newTransactions];
      setTransactions(combined);

      // Save to Google Sheets if signed in
      if (isGoogleSignedIn) {
        await handleSaveToSheets(newTransactions);
      }
    } catch (error) {
      showMessage('error', `Error processing file: ${error.message}`);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleSaveToSheets = async (transactionsToSave = transactions) => {
    if (!isGoogleSignedIn) {
      showMessage('error', 'Please sign in to Google first');
      return;
    }

    try {
      setLoading(true);
      let sheetId = spreadsheetId;

      // Create spreadsheet if it doesn't exist
      if (!sheetId) {
        sheetId = await createSpreadsheet('Budget Tracker Data');
        setSpreadsheetId(sheetId);
        localStorage.setItem('budgetSpreadsheetId', sheetId);
      }

      await saveTransactions(sheetId, transactionsToSave);
      showMessage('success', `Saved ${transactionsToSave.length} transactions to Google Sheets!`);
    } catch (error) {
      showMessage('error', `Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTransactions = async () => {
    if (!isGoogleSignedIn || !spreadsheetId) {
      showMessage('error', 'Please sign in and set up a spreadsheet first');
      return;
    }

    try {
      setLoading(true);
      const loaded = await loadTransactions(spreadsheetId);
      setTransactions(loaded);
      showMessage('success', `Loaded ${loaded.length} transactions from Google Sheets!`);
    } catch (error) {
      showMessage('error', `Failed to load: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorizeAll = async () => {
    if (!claudeApiKey) {
      showMessage('error', 'Please set up your Claude API key first');
      return;
    }

    try {
      setLoading(true);
      showMessage('', 'AI is re-categorizing all transactions...');
      
      const updated = await categorizeWithClaude(transactions, claudeApiKey);
      setTransactions(updated);
      showMessage('success', '✨ All transactions re-categorized with AI!');

      // Update in sheets if connected
      if (isGoogleSignedIn && spreadsheetId) {
        await handleSaveToSheets(updated);
      }
    } catch (error) {
      showMessage('error', `Re-categorization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!claudeApiKey) {
      showMessage('error', 'Please set up your Claude API key first');
      return;
    }

    if (transactions.length === 0) {
      showMessage('error', 'No transactions to analyze');
      return;
    }

    try {
      setLoading(true);
      showMessage('', 'AI is analyzing your spending...');
      
      const insightsText = await generateInsights(transactions, claudeApiKey);
      setInsights(insightsText);
      showMessage('success', '💡 AI insights generated!');
    } catch (error) {
      showMessage('error', `Failed to generate insights: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (transactionId, newCategory) => {
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index === -1) return;

    const updated = [...transactions];
    updated[index] = { ...updated[index], category: newCategory, aiCategorized: false };
    setTransactions(updated);

    // Update in Google Sheets if connected
    if (isGoogleSignedIn && spreadsheetId) {
      try {
        await updateTransactionCategory(spreadsheetId, index, newCategory, false);
      } catch (error) {
        console.error('Failed to update in sheets:', error);
      }
    }
  };

  const handleExport = () => {
    exportToCSV(transactions);
    showMessage('success', 'Transactions exported to CSV!');
  };

  // Calculate statistics
  const stats = {
    totalExpenses: transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalIncome: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    netBalance: transactions.reduce((sum, t) => sum + t.amount, 0)
  };

  // Category breakdown for chart
  const categoryTotals = transactions.reduce((acc, t) => {
    if (t.amount < 0) {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
    const matchesSearch = !searchQuery || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container">
      <h1>💰 Budget Tracker <span className="ai-badge">AI POWERED</span></h1>
      <p className="subtitle">Smart expense tracking with Claude AI categorization and insights</p>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* API Key Setup */}
      {showApiKeyInput ? (
        <div className="section warning">
          <h3>🤖 Enable AI Features</h3>
          <p style={{ marginBottom: '15px' }}>
            Enter your Claude API key to unlock smart categorization and insights.
            <br />
            <small>Get your key at: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></small>
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              style={{ flex: 1, maxWidth: '500px' }}
            />
            <button className="ai-button" onClick={handleSaveApiKey}>
              Save API Key
            </button>
            {claudeApiKey && (
              <button className="secondary" onClick={() => setShowApiKeyInput(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <button className="secondary" onClick={() => setShowApiKeyInput(true)}>
            ⚙️ Update API Key
          </button>
        </div>
      )}

      {/* Google Sheets Integration */}
      <div className="section info">
        <h3>🔐 Google Sheets Integration</h3>
        <p style={{ marginBottom: '15px' }}>
          {isGoogleSignedIn ? '✓ Connected to Google Sheets' : 'Sign in to save your data'}
        </p>
        {!isGoogleSignedIn ? (
          <button onClick={handleGoogleSignIn}>Sign in with Google</button>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="secondary" onClick={handleLoadTransactions}>
              Reload from Sheets
            </button>
            <button className="secondary" onClick={handleGoogleSignOut}>
              Sign Out
            </button>
            {spreadsheetId && (
              <a 
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ alignSelf: 'center', fontSize: '0.9em' }}
              >
                View Spreadsheet →
              </a>
            )}
          </div>
        )}
      </div>

      {/* File Upload */}
      <div className="section">
        <h3>📁 Upload Statements</h3>
        <p style={{ marginBottom: '15px' }}>
          Upload CSV files from your bank, credit card, or Venmo
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            style={{ flex: 1, minWidth: '200px' }}
          />
          {claudeApiKey && transactions.length > 0 && (
            <>
              <button className="ai-button" onClick={handleRecategorizeAll} disabled={loading}>
                ✨ Re-categorize All
              </button>
              <button className="ai-button" onClick={handleGenerateInsights} disabled={loading}>
                💡 Generate Insights
              </button>
            </>
          )}
          {transactions.length > 0 && (
            <button className="secondary" onClick={handleExport}>
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      {transactions.length > 0 ? (
        <>
          <StatsCards stats={stats} />
          
          {insights && <InsightsSection insights={insights} />}
          
          <ChartSection categoryTotals={categoryTotals} />
          
          <div className="filter-section">
            <input
              type="text"
              className="search-box"
              placeholder="🔍 Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <TransactionTable 
            transactions={filteredTransactions}
            categories={CATEGORIES}
            onCategoryChange={handleCategoryChange}
          />
        </>
      ) : (
        !loading && (
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>Upload a CSV file to get started with AI-powered categorization!</p>
          </div>
        )
      )}
    </div>
  );
}

export default App;
