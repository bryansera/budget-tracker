import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Grid, Card, CardContent, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { ArrowBack, Edit, Delete, Rule as RuleIcon } from '@mui/icons-material';
import { applyRule, findRuleConflicts } from '../utils/rules';

const COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#30cfd0'
];

const RULE_TYPE_LABELS = {
  'description_contains': 'Contains Text',
  'description_starts_with': 'Starts With',
  'description_regex': 'Regex Pattern',
  'merchant': 'Merchant Name'
};

const RULE_TYPES = [
  { value: 'description_contains', label: 'Contains Text' },
  { value: 'description_starts_with', label: 'Starts With' },
  { value: 'description_regex', label: 'Regex Pattern' },
  { value: 'merchant', label: 'Merchant Name' }
];

function RuleDetailView({ transactions, rules, onDeleteRule, onUpdateRules, ruleId }) {
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Find the rule
  const rule = useMemo(() => {
    return rules.find(r => r.id === ruleId);
  }, [rules, ruleId]);

  // Get all matching transactions
  const matchingTransactions = useMemo(() => {
    if (!rule) return [];

    return transactions.filter(transaction => {
      const match = applyRule(transaction, rule);
      return match !== null;
    });
  }, [transactions, rule]);

  // Get transactions currently categorized by this rule
  const categorizedByThisRule = useMemo(() => {
    return transactions.filter(t => t.ruleId === ruleId);
  }, [transactions, ruleId]);

  if (!rule) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/ai-review')}
          sx={{ mb: 2 }}
        >
          Back to Rules
        </Button>
        <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>Rule Not Found</Typography>
          <Typography variant="body2" color="text.secondary">
            The rule you're looking for doesn't exist or has been deleted.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const ruleIndex = rules.findIndex(r => r.id === ruleId);

  const handleEditClick = () => {
    setEditingRule({ ...rule });
    // Check for conflicts
    const ruleConflicts = findRuleConflicts(rule, rules.filter(r => r.id !== rule.id), transactions);
    setConflicts(ruleConflicts);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    const updatedRules = rules.map(r => r.id === editingRule.id ? editingRule : r);
    onUpdateRules(updatedRules);
    setEditDialogOpen(false);
  };

  const handleEditChange = (field, value) => {
    const updated = { ...editingRule, [field]: value };
    setEditingRule(updated);

    // Re-check conflicts when pattern, type, or category changes
    if (['pattern', 'type', 'category'].includes(field)) {
      const ruleConflicts = findRuleConflicts(updated, rules.filter(r => r.id !== updated.id), transactions);
      setConflicts(ruleConflicts);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/ai-review')}
            sx={{ mb: 2 }}
          >
            Back to Rules
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <RuleIcon /> {rule.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rule Details and Matching Transactions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEditClick}
          >
            Edit
          </Button>
          {onDeleteRule && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => {
                onDeleteRule(rule.id);
                navigate('/ai-review');
              }}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>

      {/* Rule Information */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Rule Information
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Type
                </Typography>
                <Chip
                  label={RULE_TYPE_LABELS[rule.type] || rule.type}
                  size="small"
                  variant="outlined"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Pattern
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    wordBreak: 'break-all'
                  }}
                >
                  {typeof rule.pattern === 'object' ? JSON.stringify(rule.pattern) : rule.pattern}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Category
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={rule.category}
                    size="small"
                    sx={{ bgcolor: COLORS[ruleIndex % COLORS.length], color: 'white' }}
                  />
                  {rule.subcategory && (
                    <Chip label={rule.subcategory} size="small" variant="outlined" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Confidence
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS[1] }}>
                  {Math.round(rule.confidence * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={rule.enabled ? 'Enabled' : 'Disabled'}
                  size="small"
                  color={rule.enabled ? 'success' : 'default'}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(rule.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  by {rule.createdBy}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Match Statistics
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS[0] }}>
                  {matchingTransactions.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  transactions match this rule
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Examples */}
        {rule.examples && rule.examples.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Example Matches:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {rule.examples.map((example, idx) => (
                <Chip
                  key={idx}
                  label={example}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Matching Transactions */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Matching Transactions ({matchingTransactions.length})
          </Typography>
          {categorizedByThisRule.length !== matchingTransactions.length && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {categorizedByThisRule.length} of {matchingTransactions.length} matching transactions are currently categorized by this rule.
              {matchingTransactions.length - categorizedByThisRule.length > 0 && (
                <> The rest may be categorized by higher-priority rules.</>
              )}
            </Alert>
          )}
        </Box>

        {matchingTransactions.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'var(--table-header-bg, #f8f9fa) !important' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Current Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Categorized By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matchingTransactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    sx={{
                      '&:hover': { bgcolor: 'background.default' },
                      bgcolor: transaction.ruleId === ruleId ? 'action.selected' : 'inherit'
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.875rem' }}>{transaction.date}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{transaction.description}</Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: transaction.amount >= 0 ? 'success.main' : 'error.main',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      ${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={transaction.category} size="small" />
                        {transaction.subcategory && (
                          <Chip label={transaction.subcategory} size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {transaction.ruleId === ruleId ? (
                        <Chip label="This Rule" size="small" color="primary" />
                      ) : transaction.ruleId ? (
                        <Chip label="Other Rule" size="small" color="secondary" variant="outlined" />
                      ) : transaction.aiCategorized ? (
                        <Chip label="AI" size="small" color="info" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Manual
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No transactions match this rule
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Rule Name"
              value={editingRule?.name || ''}
              onChange={(e) => handleEditChange('name', e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Rule Type</InputLabel>
              <Select
                value={editingRule?.type || ''}
                label="Rule Type"
                onChange={(e) => handleEditChange('type', e.target.value)}
              >
                {RULE_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Pattern"
              value={editingRule?.pattern || ''}
              onChange={(e) => handleEditChange('pattern', e.target.value)}
              fullWidth
              helperText={
                editingRule?.type === 'description_regex'
                  ? 'Enter a valid regular expression'
                  : 'Text to match in transaction descriptions'
              }
            />

            <TextField
              label="Category"
              value={editingRule?.category || ''}
              onChange={(e) => handleEditChange('category', e.target.value)}
              fullWidth
            />

            <TextField
              label="Subcategory (optional)"
              value={editingRule?.subcategory || ''}
              onChange={(e) => handleEditChange('subcategory', e.target.value)}
              fullWidth
            />

            <TextField
              label="Confidence"
              type="number"
              inputProps={{ min: 0, max: 1, step: 0.05 }}
              value={editingRule?.confidence || 0.9}
              onChange={(e) => handleEditChange('confidence', parseFloat(e.target.value))}
              fullWidth
              helperText="0.0 to 1.0"
            />

            {conflicts.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Potential Conflicts Detected:
                </Typography>
                {conflicts.map((conflict, idx) => (
                  <Typography key={idx} variant="body2" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
                    • {conflict.message}
                    {conflict.overlapCount > 0 && ` (${conflict.overlapCount} overlapping transactions)`}
                  </Typography>
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  More specific rules are evaluated first. Current specificity: {conflicts[0]?.specificity.new}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RuleDetailView;
