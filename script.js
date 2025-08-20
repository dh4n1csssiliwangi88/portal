// Konfigurasi sistem keamanan rumah yang diperbarui
const CONFIG = {
    password: 'dst882961z',
    cameras: [
        { id: 'camera1', name: 'Kamera Depan', streamUrl: null },
        { id: 'camera2', name: 'Kamera Belakang', streamUrl: null }
    ],
    recording: false,
    mediaRecorder: null,
    recordedChunks: [],
    mobileCameras: [],
    currentFacingMode: 'environment',
    // New configuration for remote connection
    peerConnection: null,
    socket: null,
    isServer: false,
    serverId: null,
    remoteStream: null
};

// Fungsi login
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const password = document.getElementById('password').value;

    if (password === CONFIG.password) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        initializeSystem();
    } else {
        alert('Kata sandi salah! Silakan coba lagi.');
    }
});

// Inisialisasi sistem yang diperbarui
function initializeSystem() {
    updateStatus('Sistem siap - Pilih mode untuk memulai');
    setupCameraAccess();
    detectMobileDevice();
    initializeRemoteConnection();
}

// Mode management
function setMode(mode) {
    // Hide all mode contents
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active from all mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected mode
    document.getElementById(mode + 'Mode').classList.add('active');

    // Add active to selected button
    event.target.classList.add('active');

    // Update status
    document.getElementById('currentMode').textContent =
        mode === 'local' ? 'Lokal' :
            mode === 'mobile' ? 'Mobile' : 'Remote';

    updateStatus(`Mode ${mode} aktif`);
}

// Setup akses kamera
async function setupCameraAccess() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatus('Browser tidak mendukung akses kamera');
            return;
        }

        for (let camera of CONFIG.cameras) {
            const videoElement = document.getElementById(camera.id);
            if (videoElement) {
                videoElement.addEventListener('loadedmetadata', () => {
                    console.log(`${camera.name} siap`);
                });
            }
        }
    } catch (error) {
        console.error('Error setup kamera:', error);
        updateStatus('Error mengakses kamera: ' + error.message);
    }
}

// Deteksi perangkat mobile
function detectMobileDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        updateStatus('Perangkat mobile terdeteksi - Kamera ponsel tersedia');
    }
}

// ===== MOBILE CAMERA FUNCTIONS =====

// Daftar semua kamera yang tersedia (mobile)
async function listMobileCameras() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            alert('Browser tidak mendukung enumerasi perangkat');
            return;
        }

        // Minta izin kamera dulu
        await navigator.mediaDevices.getUserMedia({ video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        CONFIG.mobileCameras = videoDevices;

        const select = document.getElementById('mobileCameraSelect');
        if (select) {
            select.innerHTML = '<option value="">Pilih Kamera...</option>';
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Kamera ${index + 1}`;
                select.appendChild(option);
            });
        }

        updateStatus(`Ditemukan ${videoDevices.length} kamera pada ponsel`);
    } catch (error) {
        console.error('Error listing cameras:', error);
        updateStatus('Error mendapatkan daftar kamera: ' + error.message);
    }
}

// Mulai kamera mobile
async function startMobileCamera(deviceId = null, facingMode = null) {
    try {
        const constraints = {
            video: {
                width: { ideal: window.innerWidth > 768 ? 1920 : 1280 },
                height: { ideal: window.innerHeight > 600 ? 1080 : 720 },
                facingMode: facingMode || CONFIG.currentFacingMode
            },
            audio: false
        };

        if (deviceId) {
            constraints.video.deviceId = { exact: deviceId };
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('mobileCamera');

        if (videoElement) {
            videoElement.srcObject = stream;
            updateStatus(`Kamera ponsel aktif (${facingMode || CONFIG.currentFacingMode})`);
        }

        return stream;
    } catch (error) {
        console.error('Error mobile camera:', error);
        updateStatus('Error kamera ponsel: ' + error.message);
    }
}

// Stop kamera mobile
function stopMobileCamera() {
    const videoElement = document.getElementById('mobileCamera');
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
        updateStatus('Kamera ponsel dihentikan');
    }
}

// Ganti antara kamera depan dan belakang
async function toggleCameraFacing() {
    try {
        const videoElement = document.getElementById('mobileCamera');
        if (videoElement && videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        CONFIG.currentFacingMode = CONFIG.currentFacingMode === 'user' ? 'environment' : 'user';
        await startMobileCamera(null, CONFIG.currentFacingMode);

        updateStatus(`Beralih ke kamera ${CONFIG.currentFacingMode === 'user' ? 'depan (selfie)' : 'belakang'}`);
    } catch (error) {
        console.error('Error toggle camera:', error);
        updateStatus('Error mengganti kamera: ' + error.message);
    }
}

// Switch kamera berdasarkan deviceId
async function switchMobileCamera(deviceId) {
    if (!deviceId) return;

    try {
        const videoElement = document.getElementById('mobileCamera');
        if (videoElement && videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        await startMobileCamera(deviceId);
    } catch (error) {
        console.error('Error switch camera:', error);
        updateStatus('Error mengganti kamera: ' + error.message);
    }
}

// ===== REMOTE CONNECTION FUNCTIONS =====

// Initialize remote connection system
function initializeRemoteConnection() {
    // Simple WebRTC implementation for peer-to-peer connection
    // In production, use a proper signaling server
    CONFIG.serverId = generateServerId();
}

// Generate unique server ID
function generateServerId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start as remote server
function startRemoteServer() {
    try {
        CONFIG.isServer = true;
        CONFIG.serverId = generateServerId();

        document.getElementById('serverId').textContent = CONFIG.serverId;

        // Generate QR Code
        const qrCodeDiv = document.getElementById('serverQrCode');
        if (qrCodeDiv) {
            qrCodeDiv.innerHTML = '';
            new QRCode(qrCodeDiv, {
                text: CONFIG.serverId,
                width: 128,
                height: 128
            });
        }

        updateStatus(`Server aktif - ID: ${CONFIG.serverId}`);

        // Setup peer connection for receiving stream
        setupPeerConnection(true);
    } catch (error) {
        console.error('Error starting server:', error);
        updateStatus('Error memulai server: ' + error.message);
    }
}

// Connect to remote server
async function connectToRemote() {
    const serverId = document.getElementById('serverIdInput').value.trim();
    if (!serverId) {
        alert('Masukkan ID server!');
        return;
    }

    try {
        CONFIG.isServer = false;
        updateStatus(`Menghubungkan ke server ${serverId}...`);

        // Setup peer connection for sending stream
        await setupPeerConnection(false);

        // In a real implementation, this would connect to the signaling server
        // For demo purposes, we'll simulate the connection
        setTimeout(() => {
            updateStatus(`Terhubung ke server ${serverId}`);
            document.getElementById('connectionStatus').textContent = 'Terhubung';
        }, 1000);

    } catch (error) {
        console.error('Error connecting:', error);
        updateStatus('Error menghubungkan: ' + error.message);
    }
}

// Setup WebRTC peer connection
async function setupPeerConnection(isServer) {
    try {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        CONFIG.peerConnection = new RTCPeerConnection(configuration);

        if (isServer) {
            // Server receives stream
            CONFIG.peerConnection.ontrack = (event) => {
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = event.streams[0];
                }
                updateStatus('Menerima stream dari mobile');
            };
        } else {
            // Client sends stream
            const stream = await startMobileCamera();
            if (stream) {
                stream.getTracks().forEach(track => {
                    CONFIG.peerConnection.addTrack(track, stream);
                });
                updateStatus('Mengirim stream ke laptop');
            }
        }

        // Handle ICE candidates
        CONFIG.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // In real implementation, send to signaling server
                console.log('ICE candidate:', event.candidate);
            }
        };

    } catch (error) {
        console.error('Error setup peer connection:', error);
        updateStatus('Error koneksi peer: ' + error.message);
    }
}

// Share mobile stream to laptop
async function shareMobileStream() {
    try {
        // Switch to remote mode
        setMode('remote');

        // Start as client and connect
        const serverId = prompt('Masukkan ID server laptop:');
        if (serverId) {
            document.getElementById('serverIdInput').value = serverId;
            await connectToRemote();
        }
    } catch (error) {
        console.error('Error sharing stream:', error);
        updateStatus('Error berbagi stream: ' + error.message);
    }
}

// ===== ORIGINAL FUNCTIONS (UPDATED) =====

// Mulai kamera
async function startCamera(cameraId) {
    try {
        const camera = CONFIG.cameras.find(c => c.id === cameraId);
        if (!camera) return;

        const videoElement = document.getElementById(cameraId);
        if (!videoElement) return;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment'
            },
            audio: false
        });

        camera.streamUrl = stream;
        videoElement.srcObject = stream;

        updateStatus(`${camera.name} aktif`);
    } catch (error) {
        console.error(`Error ${cameraId}:`, error);
        updateStatus(`Error ${cameraId}: ${error.message}`);
    }
}

// Stop kamera
function stopCamera(cameraId) {
    const camera = CONFIG.cameras.find(c => c.id === cameraId);
    if (camera && camera.streamUrl) {
        const tracks = camera.streamUrl.getTracks();
        tracks.forEach(track => track.stop());
        camera.streamUrl = null;

        const videoElement = document.getElementById(cameraId);
        if (videoElement) {
            videoElement.srcObject = null;
        }

        updateStatus(`${camera.name} dihentikan`);
    }
}

// Toggle rekaman
function toggleRecording() {
    if (CONFIG.recording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Mulai rekaman
function startRecording() {
    const activeCamera = CONFIG.cameras.find(c => c.streamUrl);
    if (!activeCamera) {
        alert('Tidak ada kamera yang aktif untuk direkam');
        return;
    }

    try {
        const stream = activeCamera.streamUrl;
        CONFIG.mediaRecorder = new MediaRecorder(stream);
        CONFIG.recordedChunks = [];

        CONFIG.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                CONFIG.recordedChunks.push(event.data);
            }
        };

        CONFIG.mediaRecorder.onstop = () => {
            const blob = new Blob(CONFIG.recordedChunks, { type: 'video/webm' });
            downloadRecording(blob, activeCamera.name);
        };

        CONFIG.mediaRecorder.start();
        CONFIG.recording = true;
        updateRecordingStatus('Merekam...');
    } catch (error) {
        console.error('Error mulai rekaman:', error);
        alert('Error mulai rekaman: ' + error.message);
    }
}

// Stop rekaman
function stopRecording() {
    if (CONFIG.mediaRecorder && CONFIG.recording) {
        CONFIG.mediaRecorder.stop();
        CONFIG.recording = false;
        updateRecordingStatus('Berhenti');
    }
}

// Download rekaman
function downloadRecording(blob, cameraName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekaman-${cameraName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
}

// Screenshot
function captureScreenshot() {
    const activeCamera = CONFIG.cameras.find(c => c.streamUrl);
    if (!activeCamera) {
        alert('Tidak ada kamera yang aktif');
        return;
    }

    const video = document.getElementById(activeCamera.id);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${activeCamera.name}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/jpeg');
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Update status
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function updateRecordingStatus(message) {
    const recordingElement = document.getElementById('recordingStatus');
    if (recordingElement) {
        recordingElement.textContent = message;
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        toggleRecording();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        captureScreenshot();
    }
});

// Auto-start jika sudah login
window.addEventListener('load', function () {
    if (window.location.hash === '#dashboard') {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        initializeSystem();
    }
});
