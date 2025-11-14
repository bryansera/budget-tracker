import React from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Chip, Select, MenuItem, Box
} from '@mui/material';
import { SmartToy } from '@mui/icons-material';

function TransactionTable({ transactions, categories, onCategoryChange }) {
  return (
    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            All Transactions
          </Typography>
          <Chip
            icon={<SmartToy />}
            label="AI categorized"
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((t) => (
              <TableRow
                key={t.id}
                sx={{
                  '&:hover': { bgcolor: 'background.default' },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TableCell sx={{ fontSize: '0.875rem' }}>{t.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {t.aiCategorized && <SmartToy fontSize="small" color="primary" />}
                    <Typography variant="body2">{t.description}</Typography>
                  </Box>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: t.amount >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  ${Math.abs(t.amount).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.category}
                    onChange={(e) => onCategoryChange(t.id, e.target.value)}
                    size="small"
                    sx={{ minWidth: 120, fontSize: '0.875rem' }}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
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
