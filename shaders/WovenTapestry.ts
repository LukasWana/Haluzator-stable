const source = `
// WovenTapestry by AI
// Simulates a complex, interwoven fabric pattern.

vec3 hsv(float h, float s, float v) {
  return mix( vec3( 1.0 ), clamp( ( abs( fract(
    h + vec3( 3.0, 2.0, 1.0 ) / 3.0 ) * 6.0 - 3.0 ) - 1.0 ), 0.0, 1.0 ), s ) * v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * (0.1 + iAudio.w * 0.2);
    
    // Audio-reactive parameters
    float zoom = 3.0 + iAudio.w * 2.0;
    float tightness = 0.05 + iAudio.x * 0.2; // Bass controls weave tightness
    float color_speed = 0.2 + iAudio.y * 0.3; // Mids control color speed
    float shimmer = iAudio.z * 0.1; // Highs add shimmer

    vec2 p = uv * zoom;
    p.x += time;

    // Weave pattern generation
    float v = 0.0;
    
    // Horizontal threads
    vec2 p1 = p;
    float sin_p1_y = sin(p1.y * 10.0);
    p1.x += sin_p1_y * 0.3;
    float h_threads = sin(p1.x * 20.0) * 0.5 + 0.5;
    h_threads = smoothstep(0.5 - tightness, 0.5 + tightness, h_threads);

    // Vertical threads
    vec2 p2 = p;
    float sin_p2_x = sin(p2.x * 10.0);
    p2.y += sin_p2_x * 0.3;
    float v_threads = sin(p2.y * 20.0) * 0.5 + 0.5;
    v_threads = smoothstep(0.5 - tightness, 0.5 + tightness, v_threads);

    // Combine and create final pattern
    float pattern = max(h_threads, v_threads);
    float edge_glow = min(h_threads, v_threads);
    
    // Coloring
    float hue_base = fract(p.y * 0.1 + time * color_speed);
    vec3 color1 = hsv(hue_base, 0.7, 0.8);
    vec3 color2 = hsv(fract(hue_base + 0.5), 0.8, 0.6);
    
    vec3 final_color = mix(color1, color2, h_threads);
    final_color = mix(final_color, color2, v_threads * 0.5);
    final_color *= pattern;
    
    // Add glow and shimmer
    final_color += edge_glow * vec3(1.0, 0.8, 0.5) * (0.3 + shimmer * 0.5);
    final_color += shimmer * (sin(p.x * 100.0) * sin(p.y * 100.0)) * 0.1;
    
    fragColor = vec4(final_color,1.0);
}
`;
export default source;