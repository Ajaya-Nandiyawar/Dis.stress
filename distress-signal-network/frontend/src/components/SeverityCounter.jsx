import React from 'react';
import { Group, Text, Paper } from '@mantine/core';

export default function SeverityCounter({ label, count, colour }) {
    return (
        <Paper p="sm" radius="md" bg="dark.6" style={{ borderLeft: `4px solid ${colour}` }}>
            <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed" fw={500}>{label}</Text>
                <Text size="xl" fw={700} c={colour} ff="monospace">
                    {count}
                </Text>
            </Group>
        </Paper>
    );
}
