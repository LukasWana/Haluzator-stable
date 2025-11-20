const source = `
// Based on user-provided code, adapted for Shader Sequencer.

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001
#define PI 3.14159265359

// Rotation matrix
mat2 rot2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// 3D Simplex noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// FBM (Fractal Brownian Motion)
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// SDF for a sphere with water-like displacement
float waterSphere(vec3 p, float radius) {
    float time = iTime * 0.5;
    float displacement = 0.0;
    displacement += 0.05 * fbm(vec3(p * 4.0 + time), 3);
    displacement += 0.03 * sin(p.x * 10.0 + time) * sin(p.y * 8.0 + time * 0.7) * sin(p.z * 9.0 + time * 0.8);
    displacement += iAudio.x * 0.1; // Bass adds displacement
    return length(p) - (radius + displacement);
}

// Distance function
float getDist(vec3 p) {
    float time = iTime;
    p.xz *= rot2D(time * (0.3 + iAudio.w * 0.2));
    p.yz *= rot2D(time * (0.2 + iAudio.w * 0.15));
    float sphere = waterSphere(p, 0.5);
    return sphere;
}

// Normal calculation
vec3 getNormal(vec3 p) {
    float d = getDist(p);
    vec2 e = vec2(0.001, 0.0);
    vec3 n = d - vec3(
        getDist(p - e.xyy),
        getDist(p - e.yxy),
        getDist(p - e.yyx)
    );
    return normalize(n);
}

// Raymarching
float rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO;
        float dS = getDist(p);
        dO += dS;
        if (dO > MAX_DIST || abs(dS) < SURF_DIST) break;
    }
    return dO;
}

// Rainbow color function
vec3 rainbow(float t) {
    t = fract(t);
    if (t < 0.167) return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.5, 0.0), t * 6.0);
    if (t < 0.333) return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.167) * 6.0);
    if (t < 0.5) return mix(vec3(1.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), (t - 0.333) * 6.0);
    if (t < 0.667) return mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), (t - 0.5) * 6.0);
    if (t < 0.833) return mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 0.0, 1.0), (t - 0.667) * 6.0);
    return mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), (t - 0.833) * 6.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 v_uv = fragCoord.xy / iResolution.xy;
    vec2 uv = v_uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    
    // Setup camera
    vec3 ro = vec3(0.0, 0.0, 2.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    
    // Raymarch
    float d = rayMarch(ro, rd);
    vec3 col = vec3(0.0);
    
    // Deep blue background
    vec3 bgCol = vec3(0.0, 0.05, 0.1);
    
    if (d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = getNormal(p);
        
        // Basic lighting
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0) * (1.0 + iAudio.z * 1.5);
        
        // Rainbow coloring based on normal and time
        float rainbowFactor = (n.x + n.y + n.z) * 0.333 + iTime * (0.1 + iAudio.y * 0.2);
        vec3 rainbowCol = rainbow(rainbowFactor);
        
        // Water effect
        float water = fbm(p * 2.0 + iTime * 0.1, 2);
        float shine = pow(max(0.0, 1.0 - abs(dot(n, rd))), 5.0) * 0.5;
        
        // Combine colors
        col = rainbowCol * (diff * 0.7 + 0.3);
        col += vec3(0.8, 0.9, 1.0) * spec * 0.7;
        col += vec3(0.2, 0.4, 0.8) * water * 0.3;
        col += vec3(1.0) * shine;
        
        // Add depth
        col = mix(bgCol, col, exp(-d * 0.2));
    } else {
        col = bgCol;
    }
    
    // Apply gamma correction
    col = pow(col, vec3(0.4545));
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;