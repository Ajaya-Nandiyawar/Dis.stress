/**
 * Redis Publisher — DIST.RESS Signal Network
 * Separate client from subscriber to avoid RESP2 subscribe-mode conflict.
 */
if (!process.env.REDIS_URL) {
    require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
}

const { createClient } = require('redis');

const client = createClient({
    url: process.env.REDIS_URL,
});

client.on('error', (err) => {
    console.error('Redis publisher error:', err.message);
});

/**
 * Connect the publisher client to Redis.
 * @returns {Promise<void>}
 */
async function connectPublisher() {
    if (!client.isOpen) {
        await client.connect();
        console.log('Redis publisher connected');
    }
}

/**
 * Publish a JSON-serialised message to a Redis channel.
 * @param {string} channel - Redis Pub/Sub channel name
 * @param {object} payload - Object to be JSON-stringified and published
 * @returns {Promise<number>} Number of subscribers that received the message
 */
async function publish(channel, payload) {
    const message = JSON.stringify(payload);
    const receivers = await client.publish(channel, message);
    console.log(`Published to ${channel}: id=${payload.id || 'N/A'}`);
    return receivers;
}

module.exports = { client, connectPublisher, publish };
