const axios = require('axios');
const crypto = require('crypto');

class WhatsAppService {
    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'whatsapp-camera-verify';
    }

    // Verify WhatsApp webhook
    verifyWebhook(mode, token, challenge) {
        if (mode && token) {
            if (mode === 'subscribe' && token === this.verifyToken) {
                return challenge;
            }
        }
        return false;
    }

    // Send WhatsApp message
    async sendMessage(to, message, type = 'text') {
        try {
            const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            };

            let data;
            if (type === 'text') {
                data = {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: { body: message }
                };
            } else if (type === 'template') {
                data = {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'template',
                    template: {
                        name: message.template,
                        language: { code: 'id' },
                        components: message.components || []
                    }
                };
            }

            const response = await axios.post(url, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }

    // Send camera access link
    async sendCameraLink(phoneNumber, cameraId, accessUrl) {
        const message = `🔐 *Akses Kamera Keamanan*

Kamera Anda siap digunakan!
📱 Nomor: ${phoneNumber}
🎥 Kamera: ${cameraId}
🔗 Link Akses: ${accessUrl}

Klik link di atas untuk mengakses kamera Anda. Link ini akan kadaluarsa dalam 24 jam.

Jangan bagikan link ini dengan orang lain.`;

        return await this.sendMessage(phoneNumber, message);
    }

    // Send authentication code
    async sendAuthCode(phoneNumber, code) {
        const message = `🔐 *Kode Verifikasi Kamera*

Kode verifikasi Anda: *${code}*

Masukkan kode ini untuk mengakses kamera keamanan Anda.
Kode berlaku selama 5 menit.`;

        return await this.sendMessage(phoneNumber, message);
    }

    // Send motion alert
    async sendMotionAlert(phoneNumber, cameraName, timestamp) {
        const message = `🚨 *Peringatan Gerakan Terdeteksi*

Kamera: ${cameraName}
Waktu: ${new Date(timestamp).toLocaleString('id-ID')}
Status: Gerakan terdeteksi

Segera periksa kamera Anda untuk melihat aktivitas.`;

        return await this.sendMessage(phoneNumber, message);
    }

    // Send camera status update
    async sendStatusUpdate(phoneNumber, cameraName, status) {
        const statusEmoji = status === 'online' ? '🟢' : '🔴';
        const message = `${statusEmoji} *Status Kamera*

Kamera: ${cameraName}
Status: ${status.toUpperCase()}
Waktu: ${new Date().toLocaleString('id-ID')}`;

        return await this.sendMessage(phoneNumber, message);
    }

    // Generate unique camera access token
    generateAccessToken(phoneNumber, cameraId) {
        const data = `${phoneNumber}:${cameraId}:${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    // Validate phone number format
    validatePhoneNumber(phone) {
        // Remove all non-numeric characters
        const cleanNumber = phone.replace(/\D/g, '');

        // Check if it's Indonesian number format
        if (cleanNumber.startsWith('62') && cleanNumber.length >= 11) {
            return cleanNumber;
        } else if (cleanNumber.startsWith('0') && cleanNumber.length >= 10) {
            return '62' + cleanNumber.substring(1);
        }

        return null;
    }

    // Parse incoming webhook
    parseWebhook(body) {
        try {
            if (!body.entry || !body.entry[0] || !body.entry[0].changes) {
                return null;
            }

            const change = body.entry[0].changes[0];
            if (change.value && change.value.messages) {
                const message = change.value.messages[0];
                return {
                    from: message.from,
                    messageId: message.id,
                    timestamp: message.timestamp,
                    type: message.type,
                    text: message.text?.body || '',
                    button: message.button?.text || ''
                };
            }

            return null;
        } catch (error) {
            console.error('Error parsing webhook:', error);
            return null;
        }
    }
}

module.exports = WhatsAppService;
