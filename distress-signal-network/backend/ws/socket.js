const { Server } = require('socket.io');

/**
 * Initialize Socket.io on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`[WS] Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`[WS] Client disconnected: ${socket.id}`);
        });

        // TODO: Register event listeners for SOS, alerts, routing updates
    });

    return io;
}

module.exports = { initSocket };
