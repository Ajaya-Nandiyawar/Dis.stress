/*
  DEPLOYMENT CHECKLIST:
  1. Generate local build: cd frontend && npm run build
  2. Serve locally to test: npx serve -s build -l 4000
  3. Verify no mixed-content (HTTP/HTTPS) or CORS errors in the browser console.
  4. Push to GitHub and import to Vercel.
  5. Add Environment Variables in Vercel Dashboard BEFORE deploying.
*/
import { useState, useEffect } from 'react';
import { AppShell } from '@mantine/core';
import MapView from './components/MapView';
import AlertBanner from './components/AlertBanner';
import Sidebar from './components/Sidebar';
import { getOptimisedRoute } from './api/routing';
import { getSosStats } from './api/sos';
import { getRecentAlerts } from './api/alerts';
import ManualAlertModal from './components/ManualAlertModal';
import { useDisclosure } from '@mantine/hooks';

const GULF_COORDS = [
  { lat: 35.6892, lng: 51.3890 }, // Tehran
  { lat: 32.6539, lng: 51.6660 }, // Isfahan
  { lat: 28.9234, lng: 50.8358 }  // Bushehr
];
let blastIndex = 0;

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
  const [cascadeVisible, setCascadeVisible] = useState(false);
  const [trafficVisible, setTrafficVisible] = useState(false);
  const [evacuationVisible, setEvacuationVisible] = useState(false);
  const [citizenStats, setCitizenStats] = useState({ safe: 0, need_rescue: 0, medical: 0 });
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  // Fetch initial stats and alerts on mount
  useEffect(() => {
    // Request Native Notification Permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    Promise.all([getSosStats(), getRecentAlerts(10)])
      .then(([statsData, alertsData]) => {
        if (statsData) setStats(statsData);
        if (alertsData) {
          // Add unique instance keys to initial alerts
          const keyedAlerts = alertsData.map((a, i) => ({ ...a, instance_key: `init-${a.id}-${i}-${Date.now()}` }));
          setRecentAlerts(keyedAlerts);
        }
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
    // Redirect 2-3 blast alerts to Gulf Area
    if (data.type?.toLowerCase() === 'blast') {
      const coord = GULF_COORDS[blastIndex % GULF_COORDS.length];
      data.lat = coord.lat;
      data.lng = coord.lng;
      data.latitude = coord.lat;
      data.longitude = coord.lng;
      blastIndex++;
      console.log(`[SIMULATION] Redirected blast alert to Gulf: ${data.lat}, ${data.lng}`);
    }

    setAlertActive(true);
    setAlertData(data);

    // Trigger Native OS Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const threatType = (data?.threat_type || data?.type || 'UNKNOWN').toUpperCase();
      const msgTemplate = data?.metadata?.template;
      let bodyText = `Confidence: ${Math.round((data?.confidence || 0) * 100)}%`;
      if (msgTemplate) bodyText += `\nInstructions: ${msgTemplate}`;

      new Notification(`⚠ CRITICAL ALERT: ${threatType} DETECTED`, {
        body: bodyText,
        icon: '/favicon.ico' // Or any relevant alert icon
      });
    }

    // Prepend to recent alerts list with a unique instance key
    const keyedAlert = { ...data, instance_key: `ws-${data.alert_id || data.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    setRecentAlerts(prev => [keyedAlert, ...prev].slice(0, 20));
    setTimeout(() => {
      setAlertActive(false);
      setAlertData(null);
    }, 5 * 60 * 1000);
  };

  const handleCitizenStatus = (data) => {
    setCitizenStats(prev => ({ ...prev, [data.status]: (prev[data.status] || 0) + 1 }));
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
      header={{ height: alertActive ? 90 : 70 }}
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
          cascadeVisible={cascadeVisible}
          setCascadeVisible={setCascadeVisible}
          onOpenManualAlert={openModal}
          citizenStats={citizenStats}
          trafficVisible={trafficVisible}
          setTrafficVisible={setTrafficVisible}
          evacuationVisible={evacuationVisible}
          setEvacuationVisible={setEvacuationVisible}
        />
      </AppShell.Navbar>

      <AppShell.Main pos="relative" h="100vh">
        <MapView
          onTriageComplete={handleTriageComplete}
          onBroadcastAlert={handleBroadcastAlert}
          onNewSos={handleNewSos}
          onConnectionChange={setWsConnected}
          onCitizenStatus={handleCitizenStatus}
          routingData={routingData}
          cascadeVisible={cascadeVisible}
          trafficVisible={trafficVisible}
          evacuationVisible={evacuationVisible}
        />
      </AppShell.Main>

      <ManualAlertModal
        opened={modalOpened}
        onClose={closeModal}
        onAlertTriggered={handleBroadcastAlert}
      />
    </AppShell>
  );
}

export default App;
