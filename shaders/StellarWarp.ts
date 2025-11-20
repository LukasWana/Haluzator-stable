// Stellar Warp by user, adapted for Shader Sequencer

const source = `
// Hash function for noise
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Optimized noise function
float noise(vec2 uv) {
    return fract(sin(dot(uv, vec2(32.23, 365.07))) * 17.0125);
}

// Pre-compute star data (simplified, no need for separate buffer)
vec4 getStarData(vec2 uv) {
    float angle = fract(sin(uv.x * 32.23 + uv.y * 365.07) * 17.0125);
    float dist = fract(sin(dot(uv, vec2(2.17, 3.52))) * 17.0125);
    float speed = pow(fract(sin(dot(uv, vec2(5.146, 7.84))) * 17.0125), 10.0);
    return vec4(angle, dist, speed, 1.0);
}

// Draw a single star
vec3 drawStar(float t, vec2 uv, float angle, float dist, float speed, float g_speed) {
    float c = cos(angle);
    float s = sin(angle);
    float speed2 = 2.0 * t * 0.5 * (speed * 0.075 + 0.025) * 0.5;
    float d = pow(fract(dist + speed2 + g_speed * 0.5), 4.0);
    vec2 star = mat2(c, s, -s, c) * vec2(d, 0.0);
    float l = length(uv - star);

    float dim = 0.3 + speed * 0.7 * dist;
    float blink_factor = fract(angle * 6.142) * 0.6;
    float blink = mix(1.0, abs(sin(t * (15.0 + dist + angle) + fract(angle * 3.5) + dist)), blink_factor) * (1.0 + iAudio.z * 0.5); // Treble flicker
    float power = 2.0 * mix(1.0, 2.0, g_speed) + iAudio.x * 2.0; // Bass pulse
    float att = smoothstep(0.00, pow(1.0 - speed, 0.75) * 0.75, length(uv));
    float sz = smoothstep(0.0005 + (1.0 + g_speed * 5.0) * d / 300.0, 0.0, l);

    return power * sz * vec3(0.8, 0.9, 1.0) * att * dim * blink;
}

// Draw all stars with optimized loop
vec3 drawStars(vec2 uv, float t, float g_speed) {
    vec3 col = vec3(0.0);
    float ang = 360.0 * (atan(uv.y, uv.x) + 6.2831853) / 6.2831853;
    vec2 u_mouse_norm = iMouse.xy / iResolution.xy;

    for (int j = 0; j < 3; j++) {
        for (int i = 0; i < 20; i++) {
            float x = float(i);
            float y = mod(floor(ang) + float(j) - 1.0 + 360.0, 360.0);

            vec4 s = getStarData(vec2(x + 0.5, y + 0.5) / iResolution.xy);
            float a = 6.2831853 * (y + s.r) / 360.0;
            float dist = s.g;
            float speed = s.b;

            float mouseInfluence = 1.0 + 0.5 * (1.0 - smoothstep(0.0, 0.3, length(uv - (u_mouse_norm * 2.0 - 1.0))));
            vec2 ca_offset = vec2(0.001, 0.0) * (1.0 + g_speed * 2.0 + iAudio.z * 5.0); // Treble Chromatic Aberration

            col.r += drawStar(t, uv - ca_offset, a, dist, speed, g_speed).r * mouseInfluence;
            col.g += drawStar(t, uv, a, dist, speed, g_speed).g * mouseInfluence;
            col.b += drawStar(t, uv + ca_offset, a, dist, speed, g_speed).b * mouseInfluence;
        }
    }
    return col;
}

// Improved nebula effect
vec3 nebulaEffect(vec2 uv, float t) {
    float n1 = noise(uv * 3.0 + t * 0.01);
    float n2 = noise(uv * 2.0 - t * 0.02);
    float n3 = noise(uv * 5.0 + vec2(sin(t*0.01), cos(t*0.015)));

    float nebula = n1 * n2 * n3;

    // Mids shift nebula color
    vec3 color1 = vec3(0.1, 0.0, 0.2) + iAudio.y * 0.1;
    vec3 color2 = vec3(0.0, 0.1, 0.2) + iAudio.y * vec3(0.1, -0.05, 0.0);
    vec3 color3 = vec3(0.05, 0.0, 0.15);

    vec2 u_mouse_norm = iMouse.xy / iResolution.xy;
    vec3 nebulaColor = mix(
        mix(color1, color2, noise(uv * 5.0)),
        color3,
        noise(uv * 7.0 + t * 0.03)
    ) * nebula * 0.2;
    float mouseGlow = smoothstep(0.5, 0.0, length(uv - (u_mouse_norm * 2.0 - 1.0)));
    nebulaColor += vec3(0.05, 0.0, 0.1) * mouseGlow;

    return nebulaColor;
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Overall volume controls global speed
    float g_speed = iAudio.w * 1.5;

    // Animate UV
    float angle = sin(iTime * 0.15) * 0.5;
    uv *= mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // Lens distortion
    float r = length(uv);
    uv = normalize(uv) * pow(r, mix(1.0, 0.025, g_speed));
    r = length(uv);
    float rr = r * r;
    float k1 = mix(-0.2, 0.0, g_speed);
    float k2 = mix(-0.1, 0.0, g_speed);
    uv *= (1.0 + k1 * rr + k2 * rr * rr);

    // Draw stars
    vec3 col = drawStars(uv, iTime, g_speed);

    // Add nebula background
    vec3 bgColor = vec3(0.01, 0.02, 0.04);
    vec3 nebulaColor = nebulaEffect(uv, iTime);
    col += nebulaColor;
    col = mix(bgColor, col, 1.0);

    // Add subtle vignette
    float vignette = smoothstep(1.2, 0.5, length(fragCoord / iResolution.xy - 0.5) * 2.0);
    col *= vignette;

    fragColor = vec4(col, 1.0);
}
`;
export default source;