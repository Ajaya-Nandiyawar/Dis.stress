import React from 'react';
import { Group, Text, Paper } from '@mantine/core';

export default function SeverityCounter({ label, count, colour }) {
    return (
        <Paper
            p="sm"
            radius="md"
            style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderLeft: `4px solid ${colour}`,
            }}
        >
            <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed" fw={500}>{label}</Text>
                <Text size="xl" fw={700} style={{ color: colour, fontFamily: 'monospace' }}>
                    {count}
                </Text>
            </Group>
        </Paper>
    );
}
