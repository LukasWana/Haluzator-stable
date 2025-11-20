const source = `
// SolarFlare by AI
// A close-up of a solar flare, with plasma tendrils erupting.

mat2 rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
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

float fbm(vec2 p, float time) {
    float t = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
        t += amp * noise(p);
        p = rot(0.7 + time * 0.1) * p * 2.0;
        amp *= 0.5;
    }
    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * (0.2 + iAudio.w * 0.3);
    
    // Audio-reactive parameters
    float intensity = 1.0 + iAudio.x * 3.0; // Bass makes flares more intense
    float turbulence = 0.5 + iAudio.y * 1.5; // Mids affect plasma turbulence
    float speed_warp = iAudio.z * 0.2; // Highs add small flickers

    vec2 p = uv;
    p.x *= 1.5;
    
    // Create plasma tendrils
    float d = length(p);
    float a = atan(p.y, p.x);
    
    vec2 q = p + vec2(
        fbm(p + time * 0.5, time),
        fbm(p + time * 0.4 + 10.0, time)
    ) * turbulence;
    
    float f = fbm(q * 2.0 + time, time);
    f = smoothstep(0.4, 0.6, f);
    f *= pow(1.0 - d, 2.0) * intensity;
    
    // Flare shape and motion
    float angle_mask = sin(a * 3.0 + time * 2.0 + speed_warp) * 0.5 + 0.5;
    angle_mask = pow(angle_mask, 4.0);
    f *= angle_mask;
    
    // Add smaller, faster flickers
    float flickers = pow(fbm(p * 20.0 + time * 5.0, time), 10.0) * (0.2 + iAudio.z * 0.8);
    
    // Coloring
    vec3 color1 = vec3(1.0, 0.5, 0.1); // Orange
    vec3 color2 = vec3(0.8, 0.1, 0.0); // Deep red
    vec3 hot_color = vec3(1.0, 0.9, 0.5); // Yellow-white
    
    vec3 final_color = mix(color2, color1, f);
    final_color = mix(final_color, hot_color, pow(f, 3.0));
    final_color += flickers * hot_color;
    
    // Background glow
    vec3 bg_color = vec3(0.1, 0.0, 0.0);
    float bg_glow = pow(1.0 - d, 5.0) * 0.2 * intensity;
    final_color = mix(bg_color, final_color, smoothstep(0.0, 0.1, f + bg_glow));
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;