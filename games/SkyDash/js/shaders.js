// GLSL Shader Code for SkyDash
// SDF-based rendering with procedural effects

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_playerPos;
uniform float u_playerDir;
uniform float u_cameraY;
uniform float u_energy;
uniform float u_isFalling;
uniform float u_fallRotation;
uniform float u_flashIntensity;
uniform vec3 u_bgColor;
uniform vec3 u_stairColor;
uniform vec3 u_charColor;
uniform vec2 u_stairs[30];
uniform int u_stairCount;

// ===== SDF Primitives =====
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// ===== Operations =====
float opUnion(float d1, float d2) { return min(d1, d2); }
float opSubtract(float d1, float d2) { return max(-d1, d2); }

float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

// ===== Noise =====
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// ===== Rotate =====
vec2 rotate(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// ===== Character SDF =====
float sdCharacter(vec2 p, float dir, float time, float isFalling, float fallRot) {
    // Apply falling rotation
    if (isFalling > 0.5) {
        p = rotate(p, fallRot);
    }
    
    // Flip for direction
    p.x *= dir;
    
    // Animation
    float bounce = sin(time * 8.0) * 3.0;
    if (isFalling > 0.5) bounce = 0.0;
    
    // Head
    float head = sdCircle(p - vec2(0.0, 45.0 + bounce), 18.0);
    
    // Hair (ponytail)
    float hair = sdCircle(p - vec2(0.0, 52.0 + bounce), 16.0);
    float ponytail = sdCapsule(p, vec2(-5.0, 50.0 + bounce), vec2(-25.0, 30.0 + bounce), 8.0);
    hair = opSmoothUnion(hair, ponytail, 5.0);
    
    // Body
    float body = sdRoundedBox(p - vec2(0.0, 15.0 + bounce), vec2(12.0, 20.0), 5.0);
    
    // Legs
    float legOffset = isFalling > 0.5 ? sin(time * 15.0) * 10.0 : 0.0;
    float leg1 = sdCapsule(p, vec2(-6.0, -5.0 + bounce), vec2(-8.0 + legOffset, -35.0), 5.0);
    float leg2 = sdCapsule(p, vec2(6.0, -5.0 + bounce), vec2(8.0 - legOffset, -35.0), 5.0);
    
    // Combine
    float character = opSmoothUnion(head, body, 3.0);
    character = opSmoothUnion(character, leg1, 2.0);
    character = opSmoothUnion(character, leg2, 2.0);
    
    return character;
}

// ===== Platform SDF =====
float sdPlatform(vec2 p, vec2 pos) {
    vec2 local = p - pos;
    
    // Grass top
    float grass = sdRoundedBox(local - vec2(0.0, 5.0), vec2(45.0, 8.0), 4.0);
    
    // Dirt bottom
    float dirt = sdRoundedBox(local - vec2(0.0, -8.0), vec2(40.0, 10.0), 3.0);
    
    return opSmoothUnion(grass, dirt, 2.0);
}

// ===== Main =====
void main() {
    // Convert to pixel coordinates (centered, Y-up)
    vec2 uv = v_uv;
    vec2 resolution = u_resolution;
    float aspect = resolution.x / resolution.y;
    
    // Normalize to game coordinates (720x1280 logical)
    vec2 p = vec2(
        (uv.x - 0.5) * 720.0,
        (uv.y - 0.5) * 1280.0
    );
    
    // Apply camera
    p.y += u_cameraY - 200.0;
    
    // ===== Background =====
    vec3 bgTop = u_bgColor * 0.6;
    vec3 bgBot = u_bgColor * 1.4;
    vec3 color = mix(bgBot, bgTop, uv.y);
    
    // Procedural clouds
    vec2 cloudUV = vec2(p.x * 0.002, (p.y - u_time * 30.0) * 0.001);
    float cloud = fbm(cloudUV * 3.0);
    cloud = smoothstep(0.4, 0.7, cloud);
    color = mix(color, vec3(1.0), cloud * 0.15);
    
    // Stars (subtle)
    float star = hash(floor(p * 0.02));
    star = step(0.995, star) * (sin(u_time * 3.0 + star * 100.0) * 0.5 + 0.5);
    color += vec3(star) * 0.3;
    
    // ===== Platforms =====
    for (int i = 0; i < 30; i++) {
        if (i >= u_stairCount) break;
        
        vec2 stairPos = vec2(u_stairs[i * 2], u_stairs[i * 2 + 1]);
        stairPos.y -= u_cameraY;
        stairPos.y = -stairPos.y + 400.0; // Flip Y
        
        float d = sdPlatform(p, stairPos);
        
        // Soft shadow
        float shadow = smoothstep(0.0, 40.0, d);
        color *= 0.7 + 0.3 * shadow;
        
        // Platform color
        if (d < 0.0) {
            // Grass top detection
            vec2 local = p - stairPos;
            if (local.y > 0.0) {
                color = u_stairColor;
            } else {
                color = vec3(0.55, 0.27, 0.07); // Dirt
            }
        }
        
        // Glow outline
        float glow = smoothstep(5.0, 0.0, abs(d));
        color += u_stairColor * glow * 0.3;
    }
    
    // ===== Character =====
    vec2 charPos = vec2(0.0, 400.0 - u_playerPos.y + u_cameraY);
    float charDist = sdCharacter(p - charPos, u_playerDir, u_time, u_isFalling, u_fallRotation);
    
    // Character shadow
    float charShadow = sdCharacter(p - charPos + vec2(5.0, -10.0), u_playerDir, u_time, u_isFalling, u_fallRotation);
    color *= 0.7 + 0.3 * smoothstep(0.0, 30.0, charShadow);
    
    // Character body
    if (charDist < 0.0) {
        // Head area
        vec2 localChar = p - charPos;
        if (u_playerDir < 0.0) localChar.x *= -1.0;
        
        float headCheck = sdCircle(localChar - vec2(0.0, 45.0), 18.0);
        float hairCheck = sdCircle(localChar - vec2(0.0, 52.0), 16.0);
        float ponytailCheck = sdCapsule(localChar, vec2(-5.0, 50.0), vec2(-25.0, 30.0), 8.0);
        
        if (headCheck < 0.0) {
            color = vec3(1.0, 0.88, 0.74); // Skin
            
            // Eye
            float eye = sdCircle(localChar - vec2(8.0, 48.0), 3.0);
            if (eye < 0.0) {
                color = u_isFalling > 0.5 ? vec3(1.0) : vec3(0.2);
            }
        } else if (hairCheck < 0.0 || ponytailCheck < 0.0) {
            color = vec3(0.91, 0.30, 0.24); // Red hair
        } else {
            color = u_charColor; // Body color
        }
    }
    
    // Character glow
    float charGlow = smoothstep(8.0, 0.0, abs(charDist));
    color += u_charColor * charGlow * 0.4;
    
    // ===== Effects =====
    // Energy bar flash when low
    if (u_energy < 0.3) {
        float pulse = sin(u_time * 10.0) * 0.5 + 0.5;
        color = mix(color, vec3(1.0, 0.2, 0.2), pulse * 0.2);
    }
    
    // Screen flash
    color = mix(color, vec3(1.0), u_flashIntensity);
    
    // Vignette
    float vignette = 1.0 - length((uv - 0.5) * 1.2);
    vignette = smoothstep(0.0, 0.7, vignette);
    color *= vignette;
    
    gl_FragColor = vec4(color, 1.0);
}
`;
