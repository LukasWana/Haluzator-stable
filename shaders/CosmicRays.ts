
const source = `
// "Cosmic Rays" - Adapted from a user-provided shader
// Enhanced with audio reactivity for VJ performance.

float sdf(in vec3 pos){
    pos = mod(pos, 10.);
    return length(pos - vec3(5.)) - 1.;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord * 2. - iResolution.xy)/max(iResolution.x, iResolution.y);

    // Audio-reactive time for camera movement and rotation
    float time = iTime * (1.0 + iAudio.w * 2.0);

    // Move and rotate camera over time
    vec3 origin = vec3(0., 5., 0.) * time;
    float angle = radians(time * 3.0);
    uv *= mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // Use spherical projection for ray direction
    vec3 ray_dir = vec3(sin(uv.x), cos(uv.x)*cos(uv.y), sin(uv.y));
    vec3 ray_pos = vec3(origin);
    
    float ray_length = 0.;
    
    // Bass (x) controls the outward push of the rays
    float push_strength = 0.3 + iAudio.x * 0.5;
    
    // FIX: WebGL 1 requires constant loop conditions.
    // Changed to a standard integer-based for-loop for compatibility.
    for(int i = 0; i < 7; i++){
        float dist = sdf(ray_pos);
        ray_length += dist;
        ray_pos += ray_dir * dist;
        // Push rays outward with increasing distance
        ray_dir = normalize(ray_dir + vec3(uv.x, 0., uv.y) * dist * push_strength);
    }
    
    vec3 o = vec3(sdf(ray_pos));
    
    // Mids (y) shift the color palette
    o = cos(o + vec3(6., iAudio.y * 2.0, 0.5));
    
    // Highs (z) affect the fog/brightness cutoff
    float fog_end = 38.0 - iAudio.z * 10.0;
    float fog_start = 20.0 - iAudio.z * 8.0;
    o *= smoothstep(fog_end, fog_start, ray_length);

    fragColor = vec4(o, 1.);
}
`;
export default source;