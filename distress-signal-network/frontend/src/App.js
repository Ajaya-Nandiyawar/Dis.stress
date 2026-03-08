import { useState } from 'react';
import { AppShell } from '@mantine/core';
import MapView from './components/MapView';
import AlertBanner from './components/AlertBanner';
import Sidebar from './components/Sidebar';

function App() {
  const [stats, setStats] = useState({
    by_severity: { critical: 0, urgent: 0, standard: 0, untriaged: 0 }
  });

  const [alertActive, setAlertActive] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const handleTriageComplete = (data) => {
    setStats(prev => ({
      ...prev,
      by_severity: {
        ...prev.by_severity,
        untriaged: Math.max(0, prev.by_severity.untriaged - 1),
        critical: data.severity === 1 ? prev.by_severity.critical + 1 : prev.by_severity.critical,
        urgent: data.severity === 2 ? prev.by_severity.urgent + 1 : prev.by_severity.urgent,
        standard: data.severity === 3 ? prev.by_severity.standard + 1 : prev.by_severity.standard,
      }
    }));
  };

  const handleBroadcastAlert = (data) => {
    setAlertActive(true);
    setAlertData(data);
    setTimeout(() => {
      setAlertActive(false);
      setAlertData(null);
    }, 5 * 60 * 1000);
  };

  const handleNewSos = () => {
    setStats(prev => ({
      ...prev,
      by_severity: {
        ...prev.by_severity,
        untriaged: prev.by_severity.untriaged + 1,
      }
    }));
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="0"
    >
      <AppShell.Header>
        <AlertBanner alertActive={alertActive} alertData={alertData} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar stats={stats} connected={wsConnected} />
      </AppShell.Navbar>

      <AppShell.Main style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
        <MapView
          onTriageComplete={handleTriageComplete}
          onBroadcastAlert={handleBroadcastAlert}
          onNewSos={handleNewSos}
          onConnectionChange={setWsConnected}
        />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
