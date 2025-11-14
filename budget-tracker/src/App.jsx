import { useState, useEffect } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Container, Box, Typography,
  Button, TextField, Alert, Snackbar, Paper,
  CircularProgress, IconButton, InputAdornment, Drawer, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Badge, Grid
} from '@mui/material';
import {
  CloudUpload, Google, Refresh, Psychology, Download, Settings,
  Search as SearchIcon, Link as LinkIcon, Dashboard as DashboardIcon,
  Receipt as ReceiptIcon, Lightbulb as InsightIcon,
  Folder as FolderIcon, History as HistoryIcon, FilterAltOff
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
import SubcategoryChart from './components/SubcategoryChart';
import InsightsSection from './components/InsightsSection';
import SheetManager from './components/SheetManager';
import ActivityLog from './components/ActivityLog';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1', // Indigo
    },
    secondary: {
      main: '#8b5cf6', // Purple accent
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
    divider: '#e5e7eb',
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    ...Array(20).fill('none'),
  ],
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  // Initialize sheets from localStorage or create default sheet
  const [sheets, setSheets] = useState(() => {
    const saved = localStorage.getItem('budgetSheets');
    if (saved) {
      return JSON.parse(saved);
    }
    return [{
      id: Date.now().toString(),
      name: 'Budget 1',
      transactions: []
    }];
  });
  const [activeSheetId, setActiveSheetId] = useState(() => {
    const saved = localStorage.getItem('activeSheetId');
    return saved || sheets[0]?.id;
  });
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [selectedCategory, setSelectedCategory] = useState(null); // null or category name
  const [selectedSubcategory, setSelectedSubcategory] = useState(null); // null or subcategory name
  const [searchQuery, setSearchQuery] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('budgetSpreadsheetId') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(localStorage.getItem('claudeApiKey') || '');
  const [insights, setInsights] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('claudeApiKey'));
  const [currentTab, setCurrentTab] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState(() => {
    const saved = localStorage.getItem('activityLogs');
    return saved ? JSON.parse(saved) : [];
  });

  // Get active sheet
  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const transactions = activeSheet?.transactions || [];

  // Save sheets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('budgetSheets', JSON.stringify(sheets));
  }, [sheets]);

  // Save active sheet ID to localStorage
  useEffect(() => {
    localStorage.setItem('activeSheetId', activeSheetId);
  }, [activeSheetId]);

  // Save activity logs to localStorage
  useEffect(() => {
    localStorage.setItem('activityLogs', JSON.stringify(activityLogs));
  }, [activityLogs]);

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

  // Filter handling
  const handleCategoryClick = (category) => {
    if (selectedCategory === category) {
      // Clicking same category - reset
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(category);
      setSelectedSubcategory(null); // Reset subcategory when changing category
    }
  };

  const handleSubcategoryClick = (subcategory) => {
    if (selectedSubcategory === subcategory) {
      // Clicking same subcategory - go back to category level
      setSelectedSubcategory(null);
    } else {
      setSelectedSubcategory(subcategory);
    }
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery('');
  };

  // Activity logging
  const logActivity = (type, status, details) => {
    const log = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type, // 'categorization', 'insights', 'recategorization'
      status, // 'success', 'error'
      details // object with request/response/error info
    };
    setActivityLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const clearActivityLogs = () => {
    setActivityLogs([]);
    showSnackbar('Activity logs cleared', 'success');
  };

  // Tab change handler
  const handleTabChange = (newTab) => {
    if (newTab === currentTab) return;
    setTabLoading(true);
    setCurrentTab(newTab);
    // Clear loading after a short delay to allow rendering
    setTimeout(() => setTabLoading(false), 300);
  };

  // Sheet management functions
  const handleSheetCreate = (name) => {
    const newSheet = {
      id: Date.now().toString(),
      name,
      transactions: []
    };
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
    showSnackbar(`Created sheet "${name}"`, 'success');
  };

  const handleSheetDelete = (sheetId) => {
    if (sheets.length === 1) {
      showSnackbar('Cannot delete the last sheet', 'error');
      return;
    }
    const updatedSheets = sheets.filter(s => s.id !== sheetId);
    setSheets(updatedSheets);
    if (activeSheetId === sheetId) {
      setActiveSheetId(updatedSheets[0].id);
    }
    showSnackbar('Sheet deleted', 'success');
  };

  const handleSheetSelect = (sheetId) => {
    setActiveSheetId(sheetId);
  };

  // Update transactions for active sheet
  const updateActiveSheetTransactions = (newTransactions) => {
    setSheets(sheets.map(sheet =>
      sheet.id === activeSheetId
        ? { ...sheet, transactions: newTransactions }
        : sheet
    ));
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
          logActivity('categorization', 'success', {
            transactionCount: newTransactions.length,
            message: `Successfully categorized ${newTransactions.length} transactions`
          });
          showSnackbar(`✨ AI categorized ${newTransactions.length} transactions!`, 'success');
        } catch (error) {
          console.error('AI categorization failed:', error);
          logActivity('categorization', 'error', {
            transactionCount: newTransactions.length,
            error: error.message,
            stack: error.stack,
            errorName: error.name
          });
          showSnackbar(`AI categorization failed. Using basic categorization instead.`, 'warning');
        }
      } else {
        showSnackbar(`Loaded ${newTransactions.length} transactions with basic categorization`, 'success');
      }

      const combined = [...transactions, ...newTransactions];
      updateActiveSheetTransactions(combined);

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
      updateActiveSheetTransactions(loaded);
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
      updateActiveSheetTransactions(updated);
      logActivity('recategorization', 'success', {
        transactionCount: updated.length,
        message: `Successfully re-categorized ${updated.length} transactions`
      });
      showSnackbar('✨ All transactions re-categorized with AI!', 'success');

      if (isGoogleSignedIn && spreadsheetId) {
        await handleSaveToSheets(updated);
      }
    } catch (error) {
      logActivity('recategorization', 'error', {
        transactionCount: transactions.length,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
        fullError: error.toString()
      });
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
      logActivity('insights', 'success', {
        transactionCount: transactions.length,
        message: 'Successfully generated insights',
        insightLength: insightsText.length
      });
      showSnackbar('💡 AI insights generated!', 'success');
    } catch (error) {
      logActivity('insights', 'error', {
        transactionCount: transactions.length,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
        fullError: error.toString()
      });
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
    updateActiveSheetTransactions(updated);

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
    totalExpenses: transactions
      .filter(t => t.category !== 'Transfer' && t.category !== 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalIncome: transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    transactionCount: transactions.length,
    netBalance: transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) -
      transactions
      .filter(t => t.category !== 'Transfer' && t.category !== 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  };

  // Category totals excluding Transfer and Income categories
  const categoryTotals = transactions.reduce((acc, t) => {
    // Count all transactions except Income and Transfer as expenses
    if (t.category !== 'Transfer' && t.category !== 'Income') {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});

  // Subcategory totals for selected category
  const subcategoryTotals = selectedCategory
    ? transactions.reduce((acc, t) => {
        if (t.category === selectedCategory && t.subcategory) {
          acc[t.subcategory] = (acc[t.subcategory] || 0) + Math.abs(t.amount);
        }
        return acc;
      }, {})
    : {};

  const filteredTransactions = transactions.filter(t => {
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || t.subcategory === selectedSubcategory;
    const matchesSearch = !searchQuery ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subcategory && t.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  const drawerWidth = 240;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
        >
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Budget Tracker
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              AI-Powered Analytics
            </Typography>
          </Box>

          <List sx={{ px: 2 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={currentTab === 0}
                onClick={() => handleTabChange(0)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Overview" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={currentTab === 1}
                onClick={() => handleTabChange(1)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ReceiptIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Transactions" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={currentTab === 2}
                onClick={() => handleTabChange(2)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Sheets" />
              </ListItemButton>
            </ListItem>
            {claudeApiKey && (
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={currentTab === 3}
                  onClick={() => handleTabChange(3)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <InsightIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Insights" />
                </ListItemButton>
              </ListItem>
            )}
            {claudeApiKey && (
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={currentTab === 4}
                  onClick={() => handleTabChange(4)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Badge
                      badgeContent={activityLogs.filter(log => log.status === 'error').length}
                      color="error"
                      max={9}
                    >
                      <HistoryIcon fontSize="small" />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText primary="Activity" />
                </ListItemButton>
              </ListItem>
            )}
          </List>

          <Divider sx={{ mt: 'auto', mx: 2 }} />

          <Box sx={{ p: 2 }}>
            {isGoogleSignedIn ? (
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={handleGoogleSignOut}
                startIcon={<Google />}
                sx={{ justifyContent: 'flex-start' }}
              >
                Sign Out
              </Button>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={handleGoogleSignIn}
                startIcon={<Google />}
                sx={{ justifyContent: 'flex-start' }}
              >
                Sign in
              </Button>
            )}
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
          {/* Top Bar */}
          <Box sx={{
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            px: 4,
            py: 2,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {activeSheet?.name || 'Budget Tracker'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {transactions.length} transactions
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {showApiKeyInput ? (
                  <IconButton size="small" onClick={() => setShowApiKeyInput(true)}>
                    <Settings fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton size="small" onClick={() => setShowApiKeyInput(true)}>
                    <Settings fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>

          <Container maxWidth="xl" sx={{ mt: 3, mb: 4, px: 4 }}>
            {/* Tab Loading Spinner */}
            {tabLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
              </Box>
            )}

            {/* API Key Setup */}
            {!tabLoading && showApiKeyInput && (
              <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'warning.main', bgcolor: 'warning.50' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Enable AI Features</Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
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
            )}

            {!tabLoading && loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Tab Content */}
            {!tabLoading && currentTab === 0 && (
              // Overview Tab
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                    Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Financial summary and spending analysis
                  </Typography>
                </Box>

                <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom>Upload Transactions</Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Upload CSV files from your bank, credit card, or Venmo
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                    {transactions.length > 0 && (
                      <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
                        Export CSV
                      </Button>
                    )}
                    {claudeApiKey && transactions.length > 0 && (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<Refresh />}
                          onClick={handleRecategorizeAll}
                          disabled={loading}
                        >
                          Re-categorize All
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<Psychology />}
                          onClick={handleGenerateInsights}
                          disabled={loading}
                        >
                          Generate Insights
                        </Button>
                      </>
                    )}
                  </Box>
                </Paper>

                {transactions.length > 0 ? (
                  <>
                    <StatsCards stats={stats} />

                    {/* Filter Reset Button */}
                    {(selectedCategory || selectedSubcategory || searchQuery) && (
                      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {selectedSubcategory
                            ? `Filtered by: ${selectedCategory} > ${selectedSubcategory}`
                            : selectedCategory
                            ? `Filtered by: ${selectedCategory}`
                            : searchQuery
                            ? `Searching: "${searchQuery}"`
                            : ''}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FilterAltOff />}
                          onClick={resetFilters}
                        >
                          Reset Filters
                        </Button>
                      </Box>
                    )}

                    {/* Charts Grid */}
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={selectedCategory ? 6 : 12}>
                        <ChartSection
                          categoryTotals={categoryTotals}
                          onCategoryClick={handleCategoryClick}
                          selectedCategory={selectedCategory}
                        />
                      </Grid>
                      {selectedCategory && Object.keys(subcategoryTotals).length > 0 && (
                        <Grid item xs={12} md={6}>
                          <SubcategoryChart
                            subcategoryTotals={subcategoryTotals}
                            categoryName={selectedCategory}
                            onSubcategoryClick={handleSubcategoryClick}
                            selectedSubcategory={selectedSubcategory}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </>
                ) : (
                  !loading && (
                    <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="h6" gutterBottom>No transactions yet</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload a CSV file to get started with AI-powered categorization!
                      </Typography>
                    </Paper>
                  )
                )}
              </>
            )}

            {!tabLoading && currentTab === 1 && (
              // Transactions Tab
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                    Transactions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View and manage all transactions
                  </Typography>
                </Box>

                {transactions.length > 0 ? (
                  <>
                    {/* Charts Grid */}
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={selectedCategory ? 6 : 12}>
                        <ChartSection
                          categoryTotals={categoryTotals}
                          onCategoryClick={handleCategoryClick}
                          selectedCategory={selectedCategory}
                        />
                      </Grid>
                      {selectedCategory && Object.keys(subcategoryTotals).length > 0 && (
                        <Grid item xs={12} md={6}>
                          <SubcategoryChart
                            subcategoryTotals={subcategoryTotals}
                            categoryName={selectedCategory}
                            onSubcategoryClick={handleSubcategoryClick}
                            selectedSubcategory={selectedSubcategory}
                          />
                        </Grid>
                      )}
                    </Grid>

                    {/* Search and Filter Reset */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }
                        }}
                      />
                      {(selectedCategory || selectedSubcategory || searchQuery) && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FilterAltOff />}
                          onClick={resetFilters}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Reset
                        </Button>
                      )}
                    </Box>

                    {(selectedCategory || selectedSubcategory) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {selectedSubcategory
                            ? `Filtered by: ${selectedCategory} > ${selectedSubcategory}`
                            : `Filtered by: ${selectedCategory}`}
                        </Typography>
                      </Box>
                    )}

                    <TransactionTable
                      transactions={filteredTransactions}
                      categories={CATEGORIES}
                      onCategoryChange={handleCategoryChange}
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>No transactions yet</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload a CSV file from the Overview tab to get started!
                    </Typography>
                  </Paper>
                )}
              </>
            )}

            {!tabLoading && currentTab === 2 && (
              // Sheets Tab
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                    Sheets
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your budget sheets and Google Sheets integration
                  </Typography>
                </Box>

                <SheetManager
                  sheets={sheets}
                  activeSheetId={activeSheetId}
                  onSheetSelect={handleSheetSelect}
                  onSheetCreate={handleSheetCreate}
                  onSheetDelete={handleSheetDelete}
                />

                <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom>Google Sheets Integration</Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {isGoogleSignedIn ? '✓ Connected to Google Sheets' : 'Sign in to save your data to Google Sheets'}
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
              </>
            )}

            {!tabLoading && currentTab === 3 && claudeApiKey && (
              // Insights Tab
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                    AI Insights
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Get personalized spending insights powered by Claude AI
                  </Typography>
                </Box>

                {insights ? (
                  <InsightsSection insights={insights} />
                ) : (
                  <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>No insights generated yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Generate AI-powered insights from your transaction data
                    </Typography>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<Psychology />}
                      onClick={handleGenerateInsights}
                      disabled={loading || transactions.length === 0}
                    >
                      Generate Insights
                    </Button>
                  </Paper>
                )}
              </>
            )}

            {!tabLoading && currentTab === 4 && claudeApiKey && (
              // Activity Tab
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                    Activity Logs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View detailed logs of all AI interactions and debug errors
                  </Typography>
                </Box>

                <ActivityLog logs={activityLogs} onClear={clearActivityLogs} />
              </>
            )}
          </Container>
        </Box>
      </Box>

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
