const source = `
// WarpDrive by AI
// The classic star-stretching effect.

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.5;
    
    // Audio-reactive parameters
    float speed = 0.5 + iAudio.w * 2.0;
    float stretch = iAudio.x * 10.0; // Bass controls star stretch
    float star_brightness = 0.5 + iAudio.z * 1.5; // Highs make stars brighter
    
    vec3 final_color = vec3(0.0);
    
    // Convert to polar coordinates
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    
    // Warp effect on coordinates
    float warp_r = log(r + 1.0);
    float warp_a = a;
    
    // Travel through space
    warp_r -= time * speed;
    
    // Grid of stars
    vec2 grid_uv = vec2(warp_r, warp_a / 6.28318);
    vec2 ip = floor(grid_uv * 10.0);
    vec2 fp = fract(grid_uv * 10.0);
    
    // Draw stars
    if (hash(ip) > 0.95) {
        float star_size = hash(ip + 10.0) * 0.1 + 0.01;
        float dist_to_star = length(fp - 0.5);
        
        // Stretching effect
        float star = 1.0 - smoothstep(0.0, star_size, dist_to_star);
        float trail = 1.0 / (1.0 + abs(fp.x - 0.5) * (50.0 + stretch));
        
        // Coloring
        float hue = hash(ip + 20.0) + iAudio.y * 0.2; // Mids shift star color
        vec3 star_color = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 0.6, 1.0));
        
        final_color += star_color * (star + trail) * star_brightness;
    }
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;