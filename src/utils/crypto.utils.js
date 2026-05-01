const crypto = require('crypto');
const config = require('../config/config');

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(config.ENCRYPTION_KEY || 'default-secret-key-change-me', 'salt', 32);
const iv = Buffer.alloc(16, 0); // For simplicity, using a fixed IV. In production, use a random IV and store it with the ciphertext.

function encrypt(text) {
    if (!text) return text;
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(text) {
    if (!text) return text;
    try {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return text; // Return as is if decryption fails (e.g. if it wasn't encrypted)
    }
}

module.exports = { encrypt, decrypt };
