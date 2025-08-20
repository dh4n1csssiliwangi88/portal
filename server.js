const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Konfigurasi
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.PASSWORD || 'rumah2024';

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API untuk autentikasi
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        res.json({ success: true, token: 'secure-token-' + Date.now() });
    } else {
        res.status(401).json({ success: false, message: 'Kata sandi salah' });
    }
});

// Socket.io untuk real-time
io.on('connection', (socket) => {
    console.log('Client terhubung:', socket.id);

    socket.on('camera-status', (data) => {
        socket.broadcast.emit('camera-update', data);
    });

    socket.on('recording-status', (data) => {
        socket.broadcast.emit('recording-update', data);
    });

    socket.on('disconnect', () => {
        console.log('Client terputus:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Terjadi kesalahan!');
});

// Start server
server.listen(PORT, () => {
    console.log(`🎥 Sistem Keamanan Rumah berjalan di:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${getLocalIp()}:${PORT}`);
    console.log('\n📱 Untuk akses dari HP:');
    console.log(`- Buka browser dan masukkan: http://${getLocalIp()}:${PORT}`);
});

// Fungsi untuk mendapatkan IP lokal
function getLocalIp() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

module.exports = { app, server };
nmp