const { io } = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('Test client connected with ID:', socket.id);
    setTimeout(() => {
        socket.disconnect();
        console.log('Test client disconnected');
        process.exit(0);
    }, 1000);
});
