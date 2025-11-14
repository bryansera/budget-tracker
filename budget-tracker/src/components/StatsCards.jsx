import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingDown, TrendingUp, AccountBalance, Receipt } from '@mui/icons-material';

function StatsCards({ stats }) {
  const cards = [
    {
      label: 'Total Expenses',
      value: `-$${stats.totalExpenses.toFixed(2)}`,
      icon: <TrendingDown />,
      color: '#f44336'
    },
    {
      label: 'Total Income',
      value: `$${stats.totalIncome.toFixed(2)}`,
      icon: <TrendingUp />,
      color: '#4caf50'
    },
    {
      label: 'Net Balance',
      value: `$${stats.netBalance.toFixed(2)}`,
      icon: <AccountBalance />,
      color: stats.netBalance >= 0 ? '#4caf50' : '#f44336'
    },
    {
      label: 'Transactions',
      value: stats.transactionCount,
      icon: <Receipt />,
      color: '#667eea'
    }
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {card.label}
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: card.color, fontWeight: 'bold' }}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color, opacity: 0.7 }}>
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
