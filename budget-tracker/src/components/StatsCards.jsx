import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingDown, TrendingUp, AccountBalance, Receipt } from '@mui/icons-material';

// Format number with commas
const formatNumber = (num) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function StatsCards({ stats }) {
  const cards = [
    {
      label: 'Total Expenses',
      value: `-$${formatNumber(stats.totalExpenses)}`,
      icon: <TrendingDown />,
      color: '#f44336'
    },
    {
      label: 'Total Income',
      value: `$${formatNumber(stats.totalIncome)}`,
      icon: <TrendingUp />,
      color: '#4caf50'
    },
    {
      label: 'Net Balance',
      value: `${stats.netBalance >= 0 ? '' : '-'}$${formatNumber(Math.abs(stats.netBalance))}`,
      icon: <AccountBalance />,
      color: stats.netBalance >= 0 ? '#4caf50' : '#f44336'
    },
    {
      label: 'Transactions',
      value: stats.transactionCount.toLocaleString('en-US'),
      icon: <Receipt />,
      color: '#667eea'
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '0.875rem' }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color, opacity: 0.3 }}>
                  {card.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default StatsCards;
