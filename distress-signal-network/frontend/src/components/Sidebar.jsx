import React from 'react';
import { Stack, Text, Badge, Group, Divider, Button, ScrollArea, Box, Switch } from '@mantine/core';
import { Navigation, AlertCircle } from 'lucide-react';
import SeverityCounter from './SeverityCounter';
import RoutingPanel from './RoutingPanel';
import AlertHistory from './AlertHistory';

export default function Sidebar({ connected, stats, routeLoading, handleOptimiseRoute, routingData, recentAlerts, cascadeVisible, setCascadeVisible, onOpenManualAlert }) {
    const sev = stats?.by_severity || { critical: 0, urgent: 0, standard: 0, untriaged: 0 };
    const total = sev.critical + sev.urgent + sev.standard + sev.untriaged;

    return (
        <ScrollArea h="100%" type="auto" offsetScrollbars>
            <Stack gap="md" pb="md">
                {/* ── PANEL 1: Connection Status ───────────────── */}
                <Group justify="space-between" align="center">
                    <Badge
                        color={connected ? 'green' : 'gray'}
                        variant="dot"
                        size="lg"
                    >
                        {connected ? 'Live — Connected' : 'Reconnecting...'}
                    </Badge>
                    <Text size="xs" c="dimmed">Railway · Render · Vercel</Text>
                </Group>

                <Divider color="dark.4" />

                {/* ── PANEL 2: Severity Counters ───────────────── */}
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Triage Summary</Text>
                <Stack gap="xs">
                    <SeverityCounter label="Critical" count={sev.critical} colour="#FF0000" />
                    <SeverityCounter label="Urgent" count={sev.urgent} colour="#FF8800" />
                    <SeverityCounter label="Standard" count={sev.standard} colour="#FFFF00" />
                    <SeverityCounter label="Untriaged" count={sev.untriaged} colour="#888888" />
                </Stack>
                <Text size="xs" c="dimmed">
                    Total Reports: <Text span fw={700} c="white">{total}</Text>
                </Text>

                <Divider color="dark.4" />

                {/* ── PANEL 3: Route Optimisation ──────────────── */}
                <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">Route Optimisation</Text>
                    <Switch
                        label="Show Cascade Propagation"
                        checked={cascadeVisible}
                        onChange={(e) => setCascadeVisible(e.currentTarget.checked)}
                        color="blue"
                        size="xs"
                    />
                </Group>
                <Box style={{ flexShrink: 0 }}>
                    <Button
                        color="red"
                        variant="light"
                        onClick={onOpenManualAlert}
                        fullWidth
                        leftSection={<AlertCircle size={16} />}
                        mb="xs"
                    >
                        Create Manual Alert
                    </Button>
                    <Button
                        color="blue"
                        loading={routeLoading}
                        onClick={handleOptimiseRoute}
                        fullWidth
                        leftSection={<Navigation size={16} />}
                        mb="md"
                    >
                        Optimise Route
                    </Button>
                </Box>
                <Box style={{ minHeight: 120 }}>
                    <RoutingPanel data={routingData} />
                </Box>

                <Divider color="dark.4" />

                {/* ── PANEL 4: Alert History ───────────────────── */}
                <Box style={{ flexGrow: 1, minHeight: 140 }}>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb="xs">Alert History</Text>
                    <AlertHistory alerts={recentAlerts} />
                </Box>
            </Stack>
        </ScrollArea>
    );
}
