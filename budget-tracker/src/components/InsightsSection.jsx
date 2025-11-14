import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Lightbulb } from '@mui/icons-material';

function InsightsSection({ insights }) {
  if (!insights) return null;

  return (
    <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }} elevation={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Lightbulb sx={{ color: '#ff9800' }} />
        <Typography variant="h6">AI Insights & Recommendations</Typography>
      </Box>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
        {insights}
      </Typography>
    </Paper>
  );
}

export default InsightsSection;
