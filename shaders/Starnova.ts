// Starnova by user, adapted and enhanced by AI for Shader Sequencer.
// This shader creates a smooth, flowing rainbow gradient with audio-reactive properties.

const source = `
// Smooth cosine-based rainbow function
vec3 rainbow(float t) {
    // Audio reactivity: Mids shift the color palette
    t += iAudio.y * 2.0;
    float r = 0.5 + 0.5 * cos(t + 0.0);
    float g = 0.5 + 0.5 * cos(t + 2.0);
    float b = 0.5 + 0.5 * cos(t + 4.0);
    return vec3(r, g, b);
}

// Smooth step function for transitions
float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Setup and UVs ---
    // Normalize to 0-1 range
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    // Stretch x-axis to match aspect ratio, keeping y-axis 0-1
    uv.x *= aspect;
    
    // The center point of the gradient in the new coordinate space
    vec2 center = vec2(aspect * 0.5, 0.5);
    
    // --- Mouse Influence ---
    // Normalize mouse coords to 0-1
    vec2 mouse_norm = iMouse.xy / iResolution.xy;
    // Put mouse coords in same aspect-corrected space as UVs
    vec2 mouse_centered = mouse_norm * vec2(aspect, 1.0);
    
    // Move the center point slightly with the mouse
    float mouseInfluence = 0.2;
    center += (mouse_centered - center) * mouseInfluence;
    
    // Calculate distance from center
    float dist = length(uv - center);
    
    // --- Audio-Reactive Time ---
    float time = iTime * (0.2 + iAudio.w * 0.3);
    
    // Mouse movement adds to the animation speed
    float mouseSpeed = length(mouse_norm - 0.5) * 2.0;
    time += mouseSpeed;
    
    // --- Color Calculation ---
    // Create flowing rainbow effect based on angle, distance, and time
    float angle = atan(uv.y - center.y, uv.x - center.x);
    float rainbowValue = angle + dist * 2.0 + time;
    vec3 rainbowColor = rainbow(rainbowValue);
    
    // Add subtle pulsing, driven by bass
    float pulse = 0.05 * sin(iTime * 0.5) + iAudio.x * 0.05;
    
    // Add variations based on distance
    float distVariation = smootherstep(0.0, 2.0, dist);
    rainbowColor = mix(rainbowColor, rainbow(rainbowValue * 1.5), distVariation * 0.3);
    
    // --- Effects ---
    // Add a vignette effect
    float vignette = smootherstep(1.5 + pulse, 0.0, dist);
    rainbowColor *= vignette * 1.2;
    
    // Enhance saturation, driven by highs
    vec3 gray = vec3(dot(rainbowColor, vec3(0.299, 0.587, 0.114)));
    rainbowColor = mix(gray, rainbowColor, 1.2 + iAudio.z * 0.5);
    
    // Output the final color
    fragColor = vec4(rainbowColor, 1.0);
}
`;
export default source;
