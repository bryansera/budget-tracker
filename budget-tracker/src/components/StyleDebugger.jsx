import { useState, useEffect } from 'react';
import {
  Paper, Typography, Box, Slider, IconButton, Collapse
} from '@mui/material';
import { Settings, ExpandMore, ExpandLess } from '@mui/icons-material';

function StyleDebugger() {
  const [expanded, setExpanded] = useState(false);

  // Style values
  const [tableHeaderBg, setTableHeaderBg] = useState(() => {
    return localStorage.getItem('debug_tableHeaderBg') || '#f8f9fa';
  });
  const [accordionHoverBg, setAccordionHoverBg] = useState(() => {
    return localStorage.getItem('debug_accordionHoverBg') || '#f8f9fa';
  });
  const [accordionExpandedBg, setAccordionExpandedBg] = useState(() => {
    return localStorage.getItem('debug_accordionExpandedBg') || '#f5f5f5';
  });

  // Apply CSS variables and inject styles
  useEffect(() => {
    document.documentElement.style.setProperty('--table-header-bg', tableHeaderBg);
    localStorage.setItem('debug_tableHeaderBg', tableHeaderBg);

    // Inject CSS with !important to override MUI styles
    let styleEl = document.getElementById('style-debugger-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'style-debugger-css';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      thead tr {
        background-color: ${tableHeaderBg} !important;
      }
      .MuiAccordionSummary-root.Mui-expanded {
        background-color: ${accordionExpandedBg} !important;
      }
      .MuiAccordionSummary-root:hover {
        background-color: ${accordionHoverBg} !important;
      }
    `;
  }, [tableHeaderBg, accordionHoverBg, accordionExpandedBg]);

  useEffect(() => {
    localStorage.setItem('debug_accordionHoverBg', accordionHoverBg);
  }, [accordionHoverBg]);

  useEffect(() => {
    localStorage.setItem('debug_accordionExpandedBg', accordionExpandedBg);
  }, [accordionExpandedBg]);

  // Color presets
  const presets = [
    { label: 'White', value: '#ffffff' },
    { label: 'Light Grey', value: '#f8f9fa' },
    { label: 'Grey 100', value: '#f5f5f5' },
    { label: 'Grey 200', value: '#eeeeee' },
    { label: 'Grey 300', value: '#e0e0e0' },
  ];

  const ColorControl = ({ label, value, onChange }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
        {presets.map(preset => (
          <Box
            key={preset.value}
            onClick={() => onChange(preset.value)}
            sx={{
              width: 32,
              height: 32,
              bgcolor: preset.value,
              border: value === preset.value ? '2px solid #6366f1' : '1px solid #ccc',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { borderColor: '#6366f1' }
            }}
            title={preset.label}
          />
        ))}
      </Box>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        minWidth: expanded ? 280 : 'auto',
        maxWidth: 320
      }}
    >
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          bgcolor: '#f5f5f5'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Style Debugger
          </Typography>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          <ColorControl
            label="Table Header Background"
            value={tableHeaderBg}
            onChange={setTableHeaderBg}
          />
          <ColorControl
            label="Accordion Hover Background"
            value={accordionHoverBg}
            onChange={setAccordionHoverBg}
          />
          <ColorControl
            label="Accordion Expanded Background"
            value={accordionExpandedBg}
            onChange={setAccordionExpandedBg}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Changes are saved to localStorage
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}

export default StyleDebugger;
