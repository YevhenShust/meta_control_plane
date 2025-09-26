import { Select, MenuItem, Box, Typography } from '@mui/material';
import useSetups from './useSetups';

export default function SetupSelect() {
  const { setups, selectedId, setSelectedId } = useSetups();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography color="text.secondary">Setup:</Typography>
      <Select
        value={selectedId ?? ''}
        onChange={(e) => setSelectedId(String(e.target.value))}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">Select setup</MenuItem>
        {setups.map(s => <MenuItem key={s.id} value={s.id}>{s.name ?? s.id}</MenuItem>)}
      </Select>
    </Box>
  );
}