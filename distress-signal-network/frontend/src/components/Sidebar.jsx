import React from 'react';
import { Stack, Title, Divider, Text } from '@mantine/core';
import SeverityCounter from './SeverityCounter';
import ConnectionDot from './ConnectionDot';

export default function Sidebar({ stats, connected }) {
    const sev = stats?.by_severity || { critical: 0, urgent: 0, standard: 0, untriaged: 0 };
    const total = sev.critical + sev.urgent + sev.standard + sev.untriaged;

    return (
        <Stack gap="md" style={{ height: '100%' }}>
            {/* Header */}
            <Title order={4} c="white">DIST.RESS Dashboard</Title>
            <ConnectionDot connected={connected} />

            <Divider color="dark.4" />

            {/* Severity Counters */}
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Triage Summary</Text>
            <Stack gap="xs">
                <SeverityCounter label="Critical — Trapped" count={sev.critical} colour="#FF0000" />
                <SeverityCounter label="Urgent — Medical" count={sev.urgent} colour="#FF8800" />
                <SeverityCounter label="Standard — Supplies" count={sev.standard} colour="#FFFF00" />
                <SeverityCounter label="Awaiting Triage" count={sev.untriaged} colour="#888888" />
            </Stack>

            <Divider color="dark.4" />

            {/* Total */}
            <Text size="sm" c="dimmed">
                Total Reports: <Text span fw={700} c="white">{total}</Text>
            </Text>
        </Stack>
    );
}
