// twigl: https://t.co/Eqa9WrS2Yg
// tweet: https://twitter.com/XorDev/status/1475524322785640455
// Adapted for Shader Sequencer to be a perfect circle and audio-reactive.

const source = `
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // --- SETUP ---
    fragColor = vec4(0.0);
    // Normalize coordinates by height, so uv.y is in [-0.5, 0.5].
    // This makes the coordinate space non-isotropic (stretched horizontally).
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float aspect = iResolution.x / iResolution.y;
    
    // Create an isotropic (aspect-ratio corrected) coordinate system.
    // uv_iso.x and uv_iso.y will both be in the range [-0.5, 0.5] for a square view.
    vec2 uv_iso = uv;
    uv_iso.x /= aspect;

    // --- AUDIO-REACTIVE PARAMETERS ---
    float audio_time = iTime * (0.8 + iAudio.w * 1.5);
    float brightness_mod = 1.2 + iAudio.y * 3.0; // Mids make colors more intense
    float size_pulse = pow(iAudio.x, 1.5);       // Bass makes the sphere pulse
    float jitter_amount = pow(iAudio.z, 2.0);   // Highs add energetic jitter

    // --- SPHERE DEFINITION ---
    // The radius is defined in our isotropic UV space.
    // A projected diameter of 0.5 in this space corresponds to half the screen width.
    // With an average projection depth of ~2, we need a base radius of 0.5 to get a projected radius of ~0.25.
    float target_radius = 0.5; 
    float projection_depth = mix(2.0, 1.2, size_pulse); 
    
    // High-frequency jitter in isotropic space
    vec2 jitter = vec2(sin(iTime*80.0), cos(iTime*60.0)) * jitter_amount * 0.01;

    // --- PARTICLE RENDERING LOOP ---
    // Use a sparser particle step to create more of a ring-like appearance vs a solid sphere.
    for(float i=-1.0; i<1.0; i+=8e-3)
    {
        // Generate points on a sphere of radius R
        float R = target_radius;
        vec3 p3d;
        p3d.z = i * R;
        // Use max() to prevent sqrt of negative numbers at the poles if i is slightly > 1 or < -1
        float xy_radius = sqrt(max(0.0, R*R - p3d.z*p3d.z)); 
        p3d.xy = cos(i*5e2 + audio_time + vec2(0,11)) * xy_radius;
        
        // Perspective projection
        float depth = p3d.z*0.5 + projection_depth;
        vec2 point_on_screen = p3d.xy / depth;
        
        // The projected point is in an isotropic space. We compare it to our isotropic UVs.
        vec2 projected_p = uv_iso - (point_on_screen + jitter);
        
        // --- PARTICLE COLOR & BRIGHTNESS ---
        vec4 point_color = (cos(i*2.0 + audio_time*0.5 + vec4(0,2,4,6)) + 1.0) * 0.5;
        point_color = pow(point_color, vec4(2.2)) * brightness_mod;
        
        // Make particles near the center (in Z) slightly brighter to enhance 3D feel
        float depth_fade = 1.0 - 0.4 * abs(i);
        
        // Accumulate color. The divisor controls particle glow size.
        fragColor += (point_color * depth_fade) / (dot(projected_p, projected_p) * 5e3 + 1.0);
    }
    
    // --- POST-PROCESSING & CORE ---
    // The core is also calculated in the isotropic space for a perfect circle.
    float core_dist = length(uv_iso);
    float core_glow = smoothstep(0.05, 0.0, core_dist) * (1.0 + size_pulse * 1.5); // Smaller core
    vec3 core_color = vec3(1.0, 0.9, 0.85);
    fragColor.rgb += core_color * core_glow * 0.2;

    // Final brightness adjustment and tone mapping
    fragColor /= 8.0;
    fragColor.rgb = fragColor.rgb / (fragColor.rgb + vec3(0.6)); // Tone mapping
    fragColor.rgb = pow(fragColor.rgb, vec3(0.85)); // Gamma for punch
}
`;
export default source;