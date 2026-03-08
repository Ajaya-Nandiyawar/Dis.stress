import React from 'react';
import { Stack, Text, Badge, Group, Paper, Divider } from '@mantine/core';

const SEVERITY_COLORS = { 1: 'red', 2: 'orange', 3: 'yellow' };
const SEVERITY_NAMES = { 1: 'CRITICAL', 2: 'URGENT', 3: 'STANDARD' };

export default function RoutingPanel({ data }) {
    if (!data) return null;

    if (!data.route || data.route.length === 0) {
        return (
            <Paper p="sm" radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <Text size="sm" c="dimmed" ta="center">No active high-priority SOS reports.</Text>
            </Paper>
        );
    }

    return (
        <Stack gap="xs">
            {data.route.map((stop) => (
                <Paper
                    key={stop.id}
                    p="xs"
                    radius="md"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${stop.colour || '#0288D1'}` }}
                >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Group gap="xs" align="center" wrap="nowrap">
                            <Badge
                                size="lg"
                                radius="xl"
                                color="blue"
                                variant="filled"
                                style={{ minWidth: 28, textAlign: 'center' }}
                            >
                                {stop.stop}
                            </Badge>
                            <Badge size="sm" color={SEVERITY_COLORS[stop.severity] || 'gray'}>
                                {SEVERITY_NAMES[stop.severity] || 'N/A'}
                            </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                            {((stop.distance_from_prev_m || 0) / 1000).toFixed(1)} km
                        </Text>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
                        {stop.label || 'Unknown'}
                    </Text>
                </Paper>
            ))}

            <Divider color="dark.4" />

            <Group justify="space-between">
                <Text size="xs" c="dimmed">
                    Solver: <Text span fw={600} c="white">{data.solver_used}</Text>
                </Text>
                <Text size="xs" c="dimmed">
                    Total: <Text span fw={600} c="white">{(data.total_distance_m / 1000).toFixed(1)} km</Text>
                </Text>
            </Group>
        </Stack>
    );
}
