const source = `
// GeodeSlice by AI
// The inside of a crystal geode, with sharp crystalline structures.

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.1;

    // Audio-reactive parameters
    float growth = iAudio.x * 0.2; // Bass makes crystals grow
    float shimmer = iAudio.z; // Highs make crystals shimmer
    float color_shift = iAudio.y * 0.3; // Mids shift color

    // Voronoi pattern for crystal cells
    vec2 p = uv * 3.0;
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    
    float min_dist = 1.0;
    vec2 closest_point;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 neighbor_ip = ip + vec2(float(i), float(j));
            vec2 point = neighbor_ip + 0.5 + 0.4 * (hash(neighbor_ip) - 0.5);
            float dist = length(p - point);
            if (dist < min_dist) {
                min_dist = dist;
                closest_point = point;
            }
        }
    }

    // Crystal growth animation
    float crystal_size = hash(closest_point) * 0.4 + 0.1 + growth;
    float crystal_shape = smoothstep(crystal_size, crystal_size - 0.05, min_dist);
    
    // Internal crystal structure
    float internal_pattern = sin(min_dist * 50.0 - time * 20.0) * 0.5 + 0.5;
    internal_pattern *= crystal_shape;
    
    // Shimmer effect
    float shimmer_val = hash(closest_point + time) * shimmer;
    
    // Coloring
    float hue = hash(closest_point + 10.0) + color_shift;
    vec3 base_color = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 0.6, 1.0));
    
    vec3 final_color = base_color * (internal_pattern * 0.5 + 0.5);
    final_color += shimmer_val * vec3(1.0);
    
    // Background
    vec3 bg_color = vec3(0.02, 0.0, 0.05);
    final_color = mix(bg_color, final_color, crystal_shape);
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;