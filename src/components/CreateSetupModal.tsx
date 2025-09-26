import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { useState } from 'react';

export default function CreateSetupModal({
  open, loading, onCancel, onSubmit,
}: {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Dialog open={open} onClose={onCancel} fullWidth>
      <DialogTitle>Create setup</DialogTitle>
      <DialogContent>
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Setup name"
          placeholder="e.g. Setup 2025-09-12 12:34"
          fullWidth
          variant="standard"
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(name)} variant="contained" disabled={loading || !name}>{loading ? 'Creating…' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
