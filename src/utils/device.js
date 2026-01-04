import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'rummy_device_id';

/*
 * Generates a "Digital DNA" of the device using Canvas Fingerprinting.
 * This is effective for detecting "Same Machine, Different Browser".
 * Legitimacy: Standard Anti-Fraud practice.
 */
export const getHardwareSignature = () => {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;

        // Draw complex scene (Text + Gradient + Shapes)
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);

        ctx.fillStyle = "#069";
        ctx.fillText("Rummy_Secure_v1", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Rummy_Secure_v1", 4, 17);

        // Export to unique string (Base64)
        const dataURI = canvas.toDataURL();

        // Simple Hash Function (DJB2) to make it short
        let hash = 0;
        for (let i = 0; i < dataURI.length; i++) {
            const char = dataURI.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return String(Math.abs(hash));
    } catch (e) {
        return "unknown_device";
    }
};

export const getDeviceId = () => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};
