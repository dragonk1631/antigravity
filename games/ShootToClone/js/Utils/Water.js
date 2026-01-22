import * as THREE from 'three';

export class Water extends THREE.Mesh {
    constructor(width, height) {
        const geometry = new THREE.PlaneGeometry(width, height, 50, 50);
        geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

        const vertexShader = `
            uniform float time;
            varying vec2 vUv;
            varying float vElevation;

            void main() {
                vUv = uv;
                
                vec3 pos = position;
                
                // Simple sine wave displacement
                float elevation = sin(pos.x * 0.5 + time) * 0.5 
                                + sin(pos.z * 0.3 + time * 0.8) * 0.5;
                
                pos.y += elevation;
                vElevation = elevation;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 deepColor;
            uniform vec3 surfaceColor;
            
            varying float vElevation;

            void main() {
                // Mix colors based on elevation (wave height)
                float mixStrength = (vElevation + 1.0) * 0.5;
                vec3 color = mix(deepColor, surfaceColor, mixStrength);
                
                gl_FragColor = vec4(color, 0.9); // Slight transparency
            }
        `;

        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                time: { value: 0 },
                deepColor: { value: new THREE.Color(0x0066cc) }, // Deep Blue
                surfaceColor: { value: new THREE.Color(0x44aaff) } // Lighter Blue
            },
            transparent: true,
            side: THREE.DoubleSide
        });

        super(geometry, material);

        this.receiveShadow = true; // Water receives shadows
    }

    update(dt) {
        this.material.uniforms.time.value += dt;
    }
}
