const source = `
// OrigamiField by AI
// A field of folding and unfolding origami shapes.

mat2 rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

float box(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.3;
    
    // Audio-reactive parameters
    float fold_speed = 0.5 + iAudio.w * 1.5;
    float complexity = 2.0 + iAudio.x * 4.0; // Bass adds more folds
    float color_shift = iAudio.y * 0.5; // Mids shift color
    float shimmer = iAudio.z * 0.5; // Highs add shimmer

    vec3 final_color = vec3(0.0);
    
    // Grid of origami shapes
    vec2 gv = fract(uv * 4.0) - 0.5;
    vec2 id = floor(uv * 4.0);
    
    // Animate folding based on time and grid position
    float fold_anim = sin(id.x * 1.3 + id.y * 2.1 + time * fold_speed) * 0.5 + 0.5;
    
    // Create folding planes
    vec2 p = gv;
    p = abs(p);
    
    float d = 1.0;
    
    for(int i_int = 0; i_int < 5; i_int++) {
        float i = float(i_int);
        if (i >= complexity) break;
        p = abs(p);
        p.x -= 0.5;
        p *= rot(1.5707 * fold_anim);
        d = min(d, box(p, vec2(0.4, 0.05)));
    }

    float shape = smoothstep(0.01, 0.0, d);
    
    // Coloring
    float hue = fract(id.x * 0.1 + id.y * 0.2 + time * 0.1 + color_shift);
    vec3 base_color = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 0.6, 1.0));
    
    // Shading for 3D effect
    float light = dot(normalize(vec3(p, 0.1)), normalize(vec3(0.5, 0.5, 0.5))) * 0.5 + 0.5;
    
    final_color = base_color * shape * light;
    final_color += shape * shimmer * 0.2;
    
    // Background
    vec3 bg_color = vec3(0.05, 0.0, 0.1);
    final_color = mix(bg_color, final_color, shape);
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;