
const source = `
// Original GLSL shader "Magic Mushroom Tunnel", adapted for Shader Sequencer

#define PI 3.14159265359
#define MAX_DIST 100.0
#define SURF_DIST 0.001

// Rotation matrix
mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Noise functions
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = p.x + p.y * 57.0 + p.z * 113.0;
    return mix(
        mix(
            mix(hash(n), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x),
            f.y),
        mix(
            mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 170.0), hash(n + 171.0), f.x),
            f.y),
        f.z);
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(int i = 0; i < 5; i++) {
        f += amp * noise(freq * p);
        amp *= 0.5;
        freq *= 2.0;
    }
    return f;
}

// SDF primitives
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    vec3 ap = p - a;
    float t = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
    vec3 c = a + t * ab;
    return length(p - c) - r;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Mushroom SDF
float sdMushroom(vec3 p, float size) {
    // Cap
    float cap = sdSphere(vec3(p.x, p.y - size * 0.2, p.z), size * 0.5);
    cap = max(cap, p.y - size * 0.2);
    
    // Stem
    float stem = sdCapsule(p, vec3(0.0, -size * 0.5, 0.0), vec3(0.0, size * 0.2, 0.0), size * 0.15);
    
    // Combine
    return min(cap, stem);
}

// Small mushroom SDF
float sdSmallMushroom(vec3 p, float size) {
    // Move to origin
    vec3 q = p;
    
    // Cap
    float cap = sdSphere(vec3(q.x, q.y - size * 0.05, q.z), size * 0.15);
    cap = max(cap, q.y - size * 0.05);
    
    // Stem
    float stem = sdCapsule(q, vec3(0.0, -size * 0.15, 0.0), vec3(0.0, size * 0.05, 0.0), size * 0.05);
    
    // Combine
    return min(cap, stem);
}

// Scene SDF
float map(vec3 p) {
    // Tunnel
    float tunnelRadius = 2.0 + 0.3 * sin(p.z * 0.2 + iTime * 0.5) + iAudio.x * 0.5;
    vec3 tunnelP = p;
    tunnelP.xy *= rot(p.z * 0.1);
    float tunnel = -sdTorus(vec3(tunnelP.xy, mod(tunnelP.z, 4.0) - 2.0), vec2(tunnelRadius, 0.5));
    
    // Main mushroom path
    float mushPath = 999.0;
    for(int i = 0; i < 5; i++) {
        float z = float(i) * 10.0 - mod(iTime * 5.0, 10.0);
        if(p.z > z && p.z < z + 20.0) {
            vec3 mp = p - vec3(0.0, -0.5, z + 5.0);
            mp.xz *= rot(z * 0.1 + iTime * 0.2);
            float m = sdMushroom(mp, 1.0 + 0.2 * sin(z * 0.5 + iTime));
            mushPath = min(mushPath, m);
        }
    }
    
    // Small mushrooms along the way
    float smallMushrooms = 999.0;
    for(int i = 0; i < 8; i++) {
        float angle = float(i) * PI * 0.25;
        vec3 mp = p - vec3(tunnelRadius * 0.8 * cos(angle), tunnelRadius * 0.8 * sin(angle), mod(p.z + float(i) * 1.5, 20.0));
        mp.xy *= rot(mp.z * 0.2 + iTime * 0.3);
        float m = sdSmallMushroom(mp, 0.3 + 0.1 * sin(angle + iTime + p.z * 0.1));
        smallMushrooms = min(smallMushrooms, m);
    }
    
    return min(min(tunnel, mushPath), smallMushrooms);
}

// Normal calculation
vec3 getNormal(vec3 p) {
    const float h = 0.001;
    const vec2 k = vec2(1, -1);
    return normalize(
        k.xyy * map(p + k.xyy * h) +
        k.yxy * map(p + k.yxy * h) +
        k.yyx * map(p + k.yyx * h) +
        k.xxx * map(p + k.xxx * h)
    );
}

// Rainbow color function
vec3 rainbow(float t) {
    vec3 c = 0.5 + 0.5 * cos(6.28318 * (t * vec3(1.0, 0.8, 0.6) + vec3(0.0, 0.2, 0.4)));
    return c * c;
}

// Fractal background
vec3 fractalBackground(vec2 uv, float time) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= iResolution.x / iResolution.y;
    
    vec2 z = p;
    vec2 c = p * 0.8 + vec2(sin(time * 0.3) * 0.2, cos(time * 0.2) * 0.3);
    
    float iter = 0.0;
    
    for(float i = 0.0; i < 12.0; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if(length(z) > 2.0) break;
        iter++;
    }
    
    float t = iter / 12.0;
    vec3 color = rainbow(t + time * 0.1 + iAudio.y * 0.5);
    return color * (0.5 + 0.5 * sin(time * 0.2));
}

// Ray marching
vec4 rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;
    float dS = 0.0;
    vec3 color = vec3(0.0);
    float glow = 0.0;
    
    int MAX_STEPS = int(mix(40.0, 100.0, u_quality));

    for(int i = 0; i < 100; i++) {
        if (i >= MAX_STEPS) break;
        vec3 p = ro + rd * dO;
        dS = map(p);
        
        glow += (0.1 + iAudio.z * 0.2) / (1.0 + dS * dS * 20.0);
        
        dO += dS;
        
        if(dS < SURF_DIST || dO > MAX_DIST) break;
    }
    
    if(dS < SURF_DIST) {
        vec3 p = ro + rd * dO;
        vec3 n = getNormal(p);
        
        vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
        float diff = max(dot(n, lightDir), 0.0);
        
        vec3 material = rainbow(p.z * 0.05 + iTime * 0.1);
        
        material *= 0.8 + 0.2 * sin(p.z * 2.0 + iTime);
        material += 0.2 * fbm(p * 2.0 + iTime * 0.5);
        
        color = material * (0.3 + 0.7 * diff);
        
        color += glow * rainbow(p.z * 0.02 + iTime * 0.2) * 0.3;
        
        return vec4(color, 1.0 - dO / MAX_DIST);
    }
    
    vec2 uv = ro.xy + rd.xy * (MAX_DIST * 0.5);
    vec3 bgColor = fractalBackground(uv * 0.1 + 0.5, iTime);
    color = bgColor + glow * rainbow(rd.z * 0.1 + iTime * 0.2);
    
    return vec4(color, 1.0 - dO / MAX_DIST);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uvCentered = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    
    vec3 ro = vec3(0.0, 0.0, iTime * (2.0 + iAudio.w * 3.0));
    
    vec3 rd = normalize(vec3(uvCentered, 1.0));
    
    rd.xz *= rot(sin(iTime * 0.2) * 0.1);
    rd.yz *= rot(cos(iTime * 0.15) * 0.1);
    
    vec4 traced = rayMarch(ro, rd);
    vec3 color = traced.rgb;
    
    float vignette = 1.0 - dot(uvCentered*0.5, uvCentered*0.5);
    color *= vignette;
    
    color = mix(vec3(0.0), color, traced.a);
    
    color = pow(color, vec3(0.4545));
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;
