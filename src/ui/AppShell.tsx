import React from 'react';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Box, Drawer } from '@mui/material';
import muiTheme from '../theme/muiTheme';
import Header from '../components/Header';
import SidebarMenu from '../components/sidebar/SidebarMenuMaterial';
import MainContent from '../components/MainContent';
import { menuStructure } from '../components/sidebar/menuStructure';

const SIDER_W = 260;
const HEADER_H = 64;

export default function AppShell({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ height: HEADER_H, zIndex: 1200 }}>
          <Toolbar sx={{ height: HEADER_H }}>
            <Header />
          </Toolbar>
        </AppBar>

        <Drawer variant="permanent" open sx={{ width: SIDER_W, '& .MuiDrawer-paper': { width: SIDER_W, top: HEADER_H } }}>
          <SidebarMenu menu={menuStructure} selectedMenuPath={selectedMenuPath} onSelect={onSelect} />
        </Drawer>

        <Box component="main" sx={{ marginLeft: `${SIDER_W}px`, pt: `${HEADER_H}px`, height: `calc(100vh - ${HEADER_H}px)`, overflow: 'auto', p: 3 }}>
          <MainContent selectedMenuPath={selectedMenuPath} />
        </Box>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
