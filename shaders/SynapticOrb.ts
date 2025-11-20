// Synaptic Orb by user, adapted for Shader Sequencer by AI

const source = `
precision mediump float;

#define NUM_RAYS 13.0
#define VOLUMETRIC_STEPS 19
#define MAX_ITER 35
#define FAR 6.0

// Procedural noise functions (replaces texture-based noise)
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = p.x + p.y * 157.0 + p.z * 113.0;
    return mix(
        mix(
            mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 157.0), hash(n + 158.0), f.x),
            f.y),
        mix(
            mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 270.0), hash(n + 271.0), f.x),
            f.y),
        f.z);
}

// Overload for 1D noise to fix compilation error
float noise(float x) {
    return noise(vec3(x, x * 0.5, x * 0.25));
}


mat2 mm2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

mat3 m3 = mat3(
    0.00, 0.80, 0.60,
    -0.80, 0.36, -0.48,
    -0.60, -0.48, 0.64
);

// This function now uses its time parameter 't' correctly and has added audio reactivity.
float flow(vec3 p, float t) {
    float z = 2.0;
    float rz = 0.0;
    vec3 bp = p;
    for (int i_int = 1; i_int < 5; i_int++) {
        float i = float(i_int);
        p += t * 0.1; // FIX: Use passed time 't' instead of global iTime.
        float noise_freq = 6.0 + iAudio.z * 4.0; // Highs make reflection noise finer.
        rz += (sin(noise(p + t * 0.8) * noise_freq) * 0.5 + 0.5) / z;
        p = mix(bp, p, 0.6);
        z *= 2.0;
        p *= 2.01;
        p *= m3;
    }
    return rz;
}

// This function now takes a time parameter and is more audio reactive.
float sins(float x, float time) {
    float rz = 0.0;
    float z = 2.0;
    for (int i_int = 0; i_int < 3; i_int++) {
        float i = float(i_int);
        rz += abs(fract(x * 1.4) - 0.5) / z;
        x *= 1.3;
        z *= 1.15;
        float speed_mod = 0.65 + iAudio.x * 0.5; // Bass makes tendrils move faster.
        x -= time * speed_mod * z; // FIX: Use passed time 'time' instead of global iTime.
    }
    return rz;
}

float segm(vec3 p, vec3 a, vec3 b) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) * 0.5;
}

// This function now takes a time parameter to pass to 'sins'.
vec3 path(float i, float d, float time) {
    vec3 en = vec3(0.0, 0.0, 1.0);
    float sns2 = sins(d + i * 0.5, time) * 0.22;
    float sns = sins(d + i * 0.6, time) * 0.21;
    en.xz *= mm2((hash(i * 10.569) - 0.5) * 6.2 + sns2);
    en.xy *= mm2((hash(i * 4.732) - 0.5) * 6.2 + sns);
    return en;
}

// This function now takes a time parameter to pass to 'map'.
vec2 map(vec3 p, float i, float time) {
    float lp = length(p);
    vec3 bg = vec3(0.0);
    vec3 en = path(i, lp, time);

    float ins = smoothstep(0.11, 0.46, lp);
    float outs = 0.15 + smoothstep(0.0, 0.15, abs(lp - 1.0));
    p *= ins * outs;
    float rz = segm(p, bg, en) - 0.011;
    return vec2(rz, ins * outs);
}

// This function now takes a time parameter to pass to 'map'.
float march(vec3 ro, vec3 rd, float startf, float maxd, float j, float time) {
    float precis = 0.001;
    float h = 0.5;
    float d = startf;
    for (int i = 0; i < MAX_ITER; i++) {
        if (abs(h) < precis || d > maxd) break;
        d += h * 1.2;
        float res = map(ro + rd * d, j, time).x;
        h = res;
    }
    return d;
}

// This function now uses its time parameter and uses it correctly.
vec3 vmarch(vec3 ro, vec3 rd, float j, vec3 orig, float time) {
    vec3 p = ro;
    vec3 sum = vec3(0.0);
    for (int i = 0; i < VOLUMETRIC_STEPS; i++) {
        vec2 r = map(p, j, time);
        p += rd * 0.03;
        float lp = length(p);
        vec3 col = sin(vec3(1.05, 2.5, 1.52) * 3.94 + r.y + iAudio.y * 2.0) * 0.85 + 0.4;
        col *= smoothstep(0.0, 0.015, -r.x);
        col *= smoothstep(0.04, 0.2, abs(lp - 1.1));
        col *= smoothstep(0.1, 0.34, lp);
        sum += abs(col) * 5.0 * (1.2 - noise(lp * 2.0 + j * 13.0 + time * 5.0) * 1.1) / 
               (log(distance(p, orig) - 2.0) + 0.75);
    }
    return sum;
}

vec2 iSphere2(vec3 ro, vec3 rd) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    return vec2((-b - sqrt(h)), (-b + sqrt(h)));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 mouse_norm = iMouse.xy / iResolution.xy;

    float f0 = mix(0.05, 0.95, mouse_norm.x);
    float f1 = mix(0.5, 0.95, mouse_norm.y);
    float f2 = mix(0.05, 0.95, length(mouse_norm - 0.5) * 1.4);
    
    float time = iTime * (1.0 + iAudio.w * 0.5);
    
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 ro = vec3(0.0, 0.0, 5.0 / f2);
    vec3 rd = normalize(vec3(p * 0.7, -1.5));
    
    mat2 mx = mm2(time * 0.4 + f0 * 6.0);
    mat2 my = mm2(time * 0.3 + f1 * 6.0);
    ro.xz *= mx; rd.xz *= mx;
    ro.xy *= my; rd.xy *= my;
    
    vec3 bro = ro;
    vec3 brd = rd;
    vec3 col = vec3(0.0125, 0.0, 0.025);
    
    float rayMultiplier = 1.0 + length(mouse_norm - 0.5) * 0.5 + iAudio.x * 1.5;
    
    for (int j_int = 1; j_int < int(NUM_RAYS) + 1; j_int++) {
        float j = float(j_int);
        ro = bro;
        rd = brd;
        mat2 mm = mm2((time * 0.1 + ((j + 1.0) * 5.1)) * j * 0.25 * rayMultiplier);
        ro.xy *= mm; rd.xy *= mm;
        ro.xz *= mm; rd.xz *= mm;
        float rz = march(ro, rd, 2.5, FAR, j, time);
        if (rz >= FAR) continue;
        vec3 pos = ro + rz * rd;
        col = max(col, vmarch(pos, rd, j, bro, time));
    }
    
    ro = bro;
    rd = brd;
    vec2 sph = iSphere2(ro, rd);
    if (sph.x > 0.0) {
        vec3 pos = ro + rd * sph.x;
        vec3 pos2 = ro + rd * sph.y;
        vec3 rf = reflect(rd, pos);
        vec3 rf2 = reflect(rd, pos2);
        float nz = (-log(abs(flow(rf * 1.2, time) - 0.01)));
        float nz2 = (-log(abs(flow(rf2 * 1.2, -time) - 0.01)));
        
        float mouseEnhance = 1.0 + length(mouse_norm - 0.5) * 2.0;
        float reflection_brightness = 0.8 * mouseEnhance * (1.0 + iAudio.z * 1.5);
        col += (0.1 * nz * nz * vec3(0.12, 0.12, 0.5) +
                0.05 * nz2 * nz2 * vec3(0.55, 0.2, 0.55)) * reflection_brightness;
    }
    
    fragColor = vec4(col * 1.3, 1.0);
}
`;
export default source;