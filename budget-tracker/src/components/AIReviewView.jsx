import { useState, useMemo } from 'react';
import {
  Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Switch, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Alert, Grid, Card, CardContent, Accordion, AccordionSummary,
  AccordionDetails, Tooltip, Collapse
} from '@mui/material';
import {
  Add, Edit, Delete, Psychology, Refresh, Download, Upload,
  ExpandMore, CheckCircle, Cancel, FilterList, ExpandLess, PlayArrow, Warning
} from '@mui/icons-material';
import { updateRuleStats, applyRule } from '../utils/rules';

const COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#30cfd0'
];

const RULE_TYPES = [
  { value: 'description_contains', label: 'Contains Text' },
  { value: 'description_starts_with', label: 'Starts With' },
  { value: 'description_regex', label: 'Regex Pattern' },
  { value: 'merchant', label: 'Merchant Name' }
];

function AIReviewView({ transactions, rules, onGenerateRules, onUpdateRules, onToggleRule, onDeleteRule, selectedTransactionIds = [] }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [expandedRuleId, setExpandedRuleId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [rulesExpanded, setRulesExpanded] = useState(true);
  const [testRuleDialog, setTestRuleDialog] = useState({
    open: false,
    rule: null,
    matches: []
  });

  // Calculate rule statistics
  const rulesWithStats = useMemo(() => {
    if (!rules || rules.length === 0) return [];
    return updateRuleStats(rules, transactions);
  }, [rules, transactions]);

  // Get unique categories from rules
  const categories = useMemo(() => {
    const cats = new Set(rulesWithStats.map(r => r.category));
    return ['all', ...Array.from(cats).sort()];
  }, [rulesWithStats]);

  // Filter rules by category
  const filteredRules = useMemo(() => {
    if (filterCategory === 'all') return rulesWithStats;
    return rulesWithStats.filter(r => r.category === filterCategory);
  }, [rulesWithStats, filterCategory]);

  // Stats and conflict detection
  const stats = useMemo(() => {
    const totalRules = rulesWithStats.length;
    const enabledRules = rulesWithStats.filter(r => r.enabled).length;

    // Calculate unique transactions matched (for coverage) and detect conflicts
    const matchedTransactionIds = new Set();
    const transactionRuleMatches = {}; // Track which rules match each transaction
    const ruleConflicts = {}; // Track conflicts for each rule

    transactions.forEach(transaction => {
      const matchingRules = [];

      for (const rule of rulesWithStats) {
        if (rule.enabled) {
          const match = applyRule(transaction, rule);
          if (match) {
            matchingRules.push({
              ruleId: rule.id,
              ruleName: rule.name,
              category: match.category,
              subcategory: match.subcategory,
              createdBy: rule.createdBy
            });
          }
        }
      }

      if (matchingRules.length > 0) {
        matchedTransactionIds.add(transaction.id);

        // Detect conflicts (multiple rules match same transaction)
        if (matchingRules.length > 1) {
          transactionRuleMatches[transaction.id] = {
            transaction,
            rules: matchingRules
          };

          // Track which rules conflict with each other
          matchingRules.forEach((rule, idx) => {
            if (!ruleConflicts[rule.ruleId]) {
              ruleConflicts[rule.ruleId] = {
                ruleName: rule.ruleName,
                conflictsWith: new Set(),
                conflictCount: 0,
                conflictingTransactions: []
              };
            }

            // Add conflicts with other rules
            matchingRules.forEach((otherRule, otherIdx) => {
              if (idx !== otherIdx) {
                ruleConflicts[rule.ruleId].conflictsWith.add(otherRule.ruleId);
              }
            });

            ruleConflicts[rule.ruleId].conflictCount++;
            ruleConflicts[rule.ruleId].conflictingTransactions.push(transaction.description);
          });
        }
      }
    });

    const totalMatches = matchedTransactionIds.size;
    const rulesByType = rulesWithStats.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    // Convert Sets to arrays for display
    const conflictsArray = Object.entries(ruleConflicts).map(([ruleId, data]) => ({
      ruleId,
      ...data,
      conflictsWith: Array.from(data.conflictsWith)
    }));

    return {
      totalRules,
      enabledRules,
      disabledRules: totalRules - enabledRules,
      totalMatches,
      rulesByType,
      conflicts: conflictsArray,
      conflictingTransactions: Object.values(transactionRuleMatches),
      hasConflicts: conflictsArray.length > 0
    };
  }, [rulesWithStats, transactions]);

  const handleEditRule = (rule) => {
    setEditingRule({ ...rule });
    setEditDialogOpen(true);
  };

  const handleSaveRule = () => {
    const updatedRules = rules.map(r =>
      r.id === editingRule.id ? editingRule : r
    );
    onUpdateRules(updatedRules);
    setEditDialogOpen(false);
    setEditingRule(null);
  };

  const handleAddNewRule = () => {
    setEditingRule({
      id: `rule_${Date.now()}`,
      name: '',
      type: 'description_contains',
      pattern: '',
      category: '',
      subcategory: '',
      confidence: 0.9,
      matchCount: 0,
      examples: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      enabled: true
    });
    setEditDialogOpen(true);
  };

  const handleExportRules = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-rules-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRules = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          onUpdateRules([...rules, ...imported]);
        }
      } catch (error) {
        console.error('Failed to import rules:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleTestRule = (rule) => {
    const matches = [];

    transactions.forEach(transaction => {
      const match = applyRule(transaction, rule);
      if (match) {
        matches.push(transaction);
      }
    });

    setTestRuleDialog({
      open: true,
      rule: rule,
      matches: matches
    });
  };

  if (!rules) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
        <Psychology sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>No Rules Loaded</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate rules from your transactions to automate categorization
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Psychology />}
          onClick={() => onGenerateRules(false)}
        >
          Generate Rules from All Transactions
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList /> Rules Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage categorization rules that automatically classify your transactions
        </Typography>
        {selectedTransactionIds.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {selectedTransactionIds.length} transaction{selectedTransactionIds.length !== 1 ? 's' : ''} selected.
            You can generate rules from these selected transactions.
          </Alert>
        )}
      </Box>

      {/* Stats Cards */}
      <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setStatsExpanded(!statsExpanded)}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Statistics</Typography>
          <IconButton size="small">
            {statsExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        <Collapse in={statsExpanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Rules
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: COLORS[0] }}>
                      {stats.totalRules}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.enabledRules} enabled, {stats.disabledRules} disabled
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Matches
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: COLORS[1] }}>
                      {stats.totalMatches}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      transactions matched
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Coverage
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: COLORS[2] }}>
                      {transactions.length > 0
                        ? Math.round((stats.totalMatches / transactions.length) * 100)
                        : 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      of transactions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Most Common Type
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS[3] }}>
                      {Object.entries(stats.rulesByType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Object.entries(stats.rulesByType).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} rules
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Conflicts Warning */}
            {stats.hasConflicts && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ {stats.conflicts.length} Rule Conflict{stats.conflicts.length !== 1 ? 's' : ''} Detected
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.conflictingTransactions.length} transaction{stats.conflictingTransactions.length !== 1 ? 's' : ''} match multiple rules.
                  Due to rule precedence (user rules → AI rules → confidence), only one rule will be applied per transaction,
                  but this may indicate overlapping patterns that should be refined.
                </Typography>
              </Alert>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Actions Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<Psychology />}
          onClick={() => onGenerateRules(false)}
        >
          Generate Rules from All Transactions
        </Button>
        {selectedTransactionIds.length > 0 && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Psychology />}
            onClick={() => onGenerateRules(true)}
          >
            Generate Rules from Selected ({selectedTransactionIds.length})
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAddNewRule}
        >
          Add Rule Manually
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExportRules}
        >
          Export JSON
        </Button>
        <Button
          variant="outlined"
          component="label"
          startIcon={<Upload />}
        >
          Import JSON
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleImportRules}
          />
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Filter:</Typography>
          <Select
            size="small"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Paper>

      {/* Rules List */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setRulesExpanded(!rulesExpanded)}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Rules ({filteredRules.length})
          </Typography>
          <IconButton size="small">
            {rulesExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        <Collapse in={rulesExpanded}>
          {filteredRules.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No rules found. Generate rules with AI or add them manually.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, pt: 0 }}>
              {filteredRules.map((rule, index) => (
                <Accordion
                  key={rule.id}
                  id={`rule-${rule.id}`}
                  expanded={expandedRuleId === rule.id}
                  onChange={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
                  elevation={0}
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:before': { display: 'none' },
                    opacity: rule.enabled ? 1 : 0.6
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                      <Switch
                        checked={rule.enabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRule(rule.id);
                        }}
                        size="small"
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {rule.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={rule.type} size="small" variant="outlined" />
                          <Chip
                            label={rule.category}
                            size="small"
                            sx={{ bgcolor: COLORS[index % COLORS.length], color: 'white' }}
                          />
                          {rule.subcategory && (
                            <Chip label={rule.subcategory} size="small" variant="outlined" />
                          )}
                          <Chip
                            label={`${rule.matchCount || 0} matches`}
                            size="small"
                            color={rule.matchCount > 0 ? 'success' : 'default'}
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rule.matchCount > 0) {
                                handleTestRule(rule);
                              }
                            }}
                            sx={{ cursor: rule.matchCount > 0 ? 'pointer' : 'default' }}
                          />
                          <Chip
                            label={`${Math.round(rule.confidence * 100)}% confidence`}
                            size="small"
                            variant="outlined"
                          />
                          {stats.conflicts.find(c => c.ruleId === rule.id) && (
                            <Tooltip title={`Conflicts with ${stats.conflicts.find(c => c.ruleId === rule.id).conflictsWith.length} other rule(s)`}>
                              <Chip
                                icon={<Warning />}
                                label="Conflict"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Test rule">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestRule(rule);
                            }}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit rule">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRule(rule);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete rule">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRule(rule.id);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary">Pattern:</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', p: 1, bgcolor: 'background.default', borderRadius: 1, mt: 0.5 }}>
                            {typeof rule.pattern === 'object' ? JSON.stringify(rule.pattern) : rule.pattern}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary">Created:</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {new Date(rule.createdAt).toLocaleString()} by {rule.createdBy}
                          </Typography>
                        </Grid>
                      </Grid>

                      {rule.examples && rule.examples.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Example Matches:
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {rule.examples.map((example, idx) => (
                              <Chip
                                key={idx}
                                label={example}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Conflict Details */}
                      {stats.conflicts.find(c => c.ruleId === rule.id) && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                            ⚠️ This rule conflicts with other rules
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {stats.conflicts.find(c => c.ruleId === rule.id).conflictCount} transaction(s) match this rule AND other rules.
                            The actual category will be determined by precedence: user rules → AI rules → confidence.
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1 }}>
                            Conflicting Rules:
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {stats.conflicts.find(c => c.ruleId === rule.id).conflictsWith.map((conflictId) => {
                              const conflictingRule = filteredRules.find(r => r.id === conflictId);
                              return conflictingRule ? (
                                <Chip
                                  key={conflictId}
                                  label={conflictingRule.name}
                                  size="small"
                                  color="warning"
                                  sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
                                  onClick={() => {
                                    // Expand the conflicting rule
                                    setExpandedRuleId(conflictId);
                                    // Scroll to it
                                    setTimeout(() => {
                                      const element = document.getElementById(`rule-${conflictId}`);
                                      if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }, 100);
                                  }}
                                />
                              ) : null;
                            })}
                          </Box>
                        </Alert>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Collapse>
      </Paper>

      {/* Edit/Add Rule Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRule && rules.find(r => r.id === editingRule.id) ? 'Edit Rule' : 'Add New Rule'}
        </DialogTitle>
        <DialogContent>
          {editingRule && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Rule Name"
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="e.g., Starbucks Coffee"
              />

              <FormControl fullWidth>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  value={editingRule.type}
                  onChange={(e) => setEditingRule({ ...editingRule, type: e.target.value })}
                  label="Rule Type"
                >
                  {RULE_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Pattern"
                value={typeof editingRule.pattern === 'object' ? JSON.stringify(editingRule.pattern) : editingRule.pattern}
                onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                placeholder="e.g., STARBUCKS"
                helperText="Text to match in transaction description"
              />

              <TextField
                fullWidth
                label="Category"
                value={editingRule.category}
                onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                placeholder="e.g., Dining"
              />

              <TextField
                fullWidth
                label="Subcategory (optional)"
                value={editingRule.subcategory || ''}
                onChange={(e) => setEditingRule({ ...editingRule, subcategory: e.target.value })}
                placeholder="e.g., Coffee Shops"
              />

              <TextField
                fullWidth
                type="number"
                label="Confidence (0-1)"
                value={editingRule.confidence}
                onChange={(e) => setEditingRule({ ...editingRule, confidence: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 1, step: 0.05 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveRule}
            variant="contained"
            disabled={!editingRule || !editingRule.name || !editingRule.pattern || !editingRule.category}
          >
            Save Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog
        open={testRuleDialog.open}
        onClose={() => setTestRuleDialog({ open: false, rule: null, matches: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Test Rule: {testRuleDialog.rule?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              This rule would match <strong>{testRuleDialog.matches.length}</strong> transaction(s)
            </Alert>

            {testRuleDialog.rule && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Type:</strong> {testRuleDialog.rule.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Pattern:</strong> {typeof testRuleDialog.rule.pattern === 'object' ? JSON.stringify(testRuleDialog.rule.pattern) : testRuleDialog.rule.pattern}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Category:</strong> {testRuleDialog.rule.category} {testRuleDialog.rule.subcategory && `> ${testRuleDialog.rule.subcategory}`}
                </Typography>
              </Box>
            )}

            {testRuleDialog.matches.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Matching Transactions:
                </Typography>
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                  {testRuleDialog.matches.map((transaction, idx) => (
                    <Paper key={idx} elevation={0} sx={{ p: 2, mb: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {transaction.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {transaction.date}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: transaction.amount >= 0 ? 'success.main' : 'error.main' }}>
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                No transactions match this rule
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestRuleDialog({ open: false, rule: null, matches: [] })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AIReviewView;
