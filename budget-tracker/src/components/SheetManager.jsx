import { useState } from 'react';
import {
  Paper, Typography, Box, List, ListItem, ListItemButton, ListItemText,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

function SheetManager({ sheets, activeSheetId, onSheetSelect, onSheetCreate, onSheetDelete }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  const handleCreateSheet = () => {
    if (newSheetName.trim()) {
      onSheetCreate(newSheetName.trim());
      setNewSheetName('');
      setDialogOpen(false);
    }
  };

  const getDefaultSheetName = () => {
    const count = sheets.length + 1;
    return `Budget ${count}`;
  };

  const handleOpenDialog = () => {
    setNewSheetName(getDefaultSheetName());
    setDialogOpen(true);
  };

  return (
    <>
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Budget Sheets</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleOpenDialog}
          >
            New Sheet
          </Button>
        </Box>

        <List dense disablePadding>
          {sheets.map((sheet) => (
            <ListItem
              key={sheet.id}
              disablePadding
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
              }}
              secondaryAction={
                sheets.length > 1 && (
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => onSheetDelete(sheet.id)}
                    size="small"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemButton
                selected={sheet.id === activeSheetId}
                onClick={() => onSheetSelect(sheet.id)}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.50',
                    '&:hover': {
                      bgcolor: 'primary.100',
                    },
                  },
                }}
              >
                <ListItemText
                  primary={sheet.name}
                  secondary={`${sheet.transactions.length} transactions`}
                  primaryTypographyProps={{ fontWeight: sheet.id === activeSheetId ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Create New Sheet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Sheet Name"
            fullWidth
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateSheet();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSheet} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SheetManager;
