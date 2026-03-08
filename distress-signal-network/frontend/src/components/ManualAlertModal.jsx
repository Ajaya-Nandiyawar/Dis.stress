import React, { useState } from 'react';
import { Modal, Select, Button, Stack, Text, Group } from '@mantine/core';
import { AlertCircle, Send } from 'lucide-react';
import { triggerManualAlert } from '../api/alerts';

const TEMPLATES = [
    { value: 'Evacuate immediately', label: 'Evacuate immediately' },
    { value: 'Stay indoors', label: 'Stay indoors' },
    { value: 'Boil water alert', label: 'Boil water alert' },
    { value: 'Flood warning', label: 'Flood warning' },
    { value: 'Earthquake tremor — Take cover', label: 'Earthquake tremor — Take cover' }
];

const PRIORITIES = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
];

export default function ManualAlertModal({ opened, onClose, onAlertTriggered }) {
    const [template, setTemplate] = useState('');
    const [priority, setPriority] = useState('high');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!template) return;
        setLoading(true);
        try {
            // Hardcoding a center point for manual alerts if no map click is captured
            // or we could ask for lat/lng. Usually, manual alerts are broadcasted 
            // for the whole area or a specific point. 
            // The requirement says "around the lat/lng".
            // For now, let's use the center of Pune as a default for manual triggers.
            const lat = 18.5204;
            const lng = 73.8567;

            const templateTypeMap = {
                'Evacuate immediately': 'fire',
                'Stay indoors': 'blast',
                'Boil water alert': 'flood',
                'Flood warning': 'flood',
                'Earthquake tremor — Take cover': 'earthquake'
            };

            const payload = {
                type: templateTypeMap[template] || 'blast',
                confidence: 1.0,
                lat,
                lng,
                source: 'manual',
                metadata: {
                    priority,
                    template
                }
            };

            const result = await triggerManualAlert(payload);
            if (onAlertTriggered) onAlertTriggered(result);
            onClose();
        } catch (error) {
            console.error('Failed to trigger manual alert:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <AlertCircle size={20} color="red" />
                    <Text fw={700}>Manual Emergency Override</Text>
                </Group>
            }
            centered
        >
            <Stack>
                <Select
                    label="Message Template"
                    placeholder="Select a message..."
                    data={TEMPLATES}
                    value={template}
                    onChange={setTemplate}
                    required
                />
                <Select
                    label="Priority Level"
                    placeholder="Select priority..."
                    data={PRIORITIES}
                    value={priority}
                    onChange={setPriority}
                    required
                />
                <Button
                    color="red"
                    fullWidth
                    leftSection={<Send size={16} />}
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!template}
                >
                    Trigger Broadcast
                </Button>
            </Stack>
        </Modal>
    );
}
