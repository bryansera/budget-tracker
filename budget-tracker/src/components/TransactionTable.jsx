import { useState } from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Chip, Select, MenuItem, Box, IconButton,
  Collapse, Tooltip, Button, TableSortLabel, Checkbox, Alert
} from '@mui/material';
import { SmartToy, KeyboardArrowDown, KeyboardArrowUp, UnfoldMore, UnfoldLess, Refresh, Add, Visibility, Rule } from '@mui/icons-material';

function TransactionRow({ transaction, categories, onCategoryChange, expandAll, selected, onSelect, onRecategorize, rules, allTransactions, onCreateRule, onViewRuleMatches }) {
  const [open, setOpen] = useState(false);

  // Use expandAll prop if provided (true/false), otherwise use local state
  const isOpen = typeof expandAll === 'boolean' ? expandAll : open;

  // Get rule details if categorized by rule
  const appliedRule = transaction.ruleId && rules ? rules.find(r => r.id === transaction.ruleId) : null;

  // Count how many other transactions match this rule
  const ruleMatchCount = appliedRule && allTransactions
    ? allTransactions.filter(t => t.ruleId === appliedRule.id).length
    : 0;

  return (
    <>
      <TableRow
        sx={{
          '&:hover': { bgcolor: 'background.default' },
          borderBottom: isOpen ? 'none' : '1px solid',
          borderColor: 'divider',
          bgcolor: selected ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onChange={(e) => onSelect(transaction.id, e.target.checked)}
            size="small"
          />
        </TableCell>
        <TableCell sx={{ width: 48, p: 0 }}>
          {(transaction.aiCategorized || transaction.ruleId) && (
            <IconButton
              size="small"
              onClick={() => setOpen(!open)}
            >
              {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
        <TableCell sx={{ fontSize: '0.875rem' }}>{transaction.date}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {transaction.aiCategorized && (
              <Tooltip title={transaction.aiReason ? "AI categorized - click arrow to see reasoning" : "AI categorized (no reasoning available - try recategorizing to get AI reasoning)"}>
                <SmartToy fontSize="small" color="primary" />
              </Tooltip>
            )}
            {transaction.ruleName && (
              <Tooltip title={`Rule: ${transaction.ruleName}`}>
                <Chip
                  label={transaction.ruleName}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ height: '20px', fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
            <Typography variant="body2">{transaction.description}</Typography>
          </Box>
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
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {transaction.category}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {transaction.subcategory || 'N/A'}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {transaction.ruleName ? (
              <>
                <Chip
                  label={transaction.ruleName}
                  size="small"
                  color="secondary"
                  sx={{ fontSize: '0.7rem', height: '22px' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  Rule-based
                </Typography>
              </>
            ) : transaction.aiCategorized ? (
              <>
                <Chip
                  icon={<SmartToy fontSize="small" />}
                  label="AI"
                  size="small"
                  color="primary"
                  sx={{ fontSize: '0.7rem', height: '22px' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  Claude
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Manual
              </Typography>
            )}
          </Box>
        </TableCell>
      </TableRow>
      {(transaction.aiCategorized || transaction.ruleId) && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ my: 1 }}>
                {/* Show rule details if categorized by rule */}
                {appliedRule ? (
                  <Box sx={{ py: 2, px: 3, bgcolor: 'secondary.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rule fontSize="small" color="secondary" />
                      Rule: {appliedRule.name}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Type:</Typography>
                        <Typography variant="body2">{appliedRule.type}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Pattern:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {typeof appliedRule.pattern === 'object' ? JSON.stringify(appliedRule.pattern) : appliedRule.pattern}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Confidence:</Typography>
                        <Typography variant="body2">{Math.round(appliedRule.confidence * 100)}%</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Created By:</Typography>
                        <Typography variant="body2">{appliedRule.createdBy}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      {onViewRuleMatches && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => onViewRuleMatches(appliedRule.id)}
                        >
                          View All {ruleMatchCount} Matching Transactions
                        </Button>
                      )}
                    </Box>
                  </Box>
                ) : transaction.aiReason ? (
                  /* Show AI reasoning if available */
                  <Box sx={{ py: 2, px: 3, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmartToy fontSize="small" color="primary" />
                      AI Categorization Reasoning
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {transaction.aiReason}
                    </Typography>
                    {onCreateRule && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => onCreateRule(transaction)}
                      >
                        Create Rule from This Transaction
                      </Button>
                    )}
                  </Box>
                ) : (
                  /* No reasoning available */
                  <Alert severity="info">
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Reasoning not available for this transaction. It may have been categorized with an older version of the app.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      {onRecategorize && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Refresh />}
                          onClick={() => onRecategorize(transaction.id)}
                        >
                          Recategorize to Get AI Reasoning
                        </Button>
                      )}
                      {onCreateRule && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => onCreateRule(transaction)}
                        >
                          Create Rule
                        </Button>
                      )}
                    </Box>
                  </Alert>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function TransactionTable({ transactions, categories, onCategoryChange, selectedTransactions = [], onSelectionChange, onRecategorize, rules = [], onCreateRule, onViewRuleMatches }) {
  const [expandAll, setExpandAll] = useState(null);
  const [orderBy, setOrderBy] = useState('date');
  const [order, setOrder] = useState('desc');

  // Check if there are any AI categorized or rule-categorized transactions
  const hasAIReasons = transactions.some(t => t.aiCategorized || t.ruleId);

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(transactions.map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (transactionId, checked) => {
    if (checked) {
      onSelectionChange([...selectedTransactions, transactionId]);
    } else {
      onSelectionChange(selectedTransactions.filter(id => id !== transactionId));
    }
  };

  const isAllSelected = transactions.length > 0 && selectedTransactions.length === transactions.length;
  const isSomeSelected = selectedTransactions.length > 0 && selectedTransactions.length < transactions.length;

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aVal = a[orderBy];
    let bVal = b[orderBy];

    // Handle different data types
    if (orderBy === 'amount') {
      aVal = Math.abs(parseFloat(aVal));
      bVal = Math.abs(parseFloat(bVal));
    } else if (orderBy === 'date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  return (
    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              All Transactions
            </Typography>
            {selectedTransactions.length > 0 && (
              <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                {selectedTransactions.length} selected
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {hasAIReasons && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UnfoldMore />}
                  onClick={() => setExpandAll(true)}
                >
                  Expand All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UnfoldLess />}
                  onClick={() => setExpandAll(false)}
                >
                  Collapse All
                </Button>
              </>
            )}
            <Chip
              icon={<SmartToy />}
              label="AI categorized - click arrow to see reasoning"
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ width: 48 }} />
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <TableSortLabel
                  active={orderBy === 'date'}
                  direction={orderBy === 'date' ? order : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <TableSortLabel
                  active={orderBy === 'description'}
                  direction={orderBy === 'description' ? order : 'asc'}
                  onClick={() => handleSort('description')}
                >
                  Description
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <TableSortLabel
                  active={orderBy === 'amount'}
                  direction={orderBy === 'amount' ? order : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  Amount
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <TableSortLabel
                  active={orderBy === 'category'}
                  direction={orderBy === 'category' ? order : 'asc'}
                  onClick={() => handleSort('category')}
                >
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <TableSortLabel
                  active={orderBy === 'subcategory'}
                  direction={orderBy === 'subcategory' ? order : 'asc'}
                  onClick={() => handleSort('subcategory')}
                >
                  Subcategory
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <TableSortLabel
                  active={orderBy === 'ruleName'}
                  direction={orderBy === 'ruleName' ? order : 'asc'}
                  onClick={() => handleSort('ruleName')}
                >
                  Categorized By
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTransactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                categories={categories}
                onCategoryChange={onCategoryChange}
                expandAll={expandAll}
                selected={selectedTransactions.includes(t.id)}
                onSelect={handleSelectOne}
                onRecategorize={onRecategorize}
                rules={rules}
                allTransactions={transactions}
                onCreateRule={onCreateRule}
                onViewRuleMatches={onViewRuleMatches}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default TransactionTable;
