// WebGL Renderer for SkyDash
// Uses SDF (Signed Distance Fields) for procedural graphics

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!this.gl) {
            console.warn('WebGL not supported, falling back to Canvas');
            this.useWebGL = false;
            return;
        }

        this.useWebGL = true;
        this.time = 0;

        // Game state uniforms
        this.uniforms = {
            playerX: 0,
            playerY: 0,
            playerDir: 1,
            cameraY: 0,
            energy: 1.0,
            isFalling: 0,
            fallRotation: 0,
            flashIntensity: 0,
            bgColor: [0.12, 0.24, 0.45],
            stairColor: [0.18, 0.84, 0.45],
            charColor: [0.95, 0.61, 0.07]
        };

        // Stair positions (max 30)
        this.stairs = new Float32Array(30 * 2); // x, y pairs
        this.stairCount = 0;

        this.init();
    }

    init() {
        const gl = this.gl;

        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader link error:', gl.getProgramInfoLog(this.program));
            this.useWebGL = false;
            return;
        }

        gl.useProgram(this.program);

        // Create fullscreen quad
        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Get uniform locations
        this.uniformLocs = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            playerPos: gl.getUniformLocation(this.program, 'u_playerPos'),
            playerDir: gl.getUniformLocation(this.program, 'u_playerDir'),
            cameraY: gl.getUniformLocation(this.program, 'u_cameraY'),
            energy: gl.getUniformLocation(this.program, 'u_energy'),
            isFalling: gl.getUniformLocation(this.program, 'u_isFalling'),
            fallRotation: gl.getUniformLocation(this.program, 'u_fallRotation'),
            flashIntensity: gl.getUniformLocation(this.program, 'u_flashIntensity'),
            bgColor: gl.getUniformLocation(this.program, 'u_bgColor'),
            stairColor: gl.getUniformLocation(this.program, 'u_stairColor'),
            charColor: gl.getUniformLocation(this.program, 'u_charColor'),
            stairs: gl.getUniformLocation(this.program, 'u_stairs'),
            stairCount: gl.getUniformLocation(this.program, 'u_stairCount')
        };
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.gl) {
            this.gl.viewport(0, 0, width, height);
        }
    }

    setUniforms(state) {
        Object.assign(this.uniforms, state);
    }

    setStairs(stairs, playerGridX) {
        this.stairCount = Math.min(stairs.length, 30);
        for (let i = 0; i < this.stairCount; i++) {
            this.stairs[i * 2] = (stairs[i].x - playerGridX) * 100; // Relative X
            this.stairs[i * 2 + 1] = stairs[i].y * 80; // World Y
        }
    }

    render(dt) {
        if (!this.useWebGL) return;

        const gl = this.gl;
        this.time += dt;

        // Set uniforms
        gl.uniform2f(this.uniformLocs.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniformLocs.time, this.time);
        gl.uniform2f(this.uniformLocs.playerPos, this.uniforms.playerX, this.uniforms.playerY);
        gl.uniform1f(this.uniformLocs.playerDir, this.uniforms.playerDir);
        gl.uniform1f(this.uniformLocs.cameraY, this.uniforms.cameraY);
        gl.uniform1f(this.uniformLocs.energy, this.uniforms.energy);
        gl.uniform1f(this.uniformLocs.isFalling, this.uniforms.isFalling);
        gl.uniform1f(this.uniformLocs.fallRotation, this.uniforms.fallRotation);
        gl.uniform1f(this.uniformLocs.flashIntensity, this.uniforms.flashIntensity);
        gl.uniform3fv(this.uniformLocs.bgColor, this.uniforms.bgColor);
        gl.uniform3fv(this.uniformLocs.stairColor, this.uniforms.stairColor);
        gl.uniform3fv(this.uniformLocs.charColor, this.uniforms.charColor);
        gl.uniform2fv(this.uniformLocs.stairs, this.stairs);
        gl.uniform1i(this.uniformLocs.stairCount, this.stairCount);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
