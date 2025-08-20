const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Konfigurasi
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.PASSWORD || 'dst882961z';

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

// Endpoint untuk mendapatkan alamat koneksi
app.get('/api/connection-info', (req, res) => {
    const localIp = getLocalIp();
    const urls = {
        local: `http://localhost:${PORT}`,
        network: `http://${localIp}:${PORT}`,
        qrCode: null
    };

    // Generate QR code untuk network URL
    const qrCodeText = urls.network;
    res.json({
        ...urls,
        qrCodeText: qrCodeText
    });
});

// Endpoint untuk display link
app.get('/display-link', (req, res) => {
    const localIp = getLocalIp();
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>🔗 Link Akses Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                padding: 20px;
                margin: 0;
            }
            .container {
                max-width: 500px;
                margin: 0 auto;
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            .qr-code {
                margin: 20px 0;
                background: white;
                padding: 20px;
                border-radius: 10px;
                display: inline-block;
            }
            .link-box {
                background: rgba(255,255,255,0.2);
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                word-break: break-all;
            }
            .copy-btn {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
            }
            .copy-btn:hover {
                background: #45a049;
            }
            .icon {
                font-size: 24px;
                margin-right: 10px;
            }
            .qr-placeholder {
                width: 200px;
                height: 200px;
                background: white;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                font-size: 14px;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 Link Akses Monitor</h1>
            <p>Scan QR code atau salin link di bawah untuk akses dari HP</p>
            
            <div class="qr-code">
                <div class="qr-placeholder" id="qrCode">
                    <div>
                        <strong>QR Code Generator</strong><br>
                        <small>Install qrcode package untuk QR code otomatis</small>
                    </div>
                </div>
            </div>
            
            <div class="link-box">
                <span class="icon">📱</span>
                <strong>Link Utama:</strong><br>
                <span id="networkLink">Loading...</span><br>
                <button class="copy-btn" onclick="copyToClipboard('network')">Salin Link</button>
            </div>
            
            <div class="link-box">
                <span class="icon">💻</span>
                <strong>Link Lokal:</strong><br>
                <span id="localLink">Loading...</span><br>
                <button class="copy-btn" onclick="copyToClipboard('local')">Salin Link</button>
            </div>
            
            <p style="font-size: 14px; opacity: 0.8;">
                Pastikan HP dan monitor terhubung ke jaringan yang sama
            </p>
        </div>

        <script>
            async function loadConnectionInfo() {
                try {
                    const response = await fetch('/api/connection-info');
                    const data = await response.json();
                    
                    document.getElementById('networkLink').textContent = data.network;
                    document.getElementById('localLink').textContent = data.local;
                    
                    // Generate QR code menggunakan API eksternal
                    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data.network);
                    document.getElementById('qrCode').innerHTML = '<img src="' + qrUrl + '" alt="QR Code" style="width: 200px; height: 200px;">';
                } catch (error) {
                    console.error('Error loading connection info:', error);
                }
            }
            
            function copyToClipboard(type) {
                const text = type === 'network' 
                    ? document.getElementById('networkLink').textContent
                    : document.getElementById('localLink').textContent;
                
                navigator.clipboard.writeText(text).then(() => {
                    alert('Link berhasil disalin!');
                });
            }
            
            loadConnectionInfo();
        </script>
    </body>
    </html>
    `;
    res.send(html);
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
    const localIp = getLocalIp();
    console.log(`🎥 Sistem Keamanan Rumah berjalan di:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${localIp}:${PORT}`);
    console.log(`- Display Link: http://${localIp}:${PORT}/display-link`);
    console.log('\n📱 Untuk akses dari HP:');
    console.log(`- Buka: http://${localIp}:${PORT}/display-link`);
    console.log(`- Atau scan QR code di: http://${localIp}:${PORT}/display-link`);
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
