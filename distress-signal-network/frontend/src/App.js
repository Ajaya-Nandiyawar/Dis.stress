import { AppShell } from '@mantine/core';
import MapView from './components/MapView';
import AlertBanner from './components/AlertBanner';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="0"
    >
      <AppShell.Header>
        <AlertBanner />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar />
      </AppShell.Navbar>

      <AppShell.Main style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
        <MapView />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
