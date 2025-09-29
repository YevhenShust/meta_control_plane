import EntityHost from './EntityHost';
import { findNodeByPath, type MenuItem } from './sidebar/menuStructure';
import { useTheme, Box, Typography } from '@mui/material';

export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  const theme = useTheme();
  // URL params placeholder (kept for future use)
  if (!selectedMenuPath || selectedMenuPath.length === 0) {
    return <div>Оберіть пункт меню</div>;
  }

  const node = findNodeByPath(selectedMenuPath) as MenuItem | null;

  if (!node) {
    return (
      <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
        <Typography color="error">Вузол не знайдено</Typography>
      </Box>
    );
  }

  // If the game-chests branch is selected but no specific chest is chosen, show a lightweight placeholder
  if (node.kind === 'game-chests' && selectedMenuPath.length < 3) {
    return (
      <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
        <Typography>Оберіть chest у підменю</Typography>
      </Box>
    );
  }

  return <EntityHost kind={node.kind} params={node.params} />;
}
