
const source = `
// The new shader code, adapted for the app.
// Original by unknown, adapted from a Three.js shader.

vec3 rgb(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

vec2 rotate2D(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv_norm = fragCoord.xy / iResolution.xy;
    vec2 uv = (uv_norm - 0.5) * vec2(iResolution.x / iResolution.y, 1.0);
    
    // Bass (iAudio.x) affects grid density
    float scale = 8.0 + iAudio.x * 12.0;
    
    // Rotation is affected by master speed control (via iTime)
    uv = rotate2D(uv, iTime * 0.2);
    
    vec2 grid = fract(uv * scale) - 0.5;
    float d = length(grid);
    
    // Base color progression
    float t = iTime * 0.5 + length(uv);
    // Mids (iAudio.y) shift the color palette
    vec3 color = rgb(t + iAudio.y * 2.0); 
    
    // Highs (iAudio.z) create a pulsing effect in the grid centers
    float pulse = iAudio.z;
    
    // Combine effects for final color
    color *= smoothstep(0.5, 0.2, d);
    color += rgb(t + 0.2) * smoothstep(0.2, 0.1, d - pulse * 0.1);
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;
