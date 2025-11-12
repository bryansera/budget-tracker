import { useState, useEffect } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Container, Box, Typography,
  AppBar, Toolbar, Button, TextField, Alert, Snackbar, Paper,
  CircularProgress, Chip, IconButton, InputAdornment
} from '@mui/material';
import {
  CloudUpload, Google, Refresh, Psychology, Download, Settings,
  Search as SearchIcon, Link as LinkIcon
} from '@mui/icons-material';
import { CATEGORIES, categorizeWithClaude, generateInsights } from './utils/categorization';
import { parseCSV, exportToCSV } from './utils/csvParser';
import {
  initGoogleAPI, signIn, signOut, isSignedIn, createSpreadsheet,
  saveTransactions, loadTransactions, updateTransactionCategory
} from './utils/googleSheets';
import TransactionTable from './components/TransactionTable';
import StatsCards from './components/StatsCards';
import ChartSection from './components/ChartSection';
import InsightsSection from './components/InsightsSection';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Material Blue
    },
    secondary: {
      main: '#9c27b0', // Material Purple (for accents only)
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('budgetSpreadsheetId') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(localStorage.getItem('claudeApiKey') || '');
  const [insights, setInsights] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('claudeApiKey'));

  useEffect(() => {
    const loadGoogleAPI = async () => {
      try {
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

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      setIsGoogleSignedIn(true);
      showSnackbar('Successfully signed in to Google!', 'success');
      if (spreadsheetId) handleLoadTransactions();
    } catch (error) {
      showSnackbar(`Sign in failed: ${error.message}`, 'error');
    }
  };

  const handleGoogleSignOut = () => {
    signOut();
    setIsGoogleSignedIn(false);
    showSnackbar('Signed out successfully', 'success');
  };

  const handleSaveApiKey = () => {
    if (!claudeApiKey) {
      showSnackbar('Please enter an API key', 'error');
      return;
    }
    localStorage.setItem('claudeApiKey', claudeApiKey);
    setShowApiKeyInput(false);
    showSnackbar('Claude API key saved! AI features are now enabled.', 'success');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const content = await file.text();
      let newTransactions = parseCSV(content, file.name);

      if (claudeApiKey) {
        try {
          newTransactions = await categorizeWithClaude(newTransactions, claudeApiKey);
          showSnackbar(`✨ AI categorized ${newTransactions.length} transactions!`, 'success');
        } catch (error) {
          console.error('AI categorization failed:', error);
          showSnackbar(`Loaded ${newTransactions.length} transactions with basic categorization`, 'warning');
        }
      } else {
        showSnackbar(`Loaded ${newTransactions.length} transactions with basic categorization`, 'success');
      }

      const combined = [...transactions, ...newTransactions];
      setTransactions(combined);

      if (isGoogleSignedIn) {
        await handleSaveToSheets(newTransactions);
      }
    } catch (error) {
      showSnackbar(`Error processing file: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleSaveToSheets = async (transactionsToSave = transactions) => {
    if (!isGoogleSignedIn) {
      showSnackbar('Please sign in to Google first', 'error');
      return;
    }

    try {
      setLoading(true);
      let sheetId = spreadsheetId;

      if (!sheetId) {
        sheetId = await createSpreadsheet('Budget Tracker Data');
        setSpreadsheetId(sheetId);
        localStorage.setItem('budgetSpreadsheetId', sheetId);
      }

      await saveTransactions(sheetId, transactionsToSave);
      showSnackbar(`Saved ${transactionsToSave.length} transactions to Google Sheets!`, 'success');
    } catch (error) {
      showSnackbar(`Failed to save: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTransactions = async () => {
    if (!isGoogleSignedIn || !spreadsheetId) {
      showSnackbar('Please sign in and set up a spreadsheet first', 'error');
      return;
    }

    try {
      setLoading(true);
      const loaded = await loadTransactions(spreadsheetId);
      setTransactions(loaded);
      showSnackbar(`Loaded ${loaded.length} transactions from Google Sheets!`, 'success');
    } catch (error) {
      showSnackbar(`Failed to load: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorizeAll = async () => {
    if (!claudeApiKey) {
      showSnackbar('Please set up your Claude API key first', 'error');
      return;
    }

    try {
      setLoading(true);
      const updated = await categorizeWithClaude(transactions, claudeApiKey);
      setTransactions(updated);
      showSnackbar('✨ All transactions re-categorized with AI!', 'success');

      if (isGoogleSignedIn && spreadsheetId) {
        await handleSaveToSheets(updated);
      }
    } catch (error) {
      showSnackbar(`Re-categorization failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!claudeApiKey) {
      showSnackbar('Please set up your Claude API key first', 'error');
      return;
    }

    if (transactions.length === 0) {
      showSnackbar('No transactions to analyze', 'error');
      return;
    }

    try {
      setLoading(true);
      const insightsText = await generateInsights(transactions, claudeApiKey);
      setInsights(insightsText);
      showSnackbar('💡 AI insights generated!', 'success');
    } catch (error) {
      showSnackbar(`Failed to generate insights: ${error.message}`, 'error');
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
    showSnackbar('Transactions exported to CSV!', 'success');
  };

  const stats = {
    totalExpenses: transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalIncome: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    netBalance: transactions.reduce((sum, t) => sum + t.amount, 0)
  };

  const categoryTotals = transactions.reduce((acc, t) => {
    if (t.amount < 0) {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});

  const filteredTransactions = transactions.filter(t => {
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
    const matchesSearch = !searchQuery ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            💰 Budget Tracker
            <Chip label="AI POWERED" size="small" color="secondary" />
          </Typography>
          {isGoogleSignedIn ? (
            <Button color="inherit" onClick={handleGoogleSignOut} startIcon={<Google />}>
              Sign Out
            </Button>
          ) : (
            <Button color="inherit" onClick={handleGoogleSignIn} startIcon={<Google />}>
              Sign in with Google
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Smart expense tracking with Claude AI categorization and insights
        </Typography>

        {/* API Key Setup */}
        {showApiKeyInput ? (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <Typography variant="h6" gutterBottom>🤖 Enable AI Features</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your Claude API key to unlock smart categorization and insights.
              <br />
              <small>Get your key at: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></small>
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="password"
                placeholder="sk-ant-api03-..."
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                size="small"
              />
              <Button variant="contained" onClick={handleSaveApiKey}>
                Save Key
              </Button>
              {claudeApiKey && (
                <Button variant="outlined" onClick={() => setShowApiKeyInput(false)}>
                  Cancel
                </Button>
              )}
            </Box>
          </Paper>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Button startIcon={<Settings />} onClick={() => setShowApiKeyInput(true)}>
              Update API Key
            </Button>
          </Box>
        )}

        {/* Google Sheets Integration */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>🔐 Google Sheets Integration</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {isGoogleSignedIn ? '✓ Connected to Google Sheets' : 'Sign in to save your data'}
          </Typography>
          {isGoogleSignedIn && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={handleLoadTransactions}>
                Reload from Sheets
              </Button>
              {spreadsheetId && (
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                  target="_blank"
                >
                  View Spreadsheet
                </Button>
              )}
            </Box>
          )}
        </Paper>

        {/* File Upload */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>📁 Upload Statements</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload CSV files from your bank, credit card, or Venmo
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              disabled={loading}
            >
              Upload CSV
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
            {claudeApiKey && transactions.length > 0 && (
              <>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Refresh />}
                  onClick={handleRecategorizeAll}
                  disabled={loading}
                >
                  Re-categorize All
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Psychology />}
                  onClick={handleGenerateInsights}
                  disabled={loading}
                >
                  Generate Insights
                </Button>
              </>
            )}
            {transactions.length > 0 && (
              <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
                Export CSV
              </Button>
            )}
          </Box>
        </Paper>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {transactions.length > 0 ? (
          <>
            <StatsCards stats={stats} />
            {insights && <InsightsSection insights={insights} />}
            <ChartSection categoryTotals={categoryTotals} />

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                placeholder="🔍 Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: 200 }}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </TextField>
            </Box>

            <TransactionTable
              transactions={filteredTransactions}
              categories={CATEGORIES}
              onCategoryChange={handleCategoryChange}
            />
          </>
        ) : (
          !loading && (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>No transactions yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload a CSV file to get started with AI-powered categorization!
              </Typography>
            </Paper>
          )
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
