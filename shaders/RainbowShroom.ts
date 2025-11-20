
// Rainbow Shroom Tunnel by user, adapted for Shader Sequencer

const source = `
// Hash function
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0 - 2.0*f);

    return mix(
        mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
        mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
        u.y);
}

// FBM
float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 5; i++) {
        total += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

// Rotation
mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Tunnel pattern
float tunnel(vec2 uv, float time, out vec3 col) {
    vec2 p = uv - 0.5;
    p.x *= iResolution.x / iResolution.y;

    float angle = atan(p.y, p.x);
    float radius = length(p);

    // Overall volume controls speed
    float tunnelSpeed = time * (0.5 + iAudio.w * 1.0);
    float z = 1.0 / radius + tunnelSpeed;

    // Bass distorts tunnel walls
    float rings = sin(z + angle * 6.0 + fbm(vec2(angle * (3.0 + iAudio.x * 2.0), z * (0.1 + iAudio.x * 0.2)))) * 0.5 + 0.5;

    // Rainbow fractal background, mids shift colors
    float color_shift = iAudio.y * 2.0;
    float r = 0.5 + 0.5 * sin(z + 0.0 + color_shift + fbm(vec2(z, angle)));
    float g = 0.5 + 0.5 * sin(z + 2.0 + color_shift + fbm(vec2(z + 5.0, angle + 3.0)));
    float b = 0.5 + 0.5 * sin(z + 4.0 + color_shift + fbm(vec2(z + 10.0, angle + 6.0)));

    col = vec3(r, g, b) * rings;

    return radius;
}

// Little mushrooms along the tunnel
float mushroomShape(vec2 p) {
    float stem = smoothstep(0.02, 0.01, abs(p.x)) * step(0.0, p.y) * smoothstep(0.05, 0.0, p.y);
    float cap = smoothstep(0.1, 0.05, length(p - vec2(0.0, 0.05))) * step(0.0, 0.1 - p.y);
    return max(stem, cap);
}

vec3 renderMushrooms(vec2 uv, float time) {
    vec2 p = uv - 0.5;
    p.x *= iResolution.x / iResolution.y;
    float z = 1.0 / length(p) + time * 0.5;

    float angle = atan(p.y, p.x);
    float id = floor(z * 2.0 + angle * 3.0);
    float localZ = fract(z * 2.0 + angle * 3.0);

    // Mids make mushrooms "dance"
    float dance_factor = 0.5 + 0.5 * sin(time + id) + iAudio.y * 0.5;
    vec2 mushroomPos = vec2(sin(id * 12.9898), cos(id * 78.233)) * 0.3 * dance_factor;
    vec2 offset = p - mushroomPos;
    offset *= 5.0;

    float m = mushroomShape(offset);
    // Highs make mushrooms glow
    vec3 c = mix(vec3(0.2, 0.1, 0.05), vec3(1.0, 0.2, 0.6), m) * (1.0 + iAudio.z * 1.5);
    return c * m;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = uv - 0.5;
    p.x *= iResolution.x / iResolution.y;

    vec2 u_mouse = iMouse.xy / iResolution.xy;
    float mouseInfluence = length(u_mouse - uv);
    float zoom = 1.0 + 0.5 * (1.0 - mouseInfluence);

    vec3 tunnelCol;
    float r = tunnel(uv * zoom, iTime, tunnelCol);

    vec3 mushroomCol = renderMushrooms(uv * zoom, iTime);

    vec3 col = tunnelCol + mushroomCol;

    col = pow(col, vec3(0.4545)); // gamma correction

    fragColor = vec4(col, 1.0);
}
`;
export default source;
