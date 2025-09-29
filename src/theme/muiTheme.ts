// src/theme/muiTheme.ts
import { createTheme } from '@mui/material/styles';

// Мінімальна тема. Можеш змінювати пізніше (типографіка, palette, spacing).
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#0b0b0b', paper: '#121212' },
    text: { primary: '#e6f0ff', secondary: '#9fb3d0' },
  },
  typography: { fontSize: 13 },
});

export default muiTheme;