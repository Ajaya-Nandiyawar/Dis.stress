import React from 'react';
import { Stack, Badge, Group, Text, Paper } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';

export default function AlertHistory({ alerts }) {
    if (!alerts || alerts.length === 0) {
        return (
            <Text size="xs" c="dimmed" ta="center">No alerts recorded yet.</Text>
        );
    }

    return (
        <Stack gap="xs">
            {alerts.map((alert, i) => (
                <Paper key={alert.instance_key || alert.id || alert.alert_id || i} p="xs" radius="sm" bg="dark.6">
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                            <AlertTriangle size={12} color="#fa5252" />
                            <Badge size="sm" color="red" variant="filled">
                                {(alert.threat_type || alert.type || 'UNKNOWN').toUpperCase()}
                            </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" ff="monospace">
                            {Math.round((alert.confidence || 0) * 100)}%
                        </Text>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                        {alert.triggered_at ? new Date(alert.triggered_at).toLocaleTimeString() : '—'}
                    </Text>
                </Paper>
            ))}
        </Stack>
    );
}
