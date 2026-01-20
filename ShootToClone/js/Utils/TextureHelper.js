import * as THREE from 'three';

export class TextureHelper {
    static createPlusOneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Rounded Rect Background (Orange for visibility against green player)
        const radius = 40;
        ctx.fillStyle = '#ff8800';  // 주황색 배경
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

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 15;
        ctx.stroke();

        // White Text "+1"
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+1', 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
}
