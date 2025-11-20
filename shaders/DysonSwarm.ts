const source = `
// DysonSwarm by AI
// A swarm of reflective panels orbiting a star.

mat3 rot_y(float a) {
    float s=sin(a), c=cos(a);
    return mat3(c, 0, -s, 0, 1, 0, s, 0, c);
}
mat3 rot_x(float a) {
    float s=sin(a), c=cos(a);
    return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}

float hash(float n) { return fract(sin(n) * 43758.5453); }

float box(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.1;
    
    // Audio-reactive parameters
    float swarm_speed = 0.5 + iAudio.w * 1.0;
    float alignment = iAudio.y * 1.5; // Mids align the panels
    float flicker = iAudio.z; // Highs make panels flicker

    vec3 ro = vec3(0, 0, -5.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    vec3 final_color = vec3(0.0);
    
    // Raymarching
    float t = 0.0;
    for(int i = 0; i < 40; i++) {
        vec3 p = ro + rd * t;
        
        // Swarm logic
        vec3 p_swarm = p;
        float id = floor(p_swarm.z);
        p_swarm.z = fract(p_swarm.z) - 0.5;
        
        // Panel orientation
        float panel_angle_y = hash(id) * 6.28 + time * swarm_speed;
        float panel_angle_x = mix(hash(id + 10.0) * 3.14, 0.5, alignment);
        
        p_swarm *= rot_y(panel_angle_y) * rot_x(panel_angle_x);

        // Panel shape
        float d = box(p_swarm, vec3(0.5, 0.5, 0.01));
        
        if (d < 0.01) {
            // Lighting
            vec3 normal = vec3(0, 0, 1.0) * rot_y(panel_angle_y) * rot_x(panel_angle_x);
            vec3 light_dir = normalize(vec3(1.0, 1.0, -1.0));
            float diff = max(dot(normal, light_dir), 0.0);
            
            // Flicker
            float panel_flicker = hash(id + time * 10.0) > (1.0 - flicker * 0.1) ? 2.0 : 1.0;
            
            vec3 panel_color = vec3(0.8, 0.8, 1.0) * diff * panel_flicker;
            final_color = panel_color;
            break;
        }
        
        t += d * 0.5;
        if (t > 10.0) break;
    }
    
    // Central star
    float star = 0.01 / (length(uv) + 1e-6);
    star *= (1.0 + iAudio.x * 2.0); // Bass makes the star pulse
    vec3 star_color = vec3(1.0, 0.9, 0.5);
    
    final_color += star * star_color;
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;