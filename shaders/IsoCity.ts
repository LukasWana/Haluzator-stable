const source = `
// IsoCity by AI
// An isometric, procedurally generated city skyline.

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

mat2 rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * (0.1 + iAudio.w * 0.2);
    
    // Isometric projection
    uv.x *= 1.732; // sqrt(3)
    uv.y += uv.x * 0.5;
    uv.x -= uv.y * 0.5;
    
    // Audio-reactive parameters
    float scroll_speed = 0.2 + iAudio.w * 0.5;
    float building_pulse = iAudio.x; // Bass pulses building heights
    float window_glow = iAudio.z; // Highs make windows glow

    vec2 p = uv * 5.0;
    p.y -= time * scroll_speed;
    
    vec2 id = floor(p);
    vec2 fp = fract(p) - 0.5;
    
    float height = hash(id) * 2.0 + 0.5;
    height += building_pulse * hash(id + 10.0) * 2.0;
    
    // Draw buildings
    float d = 1.0 - step(abs(fp.x), 0.4) * step(abs(fp.y), 0.4);
    float building_shape = step(d, height);
    
    // Shading for 3D effect
    float side_shade = (fp.x > 0.4) ? 0.8 : 1.0;
    float top_shade = (d > height - 0.1) ? 1.2 : 1.0;
    
    // Windows
    float windows = 0.0;
    if (building_shape > 0.5) {
        vec2 win_uv = fract(vec2(fp.x * 5.0, (height - d) * 10.0));
        if (hash(id + floor(vec2(fp.x * 5.0, (height - d) * 10.0))) > 0.8) {
            windows = step(abs(win_uv.x - 0.5), 0.3) * step(abs(win_uv.y - 0.5), 0.3);
            windows *= (0.5 + window_glow * 1.5);
        }
    }
    
    // Coloring
    vec3 building_color = vec3(0.1, 0.2, 0.4) * hash(id + 20.0) * 0.5 + 0.1;
    vec3 window_color = vec3(1.0, 0.8, 0.2);
    
    vec3 final_color = building_color * building_shape * side_shade * top_shade;
    final_color += window_color * windows;
    
    // Background / street level fog
    float fog = smoothstep(0.0, 2.0, d);
    vec3 fog_color = vec3(0.2, 0.1, 0.3) * (0.5 + iAudio.y * 0.5); // Mids affect fog color
    
    final_color = mix(final_color, fog_color, fog);
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;