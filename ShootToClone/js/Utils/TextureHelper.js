import * as THREE from 'three';

export class TextureHelper {
    static createPlusOneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Vibrant Gradient Background (Eye-catching!)
        const radius = 40;
        const gradient = ctx.createLinearGradient(0, 0, 256, 256);
        gradient.addColorStop(0, '#00ffff');    // Cyan
        gradient.addColorStop(0.5, '#ff00ff');  // Magenta
        gradient.addColorStop(1, '#ffff00');    // Yellow

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(256 - radius, 0);
        ctx.quadraticCurveTo(256, 0, 256, radius);
        ctx.lineTo(256, 256 - radius);
        ctx.quadraticCurveTo(256, 256, 256 - radius, 256);
        ctx.lineTo(radius, 256);
        ctx.quadraticCurveTo(0, 256, 0, 256 - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fill();

        // Extra Thick White Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 25; // Much thicker (20 -> 25)
        ctx.stroke();

        // White Text "+1" with shadow for maximum visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 140px Arial'; // Bigger text (120 -> 140)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+1', 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    static createCatFaceTexture(colorStr = '#ffffff') {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background (Face Color)
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 128, 128);

        // Eyes (Large, Cute, Black)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(35, 55, 10, 0, Math.PI * 2); // Left Eye
        ctx.arc(93, 55, 10, 0, Math.PI * 2); // Right Eye
        ctx.fill();

        // Eye Highlights (White sparkle)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 52, 3, 0, Math.PI * 2);
        ctx.arc(90, 52, 3, 0, Math.PI * 2);
        ctx.fill();

        // Nose (Small, Pink triangle)
        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.moveTo(56, 75);
        ctx.lineTo(72, 75);
        ctx.lineTo(64, 85);
        ctx.fill();

        // Mouth (W shape)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(64, 85);
        ctx.quadraticCurveTo(56, 95, 48, 85); // Left curve
        ctx.moveTo(64, 85);
        ctx.quadraticCurveTo(72, 95, 80, 85); // Right curve
        ctx.stroke();

        // Whiskers
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Left
        ctx.moveTo(10, 75); ctx.lineTo(40, 80);
        ctx.moveTo(10, 85); ctx.lineTo(40, 85);
        ctx.moveTo(10, 95); ctx.lineTo(40, 90);
        // Right
        ctx.moveTo(118, 75); ctx.lineTo(88, 80);
        ctx.moveTo(118, 85); ctx.lineTo(88, 85);
        ctx.moveTo(118, 95); ctx.lineTo(88, 90);
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    static createSquirrelFaceTexture(colorStr = '#d2691e') { // Chocolate/Brown
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 128, 128);

        // Eyes (Wide set, Black)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(30, 50, 8, 0, Math.PI * 2);
        ctx.arc(98, 50, 8, 0, Math.PI * 2);
        ctx.fill();

        // Highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(28, 48, 2, 0, Math.PI * 2);
        ctx.arc(96, 48, 2, 0, Math.PI * 2);
        ctx.fill();

        // Nose (Dark Brown Oval)
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.ellipse(64, 70, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Buck Teeth (White Rectangles)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(58, 75, 5, 8); // Left Tooth
        ctx.fillRect(65, 75, 5, 8); // Right Tooth

        // Tooth outline
        ctx.strokeStyle = '#c6c6c6';
        ctx.lineWidth = 1;
        ctx.strokeRect(58, 75, 5, 8);
        ctx.strokeRect(65, 75, 5, 8);

        return new THREE.CanvasTexture(canvas);
    }
}
