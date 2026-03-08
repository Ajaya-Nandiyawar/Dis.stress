import React from 'react';
import { Group, Text } from '@mantine/core';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionDot({ connected }) {
    return (
        <Group gap={6} align="center">
            <div
                style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: connected ? '#40c057' : '#fa5252',
                    boxShadow: connected
                        ? '0 0 6px 2px rgba(64, 192, 87, 0.5)'
                        : '0 0 6px 2px rgba(250, 82, 82, 0.5)',
                    transition: 'background-color 0.3s, box-shadow 0.3s',
                }}
            />
            {connected
                ? <Wifi size={14} color="#40c057" />
                : <WifiOff size={14} color="#fa5252" />
            }
            <Text size="xs" c={connected ? 'green' : 'red'} fw={600}>
                {connected ? 'LIVE' : 'OFFLINE'}
            </Text>
        </Group>
    );
}
