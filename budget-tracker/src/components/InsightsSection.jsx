import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Lightbulb } from '@mui/icons-material';

function InsightsSection({ insights }) {
  if (!insights) return null;

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Lightbulb sx={{ color: 'secondary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Insights & Recommendations</Typography>
      </Box>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>
        {insights}
      </Typography>
    </Paper>
  );
}

export default InsightsSection;
