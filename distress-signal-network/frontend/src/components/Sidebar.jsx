import React from 'react';
import { Stack, Text, Badge, Group, Divider, Button, ScrollArea, Box } from '@mantine/core';
import { Navigation } from 'lucide-react';
import SeverityCounter from './SeverityCounter';
import RoutingPanel from './RoutingPanel';
import AlertHistory from './AlertHistory';

export default function Sidebar({ connected, stats, routeLoading, handleOptimiseRoute, routingData, recentAlerts }) {
    const sev = stats?.by_severity || { critical: 0, urgent: 0, standard: 0, untriaged: 0 };
    const total = sev.critical + sev.urgent + sev.standard + sev.untriaged;

    return (
        <Stack gap="md" h="100%">
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
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Route Optimisation</Text>
            <Button
                color="blue"
                loading={routeLoading}
                onClick={handleOptimiseRoute}
                fullWidth
                leftSection={<Navigation size={16} />}
            >
                Optimise Route
            </Button>
            <ScrollArea h={200} type="auto" offsetScrollbars>
                <RoutingPanel data={routingData} />
            </ScrollArea>

            <Divider color="dark.4" />

            {/* ── PANEL 4: Alert History ───────────────────── */}
            <Box mt="auto">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb="xs">Alert History</Text>
                <ScrollArea h={180} type="auto" offsetScrollbars>
                    <AlertHistory alerts={recentAlerts} />
                </ScrollArea>
            </Box>
        </Stack>
    );
}
