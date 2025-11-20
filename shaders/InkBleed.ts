const source = `
// InkBleed by AI
// Simulates ink bleeding on wet paper.

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float noise(vec2 p, float time) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) + time * 0.1;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime * 0.1;
    
    // Audio-reactive parameters
    float bleed_speed = 0.1 + iAudio.w * 0.5;
    float color_mix_speed = 0.2 + iAudio.y * 0.4; // Mids control color mixing
    float turbulence = iAudio.x * 0.5; // Bass controls turbulence
    float saturation = 0.8 + iAudio.z * 0.2; // Highs increase saturation

    float t = time * bleed_speed;
    
    // Multiple layers of noise for bleeding effect
    float n1 = noise(uv * 3.0 + t, t);
    float n2 = noise(uv * 5.0 - t, t);
    
    // Warp UVs with noise to create the bleed effect
    vec2 warp_uv = uv + vec2(n1 - 0.5, n2 - 0.5) * (0.5 + turbulence);
    
    // Generate color pattern
    float color_noise = noise(warp_uv * 2.0, time * color_mix_speed);
    
    // Coloring
    vec3 color1 = vec3(0.1, 0.2, 0.8); // Blue
    vec3 color2 = vec3(0.8, 0.1, 0.5); // Magenta
    vec3 paper_color = vec3(0.9, 0.85, 0.8);
    
    vec3 final_color = mix(color1, color2, color_noise);
    
    // Mix ink with paper color based on noise
    float ink_mask = smoothstep(0.4, 0.6, n1 * 0.7 + n2 * 0.3);
    final_color = mix(paper_color, final_color, ink_mask);
    
    // Adjust saturation
    vec3 luma = vec3(dot(final_color, vec3(0.299, 0.587, 0.114)));
    final_color = mix(luma, final_color, saturation);
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;