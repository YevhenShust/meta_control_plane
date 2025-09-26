import { Select, MenuItem, Typography, Stack, Chip, Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import useSetups from '../setup/useSetups';

export default function Header() {
  const { setups, selectedId, setSelectedId, createSetup } = useSetups();

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography fontWeight={700}>Setup:</Typography>
        <Select
          sx={{ minWidth: 260 }}
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value="">Select setup</MenuItem>
          {setups.map(s => <MenuItem key={s.id} value={s.id}>{s.name ?? s.id}</MenuItem>)}
        </Select>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={async () => {
          const name = prompt('Setup name');
          if (name) await createSetup(name);
        }} />
        <Typography color="text.secondary">Current ID:</Typography>
        <Chip label={selectedId ?? '—'} color="primary" size="small" />
      </Stack>
    </Box>
  );
}
