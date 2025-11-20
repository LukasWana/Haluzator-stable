// This shader combines elements from a user-provided mushroom tunnel concept
// with the robust structure and audio-reactivity of the application.
const source = `
#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.01

const float PI = 3.14159265359;

// --- Noise & Math Functions ---
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0 - 2.0*f);

    float n000 = dot(hash2(i.xy + vec2(0.0,0.0)), f.xy);
    float n100 = dot(hash2(i.xy + vec2(1.0,0.0)), f.xy - vec2(1.0,0.0));
    float n010 = dot(hash2(i.xy + vec2(0.0,1.0)), f.xy - vec2(0.0,1.0));
    float n110 = dot(hash2(i.xy + vec2(1.0,1.0)), f.xy - vec2(1.0,1.0));

    float nx0 = mix(n000, n100, f.x);
    float nx1 = mix(n010, n110, f.x);
    return mix(nx0, nx1, f.y);
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 5; i++) {
        f += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return f;
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, s, -s, c);
}

// --- Scene SDFs ---
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdMushroom(vec3 p) {
    // Stem
    float stem = length(p.xz) - 0.05;
    stem = max(stem, abs(p.y + 0.1) - 0.1);
    
    // Cap
    float cap = length(p.xz) - 0.15;
    cap = max(cap, p.y - 0.05);
    cap = max(cap, -p.y - 0.05);
    return min(stem, cap);
}

float map(vec3 p, float time) {
    // Bass (iAudio.x) makes the tunnel pulsate
    float tunnel = sdTorus(p - vec3(0.0, 0.0, mod(p.z, 2.0)), vec2(1.5, 0.2 + 0.1 * iAudio.x));
    
    float mushroomField = 100.0;
    for (int i = 0; i < 5; i++) {
        vec3 mp = p;
        mp.z += float(i) * 2.0;
        
        vec2 id = floor(mp.xz * 2.0);
        vec2 rnd = hash2(id);
        
        // Mids (iAudio.y) make mushrooms "dance"
        float dance_y = -0.8 + rnd.x * 0.3 + sin(time * 3.0 + rnd.x * 10.0) * iAudio.y * 0.2;
        vec3 pos = vec3(id.x * 0.5, dance_y, id.y * 0.5);
        
        mushroomField = min(mushroomField, sdMushroom(mp - pos));
    }
    return min(tunnel, mushroomField);
}

// --- Shading ---
vec3 getColor(vec3 p, float time) {
    // Highs (iAudio.z) shift the color palette
    float rainbow = sin(p.z * 2.0 + time * 2.0 + p.x + p.y + iAudio.z) * 0.5 + 0.5;
    vec3 col = vec3(0.5 + 0.5 * sin(PI * vec3(0.0, 0.33, 0.66) + rainbow * 6.2831));
    col *= 0.7 + 0.3 * fbm(p * 2.0 + time);
    return col;
}

vec3 getNormal(vec3 p, float time) {
    float d = map(p, time);
    vec2 e = vec2(0.01, 0.0);
    vec3 n = d - vec3(
        map(p - e.xyy, time),
        map(p - e.yxy, time),
        map(p - e.yyx, time)
    );
    return normalize(n);
}

// --- Raymarching ---
float raymarch(vec3 ro, vec3 rd, float time, out vec3 p) {
    float dO = 0.0;
    for(int i = 0; i < MAX_STEPS; i++) {
        p = ro + rd * dO;
        float dS = map(p, time);
        if(dS < SURF_DIST || dO > MAX_DIST) break;
        dO += dS;
    }
    return dO;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv_centered = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Overall volume controls speed
    float time = iTime * (1.0 + iAudio.w * 1.0);

    vec3 ro = vec3(0.0, 0.0, time * 2.0);
    vec3 rd = normalize(vec3(uv_centered, -1.5));

    // Mouse interaction for camera control
    vec2 mouse_norm = iMouse.xy / iResolution.xy;
    if (iMouse.z > 0.0) { // Only apply if mouse is clicked/active
      ro.xy += (mouse_norm - 0.5) * vec2(2.0, -2.0);
    }

    vec3 p;
    float d = raymarch(ro, rd, time, p);

    vec3 col = vec3(0.0);
    if(d < MAX_DIST) {
        vec3 n = getNormal(p, time);
        vec3 lightDir = normalize(vec3(0.5, 1.0, -0.5));
        float diff = clamp(dot(n, lightDir), 0.0, 1.0);
        col = getColor(p, time) * (diff * 0.8 + 0.2); // Added ambient light
    } else {
        vec3 bg = vec3(0.1 + 0.1 * sin(time + uv_centered.xyx * 10.0));
        col = bg;
    }
    
    // Vignette
    col *= 1.0 - 0.5 * length(uv_centered);

    fragColor = vec4(col, 1.0);
}
`;
export default source;
