import { useState } from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Chip, Select, MenuItem, Box, IconButton,
  Collapse, Tooltip, Button
} from '@mui/material';
import { SmartToy, KeyboardArrowDown, KeyboardArrowUp, UnfoldMore, UnfoldLess } from '@mui/icons-material';

function TransactionRow({ transaction, categories, onCategoryChange, expandAll }) {
  const [open, setOpen] = useState(false);

  // Use expandAll prop if provided, otherwise use local state
  const isOpen = expandAll !== undefined ? expandAll : open;

  return (
    <>
      <TableRow
        sx={{
          '&:hover': { bgcolor: 'background.default' },
          borderBottom: isOpen ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        <TableCell sx={{ width: 48, p: 0 }}>
          {transaction.aiCategorized && transaction.aiReason && (
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {transaction.aiCategorized && (
              <Tooltip title={transaction.aiReason ? "AI categorized - click arrow to see reasoning" : "AI categorized"}>
                <SmartToy fontSize="small" color="primary" />
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
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {transaction.source}
          </Typography>
        </TableCell>
      </TableRow>
      {transaction.aiCategorized && transaction.aiReason && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ py: 2, px: 3, bgcolor: 'primary.50', borderRadius: 1, my: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToy fontSize="small" color="primary" />
                  AI Categorization Reasoning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {transaction.aiReason}
                </Typography>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function TransactionTable({ transactions, categories, onCategoryChange }) {
  const [expandAll, setExpandAll] = useState(null);

  // Check if there are any AI categorized transactions with reasons
  const hasAIReasons = transactions.some(t => t.aiCategorized && t.aiReason);

  return (
    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            All Transactions
          </Typography>
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
              <TableCell sx={{ width: 48 }} />
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Subcategory</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                categories={categories}
                onCategoryChange={onCategoryChange}
                expandAll={expandAll}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default TransactionTable;
