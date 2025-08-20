const crypto = require('crypto');
const WhatsAppService = require('./whatsapp-service');

class WhatsAppAuth {
    constructor() {
        this.whatsapp = new WhatsAppService();
        this.activeSessions = new Map();
        this.pendingCodes = new Map();
        this.userCameras = new Map();
    }

    // Generate 6-digit verification code
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Request verification code via WhatsApp
    async requestVerificationCode(phoneNumber) {
        try {
            const cleanNumber = this.whatsapp.validatePhoneNumber(phoneNumber);
            if (!cleanNumber) {
                throw new Error('Nomor WhatsApp tidak valid');
            }

            const code = this.generateVerificationCode();
            const expiry = Date.now() + (5 * 60 * 1000); // 5 minutes

            this.pendingCodes.set(cleanNumber, {
                code: code,
                expiry: expiry,
                attempts: 0
            });

            await this.whatsapp.sendAuthCode(cleanNumber, code);
            return {
                success: true,
                message: 'Kode verifikasi telah dikirim via WhatsApp',
                phoneNumber: cleanNumber
            };
        } catch (error) {
            console.error('Error requesting verification code:', error);
            throw error;
        }
    }

    // Verify the code
    async verifyCode(phoneNumber, code) {
        try {
            const cleanNumber = this.whatsapp.validatePhoneNumber(phoneNumber);
            if (!cleanNumber) {
                throw new Error('Nomor WhatsApp tidak valid');
            }

            const pending = this.pendingCodes.get(cleanNumber);
            if (!pending) {
                throw new Error('Tidak ada kode yang tertunda untuk nomor ini');
            }

            if (Date.now() > pending.expiry) {
                this.pendingCodes.delete(cleanNumber);
                throw new Error('Kode verifikasi telah kadaluarsa');
            }

            if (pending.code !== code) {
                pending.attempts++;
                throw new Error('Kode verifikasi salah');
            }

            // Code is valid, create session
            const sessionId = this.createSession(cleanNumber);
            this.pendingCodes.delete(cleanNumber);
            return {
                success: true,
                sessionId: sessionId,
                message: 'Verifikasi berhasil'
            };
        } catch (error) {
            console.error('Error verifying code:', error);
            throw error;
        }
    }

    // Create user session
    createSession(phoneNumber) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

        this.activeSessions.set(sessionId, {
            phoneNumber: phoneNumber,
            expiry: expiry,
            cameras: [],
            createdAt: Date.now()
        });

        return sessionId;
    }

    // Validate session
    validateSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return null;
        }

        if (Date.now() > session.expiry) {
            this.activeSessions.delete(sessionId);
            return null;
        }

        return session;
    }

    // Add camera to user
    addUserCamera(sessionId, cameraId, cameraName) {
        const session = this.validateSession(sessionId);
        if (!session) {
            throw new Error('Sesi tidak valid atau telah kadaluarsa');
        }

        const phoneNumber = session.phoneNumber;

        if (!this.userCameras.has(phoneNumber)) {
            this.userCameras.set(phoneNumber, []);
        }

        const cameras = this.userCameras.get(phoneNumber);
        const existing = cameras.find(c => c.id === cameraId);

        if (!existing) {
            cameras.push({
                id: cameraId,
                name: cameraName,
                addedAt: Date.now(),
                accessToken: this.whatsapp.generateAccessToken(phoneNumber, cameraId)
            });
        }

        return cameras;
    }

    // Get user cameras
    getUserCameras(sessionId) {
        const session = this.validateSession(sessionId);
        if (!session) {
            return [];
        }

        return this.userCameras.get(session.phoneNumber) || [];
    }

    // Get camera access token
    getCameraAccessToken(sessionId, cameraId) {
        const session = this.validateSession(sessionId);
        if (!session) {
            return null;
        }

        const cameras = this.userCameras.get(session.phoneNumber) || [];
        const camera = cameras.find(c => c.id === cameraId);

        return camera ? camera.accessToken : null;
    }

    // Generate camera access URL
    generateCameraAccessUrl(sessionId, cameraId, baseUrl) {
        const token = this.getCameraAccessToken(sessionId, cameraId);
        if (!token) {
            return null;
        }

        return `${baseUrl}/whatsapp-camera/${token}`;
    }

    // Clean expired sessions
    cleanupExpiredSessions() {
        const now = Date.now();

        for (const [sessionId, session] of this.activeSessions) {
            if (now > session.expiry) {
                this.activeSessions.delete(sessionId);
            }
        }

        for (const [phoneNumber, pending] of this.pendingCodes) {
            if (now > pending.expiry) {
                this.pendingCodes.delete(phoneNumber);
            }
        }
    }

    // Get session statistics
    getStats() {
        return {
            activeSessions: this.activeSessions.size,
            pendingCodes: this.pendingCodes.size,
            totalUsers: this.userCameras.size
        };
    }

    // Revoke session
    revokeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            return true;
        }
        return false;
    }

    // Get user info by access token
    getUserByAccessToken(token) {
        for (const [phoneNumber, cameras] of this.userCameras) {
            const camera = cameras.find(c => c.accessToken === token);
            if (camera) {
                return {
                    phoneNumber: phoneNumber,
                    camera: camera
                };
            }
        }
        return null;
    }
}

module.exports = WhatsAppAuth;
