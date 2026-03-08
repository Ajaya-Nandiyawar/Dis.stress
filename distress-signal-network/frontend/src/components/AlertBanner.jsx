import React, { useState } from 'react';
import { Alert, Stack, Text, Group, Select } from '@mantine/core';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const TRANSLATIONS = {
    en: {
        titleActive: (type) => `⚠ EMERGENCY BROADCAST — ${type} DETECTED`,
        titleInactive: '✅ SYSTEM MONITORING — All channels clear',
        inactiveBody: 'DIST.RESS Signal Network — Real-time emergency alert system active',
        confidence: (conf, time) => `Confidence: ${conf}%  ·  ${time}`
    },
    mr: {
        titleActive: (type) => `⚠ आणीबाणी प्रसारण — ${type} आढळला`,
        titleInactive: '✅ प्रणाली सनियंत्रण — सर्व चॅनेल स्पष्ट आहेत',
        inactiveBody: 'DIST.RESS सिग्नल नेटवर्क — रिअल-टाइम आणीबाणी इशारा प्रणाली सक्रिय',
        confidence: (conf, time) => `आत्मविश्वास: ${conf}%  ·  ${time}`
    },
    hi: {
        titleActive: (type) => `⚠ आपातकालीन प्रसारण — ${type} पाया गया`,
        titleInactive: '✅ प्रणाली निगरानी — सभी चैनल स्पष्ट हैं',
        inactiveBody: 'DIST.RESS सिग्नल नेटवर्क — रीयल-टाइम आपातकालीन चेतावनी प्रणाली सक्रिय',
        confidence: (conf, time) => `आत्मविश्वास: ${conf}%  ·  ${time}`
    }
};

const TEMPLATE_TRANSLATIONS = {
    'Evacuate immediately': {
        mr: 'तात्काळ सूचना — सुरक्षित ठिकाणी जा',
        hi: 'आपातकालीन सूचना — सुरक्षित स्थान पर जाएँ'
    },
    'Stay indoors': {
        mr: 'घरातच राहा',
        hi: 'घर के अंदर रहें'
    },
    'Boil water alert': {
        mr: 'पाणी उकळून प्या',
        hi: 'पानी उबालकर पिएं'
    },
    'Flood warning': {
        mr: 'पुराचा इशारा',
        hi: 'बाढ़ की चेतावनी'
    },
    'Earthquake tremor — Take cover': {
        mr: 'भूकंपाचा धक्का — आडोशाला जा',
        hi: 'भूकंप के झटके — सुरक्षित स्थान लें'
    }
};

export default function AlertBanner({ alertActive, alertData }) {
    const [lang, setLang] = useState('en');
    const t = TRANSLATIONS[lang];
    const threatType = (alertData?.threat_type || alertData?.type || 'UNKNOWN').toUpperCase();
    const templateMsg = alertData?.metadata?.template;

    let localizedTemplate = templateMsg;
    if (lang !== 'en' && templateMsg && TEMPLATE_TRANSLATIONS[templateMsg]) {
        localizedTemplate = TEMPLATE_TRANSLATIONS[templateMsg][lang];
    } else if (lang !== 'en' && !templateMsg && alertData?.source === 'manual') {
        localizedTemplate = lang === 'mr' ? 'तात्काळ सूचना — सुरक्षित ठिकाणी जा' : 'आपातकालीन सूचना — सुरक्षित स्थान पर जाएँ';
    }

    return (
        <Alert
            icon={alertActive ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
            color={alertActive ? 'red' : 'green'}
            title={
                <Group justify="space-between" align="center" style={{ width: '100%', paddingRight: '120px' }}>
                    <Text fw={700}>
                        {alertActive ? t.titleActive(threatType) : t.titleInactive}
                    </Text>
                    <Select
                        data={[
                            { value: 'en', label: 'English' },
                            { value: 'hi', label: 'हिंदी' },
                            { value: 'mr', label: 'मराठी' }
                        ]}
                        value={lang}
                        onChange={setLang}
                        size="xs"
                        w={100}
                        style={{ position: 'absolute', right: 16, top: 12, zIndex: 100 }}
                    />
                </Group>
            }
            radius={0}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            styles={{ title: { width: '100%' } }}
        >
            {alertActive
                ? (
                    <Stack gap={0}>
                        <Text size="sm" fw={500}>
                            {t.confidence(Math.round((alertData?.confidence || 0) * 100), new Date(alertData?.triggered_at).toLocaleTimeString())}
                        </Text>
                        {localizedTemplate && (
                            <Text size="xs" fw={700} c={lang !== 'en' ? 'red.2' : undefined}>
                                {alertData?.source === 'manual' ? `Manual Override: ${localizedTemplate}` : localizedTemplate}
                            </Text>
                        )}
                    </Stack>
                )
                : <Text size="sm" mt={4}>{t.inactiveBody}</Text>
            }
        </Alert>
    );
}
