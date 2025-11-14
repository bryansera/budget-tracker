import { useState } from 'react';
import {
  Paper, Box, Typography, List, ListItem, Chip, Button,
  Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import {
  ExpandMore, CheckCircle, Error, Delete,
  Psychology, Refresh, Category
} from '@mui/icons-material';

function ActivityLog({ logs, onClear }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'categorization':
        return <Category fontSize="small" />;
      case 'recategorization':
        return <Refresh fontSize="small" />;
      case 'insights':
        return <Psychology fontSize="small" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'categorization':
        return 'Categorization';
      case 'recategorization':
        return 'Re-categorization';
      case 'insights':
        return 'Generate Insights';
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (logs.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>No activity logs yet</Typography>
        <Typography variant="body2" color="text.secondary">
          AI interactions will be logged here for debugging
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Activity Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {logs.length} AI interactions logged
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Delete />}
          onClick={onClear}
        >
          Clear Logs
        </Button>
      </Box>

      <List disablePadding>
        {logs.map((log, index) => (
          <ListItem
            key={log.id}
            sx={{
              display: 'block',
              py: 0,
              borderBottom: index < logs.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <Accordion elevation={0} disableGutters>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 2,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {log.status === 'success' ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <Error fontSize="small" color="error" />
                  )}
                  {getTypeIcon(log.type)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {getTypeLabel(log.type)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(log.timestamp)}
                  </Typography>
                </Box>
                <Chip
                  label={log.status}
                  size="small"
                  color={log.status === 'success' ? 'success' : 'error'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: 'background.default', pt: 2 }}>
                <Box>
                  {log.status === 'success' ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Message:</strong> {log.details.message}
                      </Typography>
                      {log.details.transactionCount && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Transactions:</strong> {log.details.transactionCount}
                        </Typography>
                      )}
                      {log.details.insightLength && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Insight Length:</strong> {log.details.insightLength} characters
                        </Typography>
                      )}
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="error.main" gutterBottom>
                        <strong>Error:</strong> {log.details.error}
                      </Typography>
                      {log.details.transactionCount && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Transactions:</strong> {log.details.transactionCount}
                        </Typography>
                      )}
                      {log.details.stack && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary" component="div">
                            <strong>Stack Trace:</strong>
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              mt: 1,
                              p: 1,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              overflow: 'auto',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {log.details.stack}
                          </Box>
                        </>
                      )}
                    </>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default ActivityLog;
