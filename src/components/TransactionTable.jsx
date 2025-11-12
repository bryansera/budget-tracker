import React from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Chip, Select, MenuItem, Box
} from '@mui/material';
import { SmartToy } from '@mui/icons-material';

function TransactionTable({ transactions, categories, onCategoryChange }) {
  return (
    <Paper sx={{ mb: 3 }} elevation={2}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📋 Transactions
          <Chip
            icon={<SmartToy />}
            label="= AI categorized"
            size="small"
            variant="outlined"
            color="primary"
          />
        </Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Source</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((t) => (
              <TableRow
                key={t.id}
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                  bgcolor: t.aiCategorized ? 'action.selected' : 'inherit'
                }}
              >
                <TableCell>{t.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {t.aiCategorized && <SmartToy fontSize="small" color="primary" />}
                    {t.description}
                  </Box>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: t.amount >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}
                >
                  ${Math.abs(t.amount).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.category}
                    onChange={(e) => onCategoryChange(t.id, e.target.value)}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {t.source}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default TransactionTable;
