
// Mushroom Tunnel by user, adapted for Shader Sequencer

const source = `
// Hash function for noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// fbm
float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return value;
}

// SDF primitives
float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdMushroom(vec3 p) {
    float stem = sdCylinder(p - vec3(0.0, -0.2, 0.0), 0.05, 0.2);
    float cap = sdSphere(p - vec3(0.0, 0.1, 0.0), 0.15);
    return min(stem, cap);
}

// Tunnel SDF
float map(vec3 p, out int objID) {
    // Bass (iAudio.x) makes the tunnel walls pulse
    float tunnel_radius = 2.0 - iAudio.x * 0.5;
    float tunnel = abs(length(p.xz) - tunnel_radius + 0.2 * sin(p.y * 5.0 + iTime)) - 0.05;
    objID = 0;

    float d = tunnel;

    // Little mushrooms along the tunnel
    for (int i = -5; i <= 5; i++) {
        float fi = float(i);
        // Mids (iAudio.y) make the mushrooms "dance"
        vec3 dance_offset = vec3(sin(iTime * 5.0 + fi) * iAudio.y * 0.2, 0.0, cos(iTime * 5.0 + fi) * iAudio.y * 0.2);
        vec3 mp = p - (vec3(sin(fi * 0.5) * 2.0, fi * 1.0, cos(fi * 0.5) * 2.0) + dance_offset);
        float m = sdMushroom(mp);
        if (m < d) {
            d = m;
            objID = 1;
        }
    }

    return d;
}

// Raymarching
vec3 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    int objID = 0;
    vec3 color = vec3(0.0);

    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * t;
        float dist = map(p, objID);
        if (dist < 0.001) {
            if (objID == 0) {
                // Tunnel color - rainbow fractal. Highs (iAudio.z) increase texture complexity.
                float n = fbm(p.xz * (2.0 + iAudio.z * 3.0) + iTime * 0.1);
                color = vec3(0.5 + 0.5 * cos(6.2831 * (n + vec3(0.0, 0.33, 0.66))));
            } else {
                // Mushroom color - pulses with bass (iAudio.x)
                color = vec3(1.0, 0.2, 0.8) * (1.0 + iAudio.x * 1.5);
            }
            break;
        }
        t += dist * 0.5;
        if (t > 50.0) break;
    }

    // Background
    if (t > 50.0) {
        float n = fbm(rd.xy * 3.0 + iTime * 0.2);
        color = vec3(0.5 + 0.5 * cos(6.2831 * (n + vec3(0.0, 0.33, 0.66))));
    }

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Mouse interaction
    vec2 v_uv = fragCoord / iResolution.xy;
    vec2 u_mouse = iMouse.xy / iResolution.xy;
    float mouseDist = distance(v_uv, u_mouse);
    float zoom = mix(1.0, 0.5, smoothstep(0.0, 0.5, mouseDist));

    // Camera setup
    // Overall volume (iAudio.w) controls flight speed
    vec3 ro = vec3(0.0, iTime * (2.0 + iAudio.w * 3.0), 0.0);
    vec3 rd = normalize(vec3(uv * zoom, -1.5));

    vec3 col = raymarch(ro, rd);

    fragColor = vec4(col, 1.0);
}
`;
export default source;
