const source = `
// "GridGlow" - by user, enhanced for audio-reactivity
// This shader creates a grid of pulsating circular shapes.

void mainImage( out vec4 c_out, in vec2 u)
{
    vec2 rr = iResolution.xy;
    // --- Audio-reactive parameters ---
    // Overall volume controls grid density and animation speed
    float grid_density = 10.0 + iAudio.w * 25.0;
    float time = iTime * (1.0 + iAudio.w * 1.0);
    
    vec2 uv = (u + u - rr) / rr.y;
    vec2 uvc = uv;
    uv = fract(uvc * grid_density) - 0.5;
    
    vec3 color = vec3(0.0);
    
    // Core glow intensity, boosted by bass - toned down brightness further
    float f = pow(0.25 / (length(uv) + 1e-6), 6.0) * (1.0 + iAudio.x * 1.0);
   
    // Complex trigonometric functions for color channels, now modulated by time
    // FIX: Replaced tan() with sin() or cos() to prevent visual artifacts and potential
    //      infinite values at asymptotes, which can cause rendering issues.
    float fxr = sin(uvc.x * uvc.y + time) * cos(uvc.y + uvc.x + time);
    float fyr = cos(uvc.y * uvc.x + time) * cos(uvc.y * uvc.y);
    float ffr = length(vec2(sin(fxr * 3.0 + time * 0.15), fyr));
    
    float fxg = sin(uvc.x * uvc.y + time) * cos(uvc.y + uvc.x + time);
    float fyg = cos(uvc.y * uvc.x + time) * cos(uvc.y * uvc.y);
    float ffg = length(vec2(cos(fxg * 3.0 + time * 0.25), fyg));
    
    float fxb = sin(uvc.x * uvc.y + time) * cos(uvc.y + uvc.x + time);
    float fyb = cos(uvc.y * uvc.x + time) * cos(uvc.y * uvc.y);
    float ffb = length(vec2(sin(fxb * 3.0 + time * 0.5), fyb));
    
    // Overall brightness modulation
    float ffs = sin(length(uvc) * 2.0 + time) * 0.5 + 0.5;
    ffs = ffs * (0.8 + iAudio.w * 0.4); // Overall volume boosts brightness
    
    // Audio-reactive color channels - further reduced powers
    color.r = f * pow(ffr, 9.0) * (1.0 + iAudio.x * 0.5); // Bass boosts red
    color.g = f * pow(ffg, 6.0)  * (1.0 + iAudio.y * 0.5); // Mids boost green
    color.b = f * pow(ffb, 2.5)  * (1.0 + iAudio.z * 0.5); // Highs boost blue
    
    // Reduced final brightness multiplier
    color *= (ffs * 0.25);
 
    // Apply a gamma curve to darken the image and increase contrast, making it less washed out.
    color = pow(color, vec3(1.2));

    c_out = vec4(color, 1.0);
}
`;
export default source;