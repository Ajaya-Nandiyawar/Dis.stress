/**
 * Redis Subscriber — DIST.RESS Signal Network
 * Completely separate client instance from publisher.
 * 
 * CHANNELS THIS BACKEND PUBLISHES TO:
 *   'sos-events'      -> consumed by Python AI service (Shrinidhi)
 *   'alert-broadcast' -> consumed by Python AI service (optional cooldown tracking)
 * 
 * CHANNELS THIS BACKEND SUBSCRIBES TO:
 *   'alert-broadcast' -> internal logging only
 */
if (!process.env.REDIS_URL) {
    require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
}

const { createClient } = require('redis');

const client = createClient({
    url: process.env.REDIS_URL,
});

client.on('error', (err) => {
    console.error('Redis subscriber error:', err.message);
});

/**
 * Subscribe to a Redis Pub/Sub channel.
 * @param {string} channel - Channel name to subscribe to
 * @param {function} handler - Callback receiving the raw message string
 * @returns {Promise<void>}
 */
async function subscribe(channel, handler) {
    await client.subscribe(channel, (message) => {
        handler(message);
    });
    console.log(`Subscribed to channel: ${channel}`);
}

/**
 * Connect the subscriber client to Redis and attach listeners.
 * @returns {Promise<void>}
 */
async function connectSubscriber() {
    if (!client.isOpen) {
        await client.connect();

        // Setup internal subscriptions
        await subscribe('alert-broadcast', (rawMessage) => {
            try {
                const alert = JSON.parse(rawMessage);
                console.log(`Alert broadcast received: type=${alert.type} confidence=${alert.confidence}`);
            } catch (err) {
                console.error('Failed to parse alert-broadcast message:', err.message);
            }
        });

        console.log('Redis subscriber connected and listening');
    }
}

module.exports = { client, connectSubscriber, subscribe };
