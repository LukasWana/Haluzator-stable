
const source = `
// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 5; i++) {
        f += w * snoise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
}

vec3 aurora(vec2 uv, float time) {
    // Adjust aspect ratio
    uv.x *= iResolution.x / iResolution.y;
    
    vec2 u_mouse = iMouse.xy / iResolution.xy;
    // Mouse interaction - affects the flow and intensity
    float mouseInfluence = smoothstep(0.5, 0.0, length(u_mouse - vec2(0.5)));
    
    // Base aurora parameters
    float speed = 0.05 + iAudio.w * 0.1; // Volume controls speed
    float height = 0.4 + 0.1 * mouseInfluence;
    float thickness = 0.1 + 0.05 * mouseInfluence + iAudio.x * 0.1; // Bass makes it thicker
    
    // Create organic curves using noise
    float yOffset = fbm(vec2(uv.x * 0.5 - time * speed, time * 0.2)) * 0.3;
    
    // Calculate distance from the aurora band
    float dist = abs(uv.y - (height + yOffset));
    
    // Smooth falloff for the aurora
    float intensity = smoothstep(thickness, 0.0, dist);
    
    // Add some vertical rays, reacting to highs
    float rays = fbm(vec2(uv.x * 2.0, uv.y * 10.0 + time * (0.1 + iAudio.z * 0.5))) * 0.1;
    intensity += rays * intensity;
    
    // Add horizontal flow
    float flow = fbm(vec2(uv.x * 3.0 + time * 0.2, uv.y * 2.0)) * 0.05;
    intensity += flow * intensity;
    
    // Color palette for northern lights
    vec3 blue = vec3(0.0, 0.4, 0.8);
    vec3 aqua = vec3(0.0, 0.8, 0.8);
    vec3 pink = vec3(0.9, 0.4, 0.6);
    vec3 purple = vec3(0.5, 0.0, 0.8);
    
    // Create color gradients based on position and noise, reacting to mids
    float colorMix = fbm(vec2(uv.x * 0.2 + time * (0.05 + iAudio.y * 0.1), uv.y));
    
    // Mix colors based on position and noise
    vec3 auroraColor = mix(blue, aqua, smoothstep(0.0, 0.5, colorMix));
    auroraColor = mix(auroraColor, pink, smoothstep(0.5, 0.7, colorMix) * 0.3);
    auroraColor = mix(auroraColor, purple, smoothstep(0.7, 1.0, colorMix) * 0.2);
    
    // Add brightness variation, pulsing with bass
    float brightness = 1.0 + 0.2 * sin(time * 0.2 + uv.x * 2.0) + iAudio.x * 0.5;
    auroraColor *= brightness;
    
    // Final aurora color with intensity
    return auroraColor * intensity;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Deep blue background for night sky
    vec3 backgroundColor = vec3(0.0, 0.02, 0.05);
    
    // Generate aurora
    vec3 auroraColor = aurora(uv, iTime);
    
    // Combine background and aurora with subtle glow
    vec3 finalColor = backgroundColor + auroraColor;
    
    // Add subtle glow around the aurora
    float glow = length(auroraColor) * 0.2;
    finalColor += glow * vec3(0.0, 0.1, 0.2);
    
    // Output the final color
    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;
