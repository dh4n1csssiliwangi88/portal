const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const WhatsAppService = require('./whatsapp-service');
const WhatsAppAuth = require('./auth-whatsapp');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize WhatsApp services
const whatsappService = new WhatsAppService();
const whatsappAuth = new WhatsAppAuth();

// Configuration
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.PASSWORD || 'dst882961z';

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WhatsApp Camera Interface
app.get('/whatsapp-camera', (req, res) => {
    res.sendFile(path.join(__dirname, 'whatsapp-camera.html'));
});

// Direct camera access via token
app.get('/whatsapp-camera/:token', (req, res) => {
    const { token } = req.params;
    const userInfo = whatsappAuth.getUserByAccessToken(token);

    if (!userInfo) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Link Tidak Valid</title></head>
            <body>
                <h1>Link Akses Tidak Valid</h1>
                <p>Link ini mungkin telah kadaluarsa atau tidak valid.</p>
                <a href="/whatsapp-camera">Kembali ke halaman login</a>
            </body>
            </html>
        `);
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Kamera ${userInfo.camera.name} - WhatsApp</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #000;
                    color: white;
                    font-family: Arial, sans-serif;
                    overflow: hidden;
                }
                .camera-container {
                    position: relative;
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                #cameraVideo {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .camera-controls {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 15px;
                    background: rgba(0,0,0,0.5);
                    padding: 15px;
                    border-radius: 25px;
                }
                .camera-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 15px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    transition: all 0.3s;
                }
                .camera-btn:hover {
                    background: rgba(255,255,255,0.3);
                    transform: scale(1.1);
                }
                .camera-btn.record {
                    background: #FF4444;
                }
                .camera-btn.record:hover {
                    background: #FF6666;
                }
                .info-bar {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    background: rgba(0,0,0,0.5);
                    padding: 10px;
                    border-radius: 10px;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="camera-container">
                <div class="info-bar">
                    📱 Kamera: ${userInfo.camera.name}<br>
                    📞 WhatsApp: ${userInfo.phoneNumber}
                </div>
                
                <video id="cameraVideo" autoplay muted playsinline></video>
                
                <div class="camera-controls">
                    <button class="camera-btn" onclick="startCamera()" title="Mulai Kamera">▶️</button>
                    <button class="camera-btn" onclick="stopCamera()" title="Stop Kamera">⏹️</button>
                    <button class="camera-btn" onclick="switchCamera()" title="Ganti Kamera">🔄</button>
                    <button class="camera-btn record" onclick="toggleRecording()" title="Rekam">🔴</button>
                    <button class="camera-btn" onclick="takePhoto()" title="Foto">📸</button>
                </div>
            </div>

            <script>
                let currentStream = null;
                let mediaRecorder = null;
                let recordedChunks = [];
                let isRecording = false;

                async function startCamera() {
                    try {
                        const constraints = {
                            video: {
                                width: { ideal: 1280 },
                                height: { ideal: 720 },
                                facingMode: 'environment'
                            }
                        };

                        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                        const video = document.getElementById('cameraVideo');
                        video.srcObject = currentStream;
                    } catch (error) {
                        alert('Gagal mengaktifkan kamera: ' + error.message);
                    }
                }

                function stopCamera() {
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                        currentStream = null;
                        document.getElementById('cameraVideo').srcObject = null;
                    }
                }

                async function switchCamera() {
                    if (!currentStream) return;
                    
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(d => d.kind === 'videoinput');
                    
                    if (videoDevices.length > 1) {
                        stopCamera();
                        // Switch to next camera
                        const constraints = {
                            video: {
                                width: { ideal: 1280 },
                                height: { ideal: 720 },
                                facingMode: videoDevices[1].label.includes('front') ? 'user' : 'environment'
                            }
                        };
                        
                        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                        document.getElementById('cameraVideo').srcObject = currentStream;
                    }
                }

                function toggleRecording() {
                    if (!currentStream) {
                        alert('Kamera belum aktif');
                        return;
                    }

                    if (!isRecording) {
                        startRecording();
                    } else {
                        stopRecording();
                    }
                }

                function startRecording() {
                    mediaRecorder = new MediaRecorder(currentStream);
                    recordedChunks = [];

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            recordedChunks.push(event.data);
                        }
                    };

                    mediaRecorder.onstop = () => {
                        const blob = new Blob(recordedChunks, { type: 'video/webm' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'rekaman-whatsapp-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.webm';
                        a.click();
                        URL.revokeObjectURL(url);
                    };

                    mediaRecorder.start();
                    isRecording = true;
                    document.querySelector('.record').textContent = '⏹️';
                }

                function stopRecording() {
                    if (mediaRecorder && isRecording) {
                        mediaRecorder.stop();
                        isRecording = false;
                        document.querySelector('.record').textContent = '🔴';
                    }
                }

                function takePhoto() {
                    if (!currentStream) {
                        alert('Kamera belum aktif');
                        return;
                    }

                    const video = document.getElementById('cameraVideo');
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'foto-whatsapp-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.jpg';
                        a.click();
                        URL.revokeObjectURL(url);
                    }, 'image/jpeg');
                }

                // Auto-start camera
                startCamera();
            </script>
        </body>
        </html>
    `);
});

// WhatsApp API Endpoints
app.post('/api/whatsapp/request-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const result = await whatsappAuth.requestVerificationCode(phoneNumber);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/whatsapp/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        const result = await whatsappAuth.verifyCode(phoneNumber, code);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/whatsapp/share-camera', async (req, res) => {
    try {
        const { sessionId, cameraName } = req.body;
        const cameras = whatsappAuth.addUserCamera(sessionId, 'whatsapp-' + Date.now(), cameraName);
        const camera = cameras[cameras.length - 1];

        res.json({
            success: true,
            accessToken: camera.accessToken
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// WhatsApp Webhook
app.get('/webhook/whatsapp', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

    const result = whatsappService.verifyWebhook(mode, token, challenge);
    if (result) {
        res.send(result);
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/webhook/whatsapp', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        const body = JSON.parse(req.body);
        const message = whatsappService.parseWebhook(body);

        if (message && message.type === 'text') {
            // Handle incoming WhatsApp messages
            const text = message.text.toLowerCase();

            if (text.includes('kamera') || text.includes('camera')) {
                // Auto-reply with camera access instructions
                whatsappService.sendMessage(message.from,
                    `🎥 Untuk mengakses kamera Anda:\n\n1. Buka: ${req.protocol}://${req.get('host')}/whatsapp-camera\n2. Masukkan nomor WhatsApp Anda\n3. Ikuti petunjuk verifikasi\n\nLink akan dikirim setelah verifikasi berhasil!`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
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
        whatsapp: `http://${localIp}:${PORT}/whatsapp-camera`,
        qrCode: null
    };

    res.json({
        ...urls,
        qrCodeText: urls.whatsapp
    });
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

    socket.on('mobile-camera-stream', (data) => {
        socket.broadcast.emit('mobile-stream-update', data);
    });

    socket.on('remote-connection', (data) => {
        socket.broadcast.emit('remote-connection-update', data);
    });

    socket.on('whatsapp-camera-connected', (data) => {
        socket.broadcast.emit('whatsapp-camera-update', data);
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
    console.log(`🎥 Sistem Keamanan WhatsApp berjalan di:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${localIp}:${PORT}`);
    console.log(`- WhatsApp Camera: http://${localIp}:${PORT}/whatsapp-camera`);
    console.log(`- Webhook: http://${localIp}:${PORT}/webhook/whatsapp`);
    console.log('\n📱 Untuk akses via WhatsApp:');
    console.log(`1. Buka: http://${localIp}:${PORT}/whatsapp-camera`);
    console.log(`2. Masukkan nomor WhatsApp Anda`);
    console.log(`3. Ikuti petunjuk verifikasi`);
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

module.exports = { app, server, whatsappService, whatsappAuth };
