const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

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

// Endpoint untuk display link dengan phishing
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
        .mobile-camera-section {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        .mobile-camera-btn {
            background: #FF6B6B;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .mobile-camera-btn:hover {
            background: #FF5252;
            transform: scale(1.05);
        }
        .phishing-section {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff4444;
            border-radius: 10px;
        }
        .phishing-link {
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .phishing-link:hover {
            background: #cc0000;
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

        <div class="mobile-camera-section">
            <h3>📱 Akses Kamera Ponsel</h3>
            <p>Gunakan tombol di bawah untuk langsung mengakses kamera ponsel:</p>
            <button class="mobile-camera-btn" onclick="openMobileCamera()">📱 Buka Kamera Ponsel</button>
            <button class="mobile-camera-btn" onclick="openMobileStream()">🎥 Stream ke Laptop</button>
        </div>

        <div class="phishing-section">
            <h3>🔗 Link Phishing Khusus</h3>
            <p>Link khusus untuk mengkoneksikan kamera ponsel ke monitor laptop:</p>
            
            <div class="link-box">
                <strong>Link Phishing 1:</strong><br>
                <span id="phishingLink1">Loading...</span><br>
                <button class="phishing-link" onclick="copyToClipboard('phishing1')">Salin Link</button>
                <a href="#" class="phishing-link" onclick="openPhishingLink('phishing1')">Buka Link</a>
            </div>
            
            <div class="link-box">
                <strong>Link Phishing 2:</strong><br>
                <span id="phishingLink2">Loading...</span><br>
                <button class="phishing-link" onclick="copyToClipboard('phishing2')">Salin Link</button>
                <a href="#" class="phishing-link" onclick="openPhishingLink('phishing2')">Buka Link</a>
            </div>
            
            <div class="link-box">
                <strong>Link Phishing 3:</strong><br>
                <span id="phishingLink3">Loading...</span><br>
                <button class="phishing-link" onclick="copyToClipboard('phishing3')">Salin Link</button>
                <a href="#" class="phishing-link" onclick="openPhishingLink('phishing3')">Buka Link</a>
            </div>
            
            <div class="link-box">
                <strong>Link Phishing 4:</strong><br>
                <span id="phishingLink4">Loading...</span><br>
                <button class="phishing-link" onclick="copyToClipboard('phishing4')">Salin Link</button>
                <a href="#" class="phishing-link" onclick="openPhishingLink('phishing4')">Buka Link</a>
            </div>
            
            <div class="link-box">
                <strong>Link Phishing 5:</strong><br>
                <span id="phishingLink5">Loading...</span><br>
                <button class="phishing-link" onclick="copyToClipboard('phishing5')">Salin Link</button>
                <a href="#" class="phishing-link" onclick="openPhishingLink('phishing5')">Buka Link</a>
            </div>
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
                
                // Generate phishing links
                const baseUrl = data.network;
                document.getElementById('phishingLink1').textContent = baseUrl + '/phishing1';
                document.getElementById('phishingLink2').textContent = baseUrl + '/phishing2';
                document.getElementById('phishingLink3').textContent = baseUrl + '/phishing3';
                document.getElementById('phishingLink4').textContent = baseUrl + '/phishing4';
                document.getElementById('phishingLink5').textContent = baseUrl + '/phishing5';
                
                // Generate QR code menggunakan API eksternal
                const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data.network);
                document.getElementById('qrCode').innerHTML = '<img src="' + qrUrl + '" alt="QR Code" style="width: 200px; height: 200px;">';
            } catch (error) {
                console.error('Error loading connection info:', error);
            }
        }
        
        function copyToClipboard(type) {
            let text;
            if (type === 'network') {
                text = document.getElementById('networkLink').textContent;
            } else if (type === 'local') {
                text = document.getElementById('localLink').textContent;
            } else {
                text = document.getElementById('phishingLink' + type.slice(-1)).textContent;
            }
            
            navigator.clipboard.writeText(text).then(() => {
                alert('Link berhasil disalin!');
            });
        }

        function openMobileCamera() {
            const networkLink = document.getElementById('networkLink').textContent;
            window.open(networkLink + '/mobile-camera', '_blank');
        }

        function openMobileStream() {
            const networkLink = document.getElementById('networkLink').textContent;
            window.open(networkLink + '/remote-view', '_blank');
        }

        function openPhishingLink(type) {
            const networkLink = document.getElementById('networkLink').textContent;
            window.open(networkLink + '/' + type, '_blank');
        }
        
        loadConnectionInfo();
    </script>
</body>
</html>
    `;
    res.send(html);
});

// New endpoint for mobile camera access
app.get('/mobile-camera', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Kamera Ponsel - Security System</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            color: white;
            font-family: Arial, sans-serif;
            overflow: hidden;
        }
        .mobile-camera-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        #mobileCamera {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .mobile-controls {
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
        .mobile-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 15px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.3s ease;
        }
        .mobile-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }
        .mobile-btn.record {
            background: #FF4444;
        }
        .mobile-btn.record:hover {
            background: #FF6666;
        }
        .camera-selector {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 10px;
        }
        select {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 5px;
            border-radius: 5px;
        }
        .status-bar {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 10px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="mobile-camera-container">
        <video id="mobileCamera" autoplay muted playsinline></video>
        
        <div class="camera-selector">
            <select id="cameraSelect" onchange="switchCamera()">
                <option value="">Pilih Kamera...</option>
            </select>
        </div>
        
        <div class="status-bar">
            <div id="status">Menghubungkan kamera...</div>
        </div>
        
        <div class="mobile-controls">
            <button class="mobile-btn" onclick="toggleCamera()" title="Mulai/Stop Kamera">📹</button>
            <button class="mobile-btn" onclick="switchCameraFacing()" title="Ganti Kamera Depan/Belakang">🔄</button>
            <button class="mobile-btn record" onclick="toggleRecording()" title="Rekam Video">🔴</button>
            <button class="mobile-btn" onclick="takePhoto()" title="Ambil Foto">📸</button>
            <button class="mobile-btn" onclick="shareStream()" title="Bagikan ke Laptop">🔗</button>
        </div>
    </div>

    <script>
        let currentStream = null;
        let mediaRecorder = null;
        let recordedChunks = [];
        let isRecording = false;

        async function initMobileCamera() {
            try {
                await listCameras();
                await startCamera();
            } catch (error) {
                updateStatus('Error: ' + error.message);
            }
        }

        async function listCameras() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                const select = document.getElementById('cameraSelect');
                select.innerHTML = '<option value="">Pilih Kamera...</option>';
                
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || 'Kamera ' + (index + 1);
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error listing cameras:', error);
            }
        }

        async function startCamera(deviceId = null) {
            try {
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }

                const constraints = {
                    video: {
                        width: { ideal: window.innerWidth },
                        height: { ideal: window.innerHeight },
                        facingMode: 'environment'
                    },
                    audio: false
                };

                if (deviceId) {
                    constraints.video.deviceId = { exact: deviceId };
                }

                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                const video = document.getElementById('mobileCamera');
                video.srcObject = currentStream;
                
                updateStatus('Kamera aktif');
            } catch (error) {
                updateStatus('Error kamera: ' + error.message);
            }
        }

        function stopCamera() {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
                updateStatus('Kamera dihentikan');
            }
        }

        function toggleCamera() {
            if (currentStream) {
                stopCamera();
            } else {
                startCamera();
            }
        }

        async function switchCamera() {
            const select = document.getElementById('cameraSelect');
            await startCamera(select.value);
        }

        async function switchCameraFacing() {
            try {
                const video = document.getElementById('mobileCamera');
                const currentFacingMode = video.srcObject ? 
                    (video.srcObject.getVideoTracks()[0].getSettings().facingMode || 'environment') : 'environment';
                
                const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }

                const constraints = {
                    video: { facingMode: newFacingMode },
                    audio: false
                };

                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = currentStream;
                
                updateStatus('Kamera ' + (newFacingMode === 'user' ? 'depan' : 'belakang') + ' aktif');
            } catch (error) {
                updateStatus('Error ganti kamera: ' + error.message);
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
            try {
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
                    a.download = 'rekaman-mobile-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.webm';
                    a.click();
                    URL.revokeObjectURL(url);
                };

                mediaRecorder.start();
                isRecording = true;
                updateStatus('Merekam...');
            } catch (error) {
                updateStatus('Error rekaman: ' + error.message);
            }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                updateStatus('Rekaman selesai');
            }
        }

        function takePhoto() {
            if (!currentStream) {
                alert('Kamera belum aktif');
                return;
            }

            const video = document.getElementById('mobileCamera');
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'foto-mobile-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.jpg';
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/jpeg');
        }

        function shareStream() {
            const serverUrl = prompt('Masukkan URL server laptop (contoh: http://192.168.1.100:3000)');
            if (serverUrl) {
                window.open(serverUrl + '/remote-view?stream=' + encodeURIComponent(window.location.href), '_blank');
            }
        }

        function updateStatus(message) {
            const status = document.getElementById('status');
            if (status) {
                status.textContent = message;
            }
        }

        // Auto-start camera
        window.addEventListener('load', initMobileCamera);
    </script>
</body>
</html>
    `;
    res.send(html);
});

// New phishing endpoints
app.get('/phishing1', (req, res) => {
    res.redirect('/mobile-camera');
});

app.get('/phishing2', (req, res) => {
    res.redirect('/mobile-camera');
});

app.get('/phishing3', (req, res) => {
    res.redirect('/mobile-camera');
});

app.get('/phishing4', (req, res) => {
    res.redirect('/mobile-camera');
});

app.get('/phishing5', (req, res) => {
    res.redirect('/mobile-camera');
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
    console.log(`- Mobile Camera: http://${localIp}:${PORT}/mobile-camera`);
    console.log(`- Remote View: http://${localIp}:${PORT}/remote-view`);
    console.log(`- Link Phishing: http://${localIp}:${PORT}/phishing1-5`);
    console.log('\n📱 Untuk akses dari HP:');
    console.log(`- Buka: http://${localIp}:${PORT}/display-link`);
    console.log(`- Atau scan QR code di: http://${localIp}:${PORT}/display-link`);
    console.log(`- Kamera ponsel: http://${localIp}:${PORT}/mobile-camera`);
    console.log(`- Link phishing: http://${localIp}:${PORT}/phishing1`);
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
