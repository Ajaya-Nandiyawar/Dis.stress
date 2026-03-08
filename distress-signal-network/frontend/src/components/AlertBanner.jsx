import React from 'react';
import { Alert } from '@mantine/core';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AlertBanner({ alertActive, alertData }) {
    return (
        <Alert
            icon={alertActive ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
            color={alertActive ? 'red' : 'green'}
            title={alertActive
                ? `⚠ EMERGENCY BROADCAST — ${(alertData?.threat_type || alertData?.type || 'UNKNOWN').toUpperCase()} DETECTED`
                : '✅ SYSTEM MONITORING — All channels clear'
            }
            radius={0}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
            {alertActive
                ? `Confidence: ${Math.round((alertData?.confidence || 0) * 100)}%  ·  ${new Date(alertData?.triggered_at).toLocaleTimeString()}`
                : 'DIST.RESS Signal Network — Real-time emergency alert system active'
            }
        </Alert>
    );
}
