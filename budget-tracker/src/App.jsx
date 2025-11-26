import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ThemeProvider, createTheme, CssBaseline, Container, Box, Typography,
  Button, TextField, Alert, Snackbar, Paper,
  CircularProgress, IconButton, InputAdornment, Drawer, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Badge, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormControlLabel, Radio, RadioGroup, InputLabel, Select, MenuItem, Checkbox, Chip, Collapse
} from '@mui/material';
import {
  CloudUpload, Google, Refresh, Psychology, Download, Settings,
  Search as SearchIcon, Link as LinkIcon, Dashboard as DashboardIcon,
  Receipt as ReceiptIcon, Lightbulb as InsightIcon,
  Folder as FolderIcon, History as HistoryIcon, FilterAltOff,
  Timeline as TimelineIcon, CheckBoxOutlined, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { CATEGORIES, categorizeWithClaude, categorizeWithRulesAndAI, generateInsights } from './utils/categorization';
import { parseCSV, exportToCSV } from './utils/csvParser';
import {
  initGoogleAPI, signIn, signOut, isSignedIn, createSpreadsheet,
  saveTransactions, loadTransactions, updateTransactionCategory,
  saveRules, loadRules, parseSpreadsheetUrl, validateSpreadsheet
} from './utils/googleSheets';
import { generateRulesWithClaude, updateRuleStats, categorizeTransactionsWithRules } from './utils/rules';
import TransactionTable from './components/TransactionTable';
import StatsCards from './components/StatsCards';
import ChartSection from './components/ChartSection';
import SubcategoryChart from './components/SubcategoryChart';
import InsightsSection from './components/InsightsSection';
import SheetManager from './components/SheetManager';
import ActivityLog from './components/ActivityLog';
import TrendsView from './components/TrendsView';
import AIReviewView from './components/AIReviewView';
import RuleDetailView from './components/RuleDetailView';
import StyleDebugger from './components/StyleDebugger';

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

// Route configuration
const ROUTES = [
  { path: '/', tab: 0, name: 'Overview' },
  { path: '/transactions', tab: 1, name: 'Transactions' },
  { path: '/trends', tab: 2, name: 'Trends' },
  { path: '/sheets', tab: 3, name: 'Sheets' },
  { path: '/insights', tab: 4, name: 'Insights' },
  { path: '/activity', tab: 5, name: 'Activity' },
  { path: '/ai-review', tab: 6, name: 'AI Review' }
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showAllTransactions, setShowAllTransactions] = useState(false); // Control transaction table visibility
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('budgetSpreadsheetId') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(localStorage.getItem('claudeApiKey') || '');
  const [insights, setInsights] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('claudeApiKey'));
  const [currentTab, setCurrentTabState] = useState(() => {
    // Initialize tab from URL
    const route = ROUTES.find(r => r.path === location.pathname);
    if (route) return route.tab;
    // Handle /ai-review/:ruleId paths
    if (location.pathname.match(/^\/ai-review\/[^/]+$/)) return 6;
    return 0;
  });
  const [tabLoading, setTabLoading] = useState(false);

  // Custom setCurrentTab that also updates URL
  const setCurrentTab = (tab) => {
    setCurrentTabState(tab);
    const route = ROUTES.find(r => r.tab === tab);
    if (route && location.pathname !== route.path) {
      navigate(route.path);
    }
  };

  // Sync URL changes with currentTab (for browser back/forward)
  useEffect(() => {
    const route = ROUTES.find(r => r.path === location.pathname);
    if (route && route.tab !== currentTab) {
      setCurrentTabState(route.tab);
    }
    // Handle /ai-review/:ruleId paths
    if (location.pathname.match(/^\/ai-review\/[^/]+$/)) {
      setCurrentTabState(6);
    }
  }, [location.pathname]);
  const [activityLogs, setActivityLogs] = useState(() => {
    const saved = localStorage.getItem('activityLogs');
    return saved ? JSON.parse(saved) : [];
  });
  const [rules, setRules] = useState(() => {
    const saved = localStorage.getItem('categorizationRules');
    return saved ? JSON.parse(saved) : [];
  });
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    title: '',
    message: '',
    details: {}
  });
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [quickSelectDialog, setQuickSelectDialog] = useState({
    open: false,
    type: 'number', // 'number' or 'date'
    numberCount: 50,
    numberFrom: 'first', // 'first' or 'last'
    dateFrom: '',
    dateTo: ''
  });
  const [rulePreviewDialog, setRulePreviewDialog] = useState({
    open: false,
    rules: [],
    selectedRuleIds: []
  });
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [sheetUrlError, setSheetUrlError] = useState('');
  const [overviewStatsExpanded, setOverviewStatsExpanded] = useState(true);
  const [overviewChartsExpanded, setOverviewChartsExpanded] = useState(true);
  const [transactionsChartsExpanded, setTransactionsChartsExpanded] = useState(true);

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

  // Save rules to localStorage
  useEffect(() => {
    localStorage.setItem('categorizationRules', JSON.stringify(rules));
  }, [rules]);

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
      setShowAllTransactions(true); // Auto-show transactions when filtering
    }
    setCurrentTab(1); // Switch to Transactions tab
  };

  const handleSubcategoryClick = (subcategory) => {
    if (selectedSubcategory === subcategory) {
      // Clicking same subcategory - go back to category level
      setSelectedSubcategory(null);
    } else {
      setSelectedSubcategory(subcategory);
      setShowAllTransactions(true); // Auto-show transactions when filtering
    }
    setCurrentTab(1); // Switch to Transactions tab
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery('');
    setShowAllTransactions(false); // Hide transactions when resetting filters
  };

  // Quick select handlers
  const handleQuickSelect = () => {
    const { type, numberCount, numberFrom, dateFrom, dateTo } = quickSelectDialog;

    if (type === 'number') {
      // Select by number range
      const txnIds = numberFrom === 'first'
        ? filteredTransactions.slice(0, numberCount).map(t => t.id)
        : filteredTransactions.slice(-numberCount).map(t => t.id);
      setSelectedTransactionIds(txnIds);
      showSnackbar(`Selected ${txnIds.length} transactions`, 'success');
    } else if (type === 'date') {
      // Select by date range
      if (!dateFrom || !dateTo) {
        showSnackbar('Please select both start and end dates', 'error');
        return;
      }
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const txnIds = filteredTransactions
        .filter(t => {
          const txnDate = new Date(t.date);
          return txnDate >= start && txnDate <= end;
        })
        .map(t => t.id);
      setSelectedTransactionIds(txnIds);
      showSnackbar(`Selected ${txnIds.length} transactions`, 'success');
    }

    setQuickSelectDialog({ ...quickSelectDialog, open: false });
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

  // Rule management functions
  const handleGenerateRules = async (useSelected = false) => {
    if (!claudeApiKey) {
      showSnackbar('Please set up your Claude API key first', 'error');
      return;
    }

    let txnsToAnalyze = transactions;
    if (useSelected) {
      if (selectedTransactionIds.length === 0) {
        showSnackbar('No transactions selected', 'error');
        return;
      }
      txnsToAnalyze = transactions.filter(t => selectedTransactionIds.includes(t.id));
    }

    if (txnsToAnalyze.length === 0) {
      showSnackbar('No transactions to analyze', 'error');
      return;
    }

    try {
      setLoading(true);
      setProgressDialog({
        open: true,
        title: useSelected ? 'Generating Rules from Selected' : 'Generating Rules from All',
        message: 'Starting rule generation...',
        details: { transactions: txnsToAnalyze.length }
      });

      const onProgress = (message, details) => {
        setProgressDialog(prev => ({
          ...prev,
          message,
          details: { ...prev.details, ...details }
        }));
      };

      const result = await generateRulesWithClaude(txnsToAnalyze, claudeApiKey, rules, onProgress);

      if (!result || !result.rules) {
        throw new Error('Invalid response from rule generation: no rules returned');
      }

      const newRules = result.rules;
      const apiCalls = result.apiCalls || [];

      logActivity('rule_generation', 'success', {
        rulesGenerated: newRules.length,
        totalRules: rules.length + newRules.length,
        transactionsAnalyzed: txnsToAnalyze.length,
        fromSelected: useSelected,
        apiCalls: apiCalls // Include full request/response details
      });

      setProgressDialog({ open: false, title: '', message: '', details: {} });

      if (newRules.length === 0) {
        // No new rules, but check if there are transactions without rules that could use existing rules
        const transactionsWithoutRules = transactions.filter(t => !t.ruleId);

        if (transactionsWithoutRules.length > 0 && rules.length > 0) {
          // Offer to apply existing rules to uncategorized transactions
          showSnackbar('No new rules needed, but applying existing rules to transactions...', 'info');

          try {
            setLoading(true);
            setProgressDialog({
              open: true,
              title: 'Applying Existing Rules',
              message: `Recategorizing ${transactionsWithoutRules.length} transactions...`,
              details: { count: transactionsWithoutRules.length }
            });

            const recategorized = await categorizeWithRulesAndAI(transactionsWithoutRules, rules, claudeApiKey);

            // Merge back into all transactions
            const txnMap = new Map(recategorized.map(t => [t.id, t]));
            const updated = transactions.map(t => txnMap.has(t.id) ? txnMap.get(t.id) : t);

            updateActiveSheetTransactions(updated);

            const ruleCategorized = recategorized.filter(t => t.categorizedBy === 'rule').length;

            setProgressDialog({ open: false, title: '', message: '', details: {} });

            if (ruleCategorized > 0) {
              showSnackbar(`✨ Applied existing rules to ${ruleCategorized} transaction${ruleCategorized !== 1 ? 's' : ''}!`, 'success');
            } else {
              showSnackbar('All transactions are already categorized by rules!', 'success');
            }

            if (isGoogleSignedIn && spreadsheetId) {
              await handleSaveToSheets(updated);
            }
          } catch (error) {
            setProgressDialog({ open: false, title: '', message: '', details: {} });
            showSnackbar(`Failed to apply rules: ${error.message}`, 'error');
          } finally {
            setLoading(false);
          }
          return;
        } else {
          showSnackbar('No new rules were generated. All transactions already have rules or no rules exist to apply.', 'warning');
          return;
        }
      }

      // Open preview dialog with all rules selected by default
      setRulePreviewDialog({
        open: true,
        rules: newRules,
        selectedRuleIds: newRules.map(r => r.id)
      });

      showSnackbar(`Generated ${newRules.length} rules - review and accept`, 'info');
    } catch (error) {
      logActivity('rule_generation', 'error', {
        error: error.message,
        stack: error.stack
      });
      setProgressDialog({ open: false, title: '', message: '', details: {} });
      showSnackbar(`Failed to generate rules: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRules = async () => {
    const acceptedRules = rulePreviewDialog.rules.filter(r =>
      rulePreviewDialog.selectedRuleIds.includes(r.id)
    );

    if (acceptedRules.length === 0) {
      showSnackbar('No rules selected to accept', 'error');
      return;
    }

    const updatedRules = [...rules, ...acceptedRules];
    setRules(updatedRules);

    // Save to Google Sheets if signed in
    if (isGoogleSignedIn && spreadsheetId) {
      try {
        await saveRules(spreadsheetId, updatedRules);
      } catch (error) {
        console.error('Failed to save rules to sheets:', error);
      }
    }

    setRulePreviewDialog({ open: false, rules: [], selectedRuleIds: [] });
    showSnackbar(`Added ${acceptedRules.length} rules!`, 'success');

    // Automatically recategorize transactions that don't have rules
    const transactionsWithoutRules = transactions.filter(t => !t.ruleId);
    if (transactionsWithoutRules.length > 0) {
      try {
        setLoading(true);
        setProgressDialog({
          open: true,
          title: 'Applying Rules',
          message: `Recategorizing ${transactionsWithoutRules.length} transactions...`,
          details: { count: transactionsWithoutRules.length }
        });

        const recategorized = await categorizeWithRulesAndAI(transactionsWithoutRules, updatedRules, claudeApiKey);

        // Merge back into all transactions
        const txnMap = new Map(recategorized.map(t => [t.id, t]));
        const updated = transactions.map(t => txnMap.has(t.id) ? txnMap.get(t.id) : t);

        updateActiveSheetTransactions(updated);

        const ruleCategorized = recategorized.filter(t => t.categorizedBy === 'rule').length;
        const aiCategorized = recategorized.filter(t => t.aiCategorized && t.categorizedBy !== 'rule').length;

        setProgressDialog({ open: false, title: '', message: '', details: {} });

        if (ruleCategorized > 0) {
          showSnackbar(`✨ Applied new rules to ${ruleCategorized} transaction${ruleCategorized !== 1 ? 's' : ''}!`, 'success');
        }

        if (isGoogleSignedIn && spreadsheetId) {
          await handleSaveToSheets(updated);
        }
      } catch (error) {
        setProgressDialog({ open: false, title: '', message: '', details: {} });
        showSnackbar(`Failed to apply rules: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleRulePreview = (ruleId) => {
    setRulePreviewDialog(prev => ({
      ...prev,
      selectedRuleIds: prev.selectedRuleIds.includes(ruleId)
        ? prev.selectedRuleIds.filter(id => id !== ruleId)
        : [...prev.selectedRuleIds, ruleId]
    }));
  };

  const handleSelectAllPreviewRules = (selected) => {
    setRulePreviewDialog(prev => ({
      ...prev,
      selectedRuleIds: selected ? prev.rules.map(r => r.id) : []
    }));
  };

  const handleUpdateRules = async (updatedRules) => {
    setRules(updatedRules);

    // Save to Google Sheets if signed in
    if (isGoogleSignedIn && spreadsheetId) {
      try {
        await saveRules(spreadsheetId, updatedRules);
      } catch (error) {
        console.error('Failed to save rules to sheets:', error);
      }
    }
  };

  const handleToggleRule = (ruleId) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    handleUpdateRules(updatedRules);
  };

  const handleDeleteRule = (ruleId) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    handleUpdateRules(updatedRules);
    showSnackbar('Rule deleted', 'success');
  };

  const handleLoadRulesFromSheets = async () => {
    if (!isGoogleSignedIn || !spreadsheetId) {
      showSnackbar('Please sign in and set up a spreadsheet first', 'error');
      return;
    }

    try {
      setLoading(true);
      const loadedRules = await loadRules(spreadsheetId);
      setRules(loadedRules);
      showSnackbar(`Loaded ${loadedRules.length} rules from Google Sheets!`, 'success');
    } catch (error) {
      showSnackbar(`Failed to load rules: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSheetUrl = async () => {
    if (!isGoogleSignedIn) {
      showSnackbar('Please sign in to Google first', 'error');
      return;
    }

    setSheetUrlError('');
    const parsedId = parseSpreadsheetUrl(sheetUrlInput);

    if (!parsedId) {
      setSheetUrlError('Invalid Google Sheets URL. Please paste a valid URL.');
      return;
    }

    try {
      setLoading(true);
      const validation = await validateSpreadsheet(parsedId);

      if (!validation.valid) {
        setSheetUrlError(validation.error);
        return;
      }

      // Successfully validated - save the spreadsheet ID
      setSpreadsheetId(parsedId);
      localStorage.setItem('budgetSpreadsheetId', parsedId);
      setSheetUrlInput('');

      showSnackbar(`Connected to "${validation.title}"!`, 'success');

      // Check if it has a Transactions sheet and offer to load
      if (validation.sheets.includes('Transactions')) {
        const loaded = await loadTransactions(parsedId);
        if (loaded.length > 0) {
          updateActiveSheetTransactions(loaded);
          showSnackbar(`Loaded ${loaded.length} transactions from "${validation.title}"!`, 'success');
        }
      }
    } catch (error) {
      // Handle token expiration by prompting re-authentication
      if (error.message?.includes('Token expired') || error.message?.includes('sign in')) {
        setIsGoogleSignedIn(false);
        showSnackbar('Session expired. Please sign in to Google again.', 'warning');
      } else {
        setSheetUrlError(error.message || 'Failed to connect to spreadsheet');
      }
    } finally {
      setLoading(false);
    }
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

      if (claudeApiKey || rules.length > 0) {
        try {
          newTransactions = await categorizeWithRulesAndAI(newTransactions, rules, claudeApiKey);

          const ruleCategorized = newTransactions.filter(t => t.categorizedBy === 'rule').length;
          const aiCategorized = newTransactions.filter(t => t.aiCategorized).length;

          logActivity('categorization', 'success', {
            transactionCount: newTransactions.length,
            ruleCategorized,
            aiCategorized,
            message: `Categorized ${newTransactions.length} transactions (${ruleCategorized} by rules, ${aiCategorized} by AI)`
          });

          if (ruleCategorized > 0 && aiCategorized > 0) {
            showSnackbar(`✨ Categorized ${ruleCategorized} by rules, ${aiCategorized} by AI`, 'success');
          } else if (ruleCategorized > 0) {
            showSnackbar(`✨ Categorized ${ruleCategorized} transactions by rules`, 'success');
          } else if (aiCategorized > 0) {
            showSnackbar(`✨ Categorized ${aiCategorized} transactions by AI`, 'success');
          }
        } catch (error) {
          console.error('Categorization failed:', error);
          logActivity('categorization', 'error', {
            transactionCount: newTransactions.length,
            error: error.message,
            stack: error.stack,
            errorName: error.name
          });
          showSnackbar(`Categorization failed. Using basic categorization instead.`, 'warning');
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
      const [loadedTransactions, loadedRules] = await Promise.all([
        loadTransactions(spreadsheetId),
        loadRules(spreadsheetId)
      ]);
      updateActiveSheetTransactions(loadedTransactions);
      if (loadedRules.length > 0) {
        setRules(loadedRules);
      }
      showSnackbar(`Loaded ${loadedTransactions.length} transactions and ${loadedRules.length} rules from Google Sheets!`, 'success');
    } catch (error) {
      showSnackbar(`Failed to load: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorizeAll = async (selectedOnly = false) => {
    if (!claudeApiKey && rules.length === 0) {
      showSnackbar('Please set up your Claude API key or create some rules first', 'error');
      return;
    }

    // Determine which transactions to recategorize
    let txnsToRecategorize = transactions;
    if (selectedOnly) {
      if (selectedTransactionIds.length === 0) {
        showSnackbar('No transactions selected', 'error');
        return;
      }
      txnsToRecategorize = transactions.filter(t => selectedTransactionIds.includes(t.id));
    }

    try {
      setLoading(true);
      setProgressDialog({
        open: true,
        title: selectedOnly ? 'Re-categorizing Selected Transactions' : 'Re-categorizing All Transactions',
        message: `Processing ${txnsToRecategorize.length} transactions...`,
        details: { count: txnsToRecategorize.length }
      });

      const recategorized = await categorizeWithRulesAndAI(txnsToRecategorize, rules, claudeApiKey);

      // Merge back into all transactions
      const txnMap = new Map(recategorized.map(t => [t.id, t]));
      const updated = transactions.map(t => txnMap.has(t.id) ? txnMap.get(t.id) : t);

      updateActiveSheetTransactions(updated);

      const ruleCategorized = recategorized.filter(t => t.categorizedBy === 'rule').length;
      const aiCategorized = recategorized.filter(t => t.aiCategorized && t.categorizedBy !== 'rule').length;

      logActivity('recategorization', 'success', {
        transactionCount: recategorized.length,
        totalTransactions: transactions.length,
        selectedOnly,
        ruleCategorized,
        aiCategorized,
        message: `Re-categorized ${recategorized.length} transactions (${ruleCategorized} by rules, ${aiCategorized} by AI)`
      });

      setProgressDialog({ open: false, title: '', message: '', details: {} });

      if (ruleCategorized > 0 && aiCategorized > 0) {
        showSnackbar(`✨ Re-categorized ${recategorized.length}: ${ruleCategorized} by rules, ${aiCategorized} by AI`, 'success');
      } else if (ruleCategorized > 0) {
        showSnackbar(`✨ Re-categorized ${ruleCategorized} transactions by rules`, 'success');
      } else if (aiCategorized > 0) {
        showSnackbar(`✨ Re-categorized ${aiCategorized} transactions by AI`, 'success');
      }

      // Clear selection after recategorizing
      if (selectedOnly) {
        setSelectedTransactionIds([]);
      }

      if (isGoogleSignedIn && spreadsheetId) {
        await handleSaveToSheets(updated);
      }
    } catch (error) {
      logActivity('recategorization', 'error', {
        transactionCount: txnsToRecategorize.length,
        selectedOnly,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
        fullError: error.toString()
      });
      setProgressDialog({ open: false, title: '', message: '', details: {} });
      showSnackbar(`Re-categorization failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRulesOnly = async () => {
    if (rules.length === 0) {
      showSnackbar('No rules available. Create or load rules first.', 'error');
      return;
    }

    if (transactions.length === 0) {
      showSnackbar('No transactions to categorize.', 'error');
      return;
    }

    try {
      setLoading(true);
      const categorized = categorizeTransactionsWithRules(transactions, rules);

      const ruleMatched = categorized.filter(t => t.categorizedBy === 'rule').length;

      updateActiveSheetTransactions(categorized);

      // Update rule stats
      const updatedRules = updateRuleStats(rules, categorized);
      setRules(updatedRules);

      logActivity('apply_rules', 'success', {
        transactionCount: transactions.length,
        ruleCategorized: ruleMatched,
        message: `Applied rules to ${transactions.length} transactions (${ruleMatched} matched)`
      });

      showSnackbar(`Applied rules: ${ruleMatched} of ${transactions.length} transactions matched`, 'success');

      if (isGoogleSignedIn && spreadsheetId) {
        await handleSaveToSheets(categorized);
      }
    } catch (error) {
      logActivity('apply_rules', 'error', {
        error: error.message
      });
      showSnackbar(`Failed to apply rules: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorizeTransaction = async (transactionId) => {
    if (!claudeApiKey && rules.length === 0) {
      showSnackbar('Please set up your Claude API key or create some rules first', 'error');
      return;
    }

    const txnToRecategorize = transactions.find(t => t.id === transactionId);
    if (!txnToRecategorize) {
      showSnackbar('Transaction not found', 'error');
      return;
    }

    try {
      setLoading(true);

      const recategorized = await categorizeWithRulesAndAI([txnToRecategorize], rules, claudeApiKey);

      // Merge back into all transactions
      const txnMap = new Map(recategorized.map(t => [t.id, t]));
      const updated = transactions.map(t => txnMap.has(t.id) ? txnMap.get(t.id) : t);

      updateActiveSheetTransactions(updated);

      const recategorizedTxn = recategorized[0];
      const method = recategorizedTxn.categorizedBy === 'rule' ? 'rule' : 'AI';

      logActivity('recategorization', 'success', {
        transactionCount: 1,
        totalTransactions: transactions.length,
        selectedOnly: true,
        message: `Re-categorized 1 transaction by ${method}`
      });

      showSnackbar(`✨ Transaction re-categorized by ${method}: ${recategorizedTxn.category}`, 'success');

      if (isGoogleSignedIn && spreadsheetId) {
        await handleSaveToSheets(updated);
      }
    } catch (error) {
      logActivity('recategorization', 'error', {
        transactionCount: 1,
        error: error.message,
        stack: error.stack
      });
      showSnackbar(`Re-categorization failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRuleFromTransaction = (transaction) => {
    // Navigate to AI Review tab
    setCurrentTab(6);

    // Create a new rule based on the transaction
    const newRule = {
      id: `rule_${Date.now()}`,
      name: `Rule for ${transaction.description.substring(0, 30)}`,
      type: 'description_contains',
      pattern: transaction.description.split(' ')[0], // Use first word as pattern
      category: transaction.category,
      subcategory: transaction.subcategory || 'Other',
      confidence: 0.9,
      matchCount: 0,
      examples: [transaction.description],
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      enabled: true
    };

    // Add the rule and open it for editing
    setRules([...rules, newRule]);
    showSnackbar('New rule created! Review and edit it in the AI Review tab.', 'success');
  };

  const handleViewRuleMatches = (ruleId) => {
    // Filter transactions to show only those matching the rule
    const matchingTransactionIds = transactions
      .filter(t => t.ruleId === ruleId)
      .map(t => t.id);

    setSelectedTransactionIds(matchingTransactionIds);

    const rule = rules.find(r => r.id === ruleId);
    showSnackbar(`Selected ${matchingTransactionIds.length} transactions matching rule: ${rule?.name}`, 'info');
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
                  <TimelineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Trends" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={currentTab === 3}
                onClick={() => handleTabChange(3)}
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
                  selected={currentTab === 4}
                  onClick={() => handleTabChange(4)}
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
                  selected={currentTab === 5}
                  onClick={() => handleTabChange(5)}
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
            {claudeApiKey && (
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={currentTab === 6}
                  onClick={() => handleTabChange(6)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Psychology fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="AI Review" />
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
                    {rules.length > 0 && transactions.length > 0 && (
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleApplyRulesOnly}
                        disabled={loading}
                      >
                        Apply Rules
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
                    {/* Stats Section */}
                    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
                      <Box
                        sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setOverviewStatsExpanded(!overviewStatsExpanded)}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Statistics</Typography>
                        <IconButton size="small">
                          {overviewStatsExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      <Collapse in={overviewStatsExpanded}>
                        <Box sx={{ p: 2, pt: 0 }}>
                          <StatsCards stats={stats} />
                        </Box>
                      </Collapse>
                    </Paper>

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

                    {/* Charts Section */}
                    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
                      <Box
                        sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setOverviewChartsExpanded(!overviewChartsExpanded)}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Charts</Typography>
                        <IconButton size="small">
                          {overviewChartsExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      <Collapse in={overviewChartsExpanded}>
                        <Box sx={{ p: 2, pt: 0 }}>
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
                        </Box>
                      </Collapse>
                    </Paper>
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
                    {/* Charts Section */}
                    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
                      <Box
                        sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setTransactionsChartsExpanded(!transactionsChartsExpanded)}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Charts</Typography>
                        <IconButton size="small">
                          {transactionsChartsExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      <Collapse in={transactionsChartsExpanded}>
                        <Box sx={{ p: 2, pt: 0 }}>
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
                        </Box>
                      </Collapse>
                    </Paper>

                    {/* Search and Filter Reset */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value) setShowAllTransactions(true); // Auto-show when searching
                        }}
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
                      <Button
                        variant="outlined"
                        startIcon={<CheckBoxOutlined />}
                        onClick={() => setQuickSelectDialog({ ...quickSelectDialog, open: true })}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Quick Select
                      </Button>
                      {selectedTransactionIds.length > 0 && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Refresh />}
                          onClick={() => handleRecategorizeAll(true)}
                          disabled={loading}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Re-categorize Selected ({selectedTransactionIds.length})
                        </Button>
                      )}
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

                    {/* Show "Load All" button if no filter is active and transactions are hidden */}
                    {!showAllTransactions && !selectedCategory && !selectedSubcategory && !searchQuery ? (
                      <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                        <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          {transactions.length} Transactions Available
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Click on a category in the charts above to filter, or load all transactions below
                        </Typography>
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => setShowAllTransactions(true)}
                          startIcon={<ReceiptIcon />}
                        >
                          Load All Transactions
                        </Button>
                      </Paper>
                    ) : (
                      <TransactionTable
                        transactions={filteredTransactions}
                        categories={CATEGORIES}
                        onCategoryChange={handleCategoryChange}
                        selectedTransactions={selectedTransactionIds}
                        onSelectionChange={setSelectedTransactionIds}
                        onRecategorize={handleRecategorizeTransaction}
                        rules={rules}
                        onCreateRule={handleCreateRuleFromTransaction}
                        onViewRuleMatches={handleViewRuleMatches}
                      />
                    )}
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
              // Trends Tab
              <TrendsView transactions={transactions} />
            )}

            {!tabLoading && currentTab === 3 && (
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
                    <>
                      {/* Connect to existing sheet via URL */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Connect to Existing Sheet
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Paste Google Sheets URL..."
                            value={sheetUrlInput}
                            onChange={(e) => {
                              setSheetUrlInput(e.target.value);
                              setSheetUrlError('');
                            }}
                            error={!!sheetUrlError}
                            helperText={sheetUrlError}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <LinkIcon fontSize="small" />
                                  </InputAdornment>
                                ),
                              }
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleConnectSheetUrl}
                            disabled={loading || !sheetUrlInput.trim()}
                          >
                            Connect
                          </Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Example: https://docs.google.com/spreadsheets/d/your-sheet-id/edit
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Current sheet status */}
                      {spreadsheetId && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Currently Connected
                          </Typography>
                          <Chip
                            label={`Sheet ID: ${spreadsheetId.substring(0, 20)}...`}
                            variant="outlined"
                            size="small"
                            sx={{ fontFamily: 'monospace' }}
                          />
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={handleLoadTransactions} disabled={!spreadsheetId}>
                          Reload from Sheets
                        </Button>
                        {rules.length > 0 && transactions.length > 0 && (
                          <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={handleApplyRulesOnly}
                            disabled={loading}
                          >
                            Apply Rules
                          </Button>
                        )}
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
                    </>
                  )}
                </Paper>
              </>
            )}

            {!tabLoading && currentTab === 4 && claudeApiKey && (
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

            {!tabLoading && currentTab === 5 && claudeApiKey && (
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

            {!tabLoading && currentTab === 6 && claudeApiKey && (
              // AI Review Tab
              location.pathname.match(/^\/ai-review\/([^/]+)$/) ? (
                // Rule Detail View - extract ruleId from URL
                <RuleDetailView
                  transactions={transactions}
                  rules={rules}
                  onDeleteRule={handleDeleteRule}
                  onUpdateRules={handleUpdateRules}
                  ruleId={location.pathname.match(/^\/ai-review\/([^/]+)$/)?.[1]}
                />
              ) : (
                // Main AI Review View
                <AIReviewView
                  transactions={transactions}
                  rules={rules}
                  onGenerateRules={handleGenerateRules}
                  onUpdateRules={handleUpdateRules}
                  onToggleRule={handleToggleRule}
                  onDeleteRule={handleDeleteRule}
                  selectedTransactionIds={selectedTransactionIds}
                />
              )
            )}
          </Container>

          {/* Progress Dialog */}
          <Dialog open={progressDialog.open} maxWidth="sm" fullWidth>
            <DialogTitle>{progressDialog.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ py: 2 }}>
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
                  {progressDialog.message}
                </Typography>
                {Object.keys(progressDialog.details).length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Details:
                    </Typography>
                    {Object.entries(progressDialog.details).map(([key, value]) => (
                      <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <CircularProgress />
                </Box>
              </Box>
            </DialogContent>
          </Dialog>

          {/* Quick Select Dialog */}
          <Dialog open={quickSelectDialog.open} onClose={() => setQuickSelectDialog({ ...quickSelectDialog, open: false })} maxWidth="sm" fullWidth>
            <DialogTitle>Quick Select Transactions</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={quickSelectDialog.type}
                    onChange={(e) => setQuickSelectDialog({ ...quickSelectDialog, type: e.target.value })}
                  >
                    <FormControlLabel value="number" control={<Radio />} label="Select by Number Range" />
                    <FormControlLabel value="date" control={<Radio />} label="Select by Date Range" />
                  </RadioGroup>
                </FormControl>

                {quickSelectDialog.type === 'number' && (
                  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Position</InputLabel>
                      <Select
                        value={quickSelectDialog.numberFrom}
                        onChange={(e) => setQuickSelectDialog({ ...quickSelectDialog, numberFrom: e.target.value })}
                        label="Position"
                      >
                        <MenuItem value="first">First</MenuItem>
                        <MenuItem value="last">Last</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      type="number"
                      label="Number of Transactions"
                      value={quickSelectDialog.numberCount}
                      onChange={(e) => setQuickSelectDialog({ ...quickSelectDialog, numberCount: parseInt(e.target.value) || 0 })}
                      inputProps={{ min: 1, max: filteredTransactions.length }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Will select {quickSelectDialog.numberFrom} {quickSelectDialog.numberCount} transactions from {filteredTransactions.length} total
                    </Typography>
                  </Box>
                )}

                {quickSelectDialog.type === 'date' && (
                  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Start Date"
                      value={quickSelectDialog.dateFrom}
                      onChange={(e) => setQuickSelectDialog({ ...quickSelectDialog, dateFrom: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="End Date"
                      value={quickSelectDialog.dateTo}
                      onChange={(e) => setQuickSelectDialog({ ...quickSelectDialog, dateTo: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setQuickSelectDialog({ ...quickSelectDialog, open: false })}>
                Cancel
              </Button>
              <Button onClick={handleQuickSelect} variant="contained">
                Select
              </Button>
            </DialogActions>
          </Dialog>

          {/* Rule Preview Dialog */}
          <Dialog
            open={rulePreviewDialog.open}
            onClose={() => setRulePreviewDialog({ open: false, rules: [], selectedRuleIds: [] })}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Review Generated Rules</Typography>
                <Box>
                  <Button
                    size="small"
                    onClick={() => handleSelectAllPreviewRules(true)}
                    disabled={rulePreviewDialog.selectedRuleIds.length === rulePreviewDialog.rules.length}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleSelectAllPreviewRules(false)}
                    disabled={rulePreviewDialog.selectedRuleIds.length === 0}
                  >
                    Deselect All
                  </Button>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Review the rules generated by AI. Select which ones to add to your rule list.
                Selected: {rulePreviewDialog.selectedRuleIds.length} / {rulePreviewDialog.rules.length}
              </Alert>

              {rulePreviewDialog.rules.map((rule, index) => (
                <Paper
                  key={rule.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '1px solid',
                    borderColor: rulePreviewDialog.selectedRuleIds.includes(rule.id) ? 'primary.main' : 'divider',
                    bgcolor: rulePreviewDialog.selectedRuleIds.includes(rule.id) ? 'action.selected' : 'inherit',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleToggleRulePreview(rule.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Checkbox
                      checked={rulePreviewDialog.selectedRuleIds.includes(rule.id)}
                      onChange={() => handleToggleRulePreview(rule.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {rule.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip label={rule.type} size="small" variant="outlined" />
                        <Chip label={rule.category} size="small" color="primary" />
                        {rule.subcategory && (
                          <Chip label={rule.subcategory} size="small" variant="outlined" />
                        )}
                        <Chip
                          label={`${Math.round(rule.confidence * 100)}% confidence`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        Pattern: {typeof rule.pattern === 'object' ? JSON.stringify(rule.pattern) : rule.pattern}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRulePreviewDialog({ open: false, rules: [], selectedRuleIds: [] })}>
                Cancel
              </Button>
              <Button
                onClick={handleAcceptRules}
                variant="contained"
                disabled={rulePreviewDialog.selectedRuleIds.length === 0}
              >
                Accept Selected ({rulePreviewDialog.selectedRuleIds.length})
              </Button>
            </DialogActions>
          </Dialog>
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

      {/* Style Debugger - temporary tool for adjusting colors */}
      <StyleDebugger />
    </ThemeProvider>
  );
}

export default App;
