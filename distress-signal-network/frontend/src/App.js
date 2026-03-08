import { useState, useEffect } from 'react';
import { AppShell } from '@mantine/core';
import MapView from './components/MapView';
import AlertBanner from './components/AlertBanner';
import Sidebar from './components/Sidebar';
import { getOptimisedRoute } from './api/routing';
import { getSosStats } from './api/sos';
import { getRecentAlerts } from './api/alerts';

function App() {
  const [stats, setStats] = useState({
    by_severity: { critical: 0, urgent: 0, standard: 0, untriaged: 0 }
  });

  const [alertActive, setAlertActive] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routingData, setRoutingData] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);

  // Fetch initial stats and alerts on mount
  useEffect(() => {
    Promise.all([getSosStats(), getRecentAlerts(10)])
      .then(([statsData, alertsData]) => {
        if (statsData) setStats(statsData);
        if (alertsData) setRecentAlerts(alertsData);
      })
      .catch(err => console.error('Failed to fetch initial sidebar data:', err));
  }, []);

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
    // Prepend to recent alerts list
    setRecentAlerts(prev => [data, ...prev].slice(0, 20));
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

  const handleOptimiseRoute = async () => {
    setRouteLoading(true);
    try {
      const data = await getOptimisedRoute();
      setRoutingData(data);
      console.log(`Route optimised: ${data.stops} stops, ${(data.total_distance_m / 1000).toFixed(1)} km, solver: ${data.solver_used}`);
    } catch (error) {
      console.error('Routing failed:', error);
      setRoutingData(null);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <AppShell
      padding={0}
      header={{ height: alertActive ? 60 : 40 }}
      navbar={{ width: 320, breakpoint: 'sm' }}
    >
      <AppShell.Header>
        <AlertBanner alertActive={alertActive} alertData={alertData} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar
          connected={wsConnected}
          stats={stats}
          routeLoading={routeLoading}
          handleOptimiseRoute={handleOptimiseRoute}
          routingData={routingData}
          recentAlerts={recentAlerts}
        />
      </AppShell.Navbar>

      <AppShell.Main pos="relative" h="100vh">
        <MapView
          onTriageComplete={handleTriageComplete}
          onBroadcastAlert={handleBroadcastAlert}
          onNewSos={handleNewSos}
          onConnectionChange={setWsConnected}
          routingData={routingData}
        />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
