// Exploding Stars by user, adapted for Shader Sequencer

const source = `
#define PI 3.14159265359
#define MAX_STARS 15
#define MAX_PARTICLES 30

// Hash function for pseudo-random values
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

// Star structure
struct Star {
    vec2 position;
    float size;
    float explosionTime;
    float lifespan;
    vec3 color;
};

// Generate a star
Star getStar(float index, float time) {
    float seed = index * 123.456 + floor(time * 0.1);
    float h1 = hash(seed);
    float h2 = hash(seed + 1.0);
    float h3 = hash(seed + 2.0);
    float h4 = hash(seed + 3.0);
    float h5 = hash(seed + 4.0);
    
    Star star;
    star.position = vec2(h1, h2);
    star.size = 0.01 + h3 * 0.03;
    // Bass makes explosions happen sooner and faster
    star.explosionTime = 5.0 + h4 * (15.0 - iAudio.x * 10.0);
    star.lifespan = 2.0 + h5 * 3.0 - iAudio.x * 1.5;
    
    float hue = h5 * 0.8 + 0.2;
    vec3 col;
    col.r = abs(hue * 6.0 - 3.0) - 1.0;
    col.g = 2.0 - abs(hue * 6.0 - 2.0);
    col.b = 2.0 - abs(hue * 6.0 - 4.0);
    star.color = clamp(col, 0.0, 1.0);
    
    return star;
}

// Particle effect for explosion
vec3 explodeParticle(vec2 uv, vec2 center, float time, float seed) {
    float h1 = hash(seed);
    float h2 = hash(seed + 1.0);
    float h3 = hash(seed + 2.0);
    
    float angle = h1 * 2.0 * PI;
    // Bass makes particles faster, mids add chaos
    float speed = 0.1 + h2 * 0.3 + iAudio.x * 0.2;
    // Highs make particles bigger
    float size = 0.002 + h3 * 0.005 + iAudio.z * 0.005;
    
    vec2 dir = vec2(cos(angle), sin(angle));
    dir += vec2(noise(center*10.0 + seed) - 0.5, noise(center*10.0 - seed) - 0.5) * iAudio.y * 2.0;
    vec2 pos = center + normalize(dir) * speed * time;
    
    float alpha = 1.0 - smoothstep(0.0, 1.0, time);
    float d = length(uv - pos) - size * (1.0 - time * 0.5);
    
    vec3 color = mix(vec3(1.0, 0.9, 0.5), vec3(0.9, 0.2, 0.1), time);
    
    return color * smoothstep(0.001, 0.0, d) * alpha;
}

// Star rendering
vec3 renderStar(vec2 uv, Star star, float time) {
    float modTime = mod(time, star.explosionTime + star.lifespan);
    
    if (modTime > star.explosionTime) {
        float explosionProgress = (modTime - star.explosionTime) / star.lifespan;
        
        vec3 particleColor = vec3(0.0);
        for (int i = 0; i < MAX_PARTICLES; i++) {
            float particleSeed = float(i) + star.position.x * 1000.0 + star.position.y * 100.0;
            particleColor += explodeParticle(uv, star.position, explosionProgress, particleSeed);
        }
        return particleColor;
    } else {
        float pulse = 1.0 + 0.2 * sin(modTime * 3.0);
        float preExplosionGlow = smoothstep(0.0, 0.2, modTime / star.explosionTime);
        float size = star.size * pulse * (1.0 + preExplosionGlow);
        float d = length(uv - star.position) - size;
        
        float glow = 0.02 / (0.001 + abs(d));
        vec3 starColor = star.color * glow;
        
        // Highs boost brightness before explosion
        float brightness = 1.0 + 2.0 * smoothstep(0.8, 1.0, modTime / star.explosionTime) + iAudio.z * 2.0;
        
        return starColor * brightness;
    }
}

// Background star field
vec3 starfield(vec2 uv, float time) {
    vec3 color = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        float scale = 20.0 + float(i) * 30.0;
        vec2 p = uv * scale;
        float n = noise(p + time * 0.1);
        if (n > 0.97) {
            float brightness = (n - 0.97) * 33.0;
            color += vec3(brightness * 0.5);
        }
    }
    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;
    
    // Overall volume controls time
    float time = iTime * (0.5 + iAudio.w * 1.0);
    
    vec3 color = vec3(0.02, 0.02, 0.05);
    
    // Mids shift nebula color
    float nebula = noise(uv * 3.0 + time * 0.01) * noise(uv * 2.0 - time * 0.015);
    color += vec3(0.05 + iAudio.y * 0.1, 0.0, 0.1) * nebula;
    
    color += starfield(uv, time);
    
    vec2 mousePos = iMouse.xy / iResolution.xy;
    mousePos.x *= iResolution.x / iResolution.y;
    float mouseInfluence = 0.1 / (0.1 + length(uv - mousePos));
    
    for (int i = 0; i < MAX_STARS; i++) {
        Star star = getStar(float(i), time);
        
        vec2 dir = mousePos - star.position;
        star.position += normalize(dir) * 0.01 * mouseInfluence;
        
        color += renderStar(uv, star, time);
    }
    
    color += vec3(0.1, 0.05, 0.2) * mouseInfluence * 0.5;
    
    color = color / (1.0 + color);
    
    fragColor = vec4(color, 1.0);
}
`;
// FIX: Added default export to make the file a module.
export default source;