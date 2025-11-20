const source = `
precision mediump float;

#define PI 3.14159265359

// Rotation matrix
mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

// Distance functions
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdRing(vec2 p, float r1, float r2) {
    return abs(length(p) - r1) - r2;
}

float sdLine(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - w;
}

// Noise function
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        val += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return val;
}

// Glow effect
float glow(float d, float strength, float thickness) {
    return strength / (d * d + thickness);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Adjust for aspect ratio
    vec2 uv = (fragCoord / iResolution.xy) - 0.5;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    // Mouse influence
    vec2 mouse = (iMouse.xy / iResolution.xy) - 0.5;
    mouse.x *= aspect;
    float mouseDist = length(uv - mouse);
    float mouseInfluence = smoothstep(0.5, 0.0, mouseDist);
    
    // Base colors
    vec3 bgColor = vec3(0.02, 0.02, 0.05);
    vec3 primaryColor = vec3(1.0, 0.2, 0.5); // Neon pink
    vec3 secondaryColor = vec3(0.0, 0.8, 1.0); // Neon blue
    vec3 accentColor = vec3(1.0, 0.9, 0.2); // Neon yellow
    
    // Time and audio-reactive variables
    float t = iTime * (0.3 + iAudio.w * 0.5);
    
    // Reticle elements
    float pulseFactor = sin(t * (2.0 + iAudio.x * 3.0)) * (0.05 + iAudio.x * 0.1) + 0.95;
    float rotationAngle = sin(t * (0.5 + iAudio.y * 1.5)) * (0.2 + iAudio.y * 0.3);
    
    // Apply rotation to UV for some elements
    vec2 rotatedUV = rotate2d(rotationAngle) * uv;
    
    // Main circle
    float outerRing = sdRing(uv, 0.3 * (1.0 + mouseInfluence * 0.2), 0.005);
    float innerRing = sdRing(uv, 0.2 * pulseFactor, 0.003);
    
    // Crosshair
    float crosshair = min(
        sdLine(rotatedUV, vec2(-0.15, 0.0), vec2(0.15, 0.0), 0.002),
        sdLine(rotatedUV, vec2(0.0, -0.15), vec2(0.0, 0.15), 0.002)
    );
    
    // Tick marks around the outer ring
    float ticks = 1.0;
    for (int i = 0; i < 12; i++) {
        float angle = float(i) * PI / 6.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 startPos = dir * 0.32;
        vec2 endPos = dir * 0.35;
        ticks = min(ticks, sdLine(uv, startPos, endPos, 0.002));
    }
    
    // Small targeting dots
    float targetDots = 1.0;
    for (int i = 0; i < 4; i++) {
        float angle = float(i) * PI / 2.0 + t * (0.2 + iAudio.y * 1.0);
        vec2 pos = vec2(cos(angle), sin(angle)) * 0.25;
        targetDots = min(targetDots, sdCircle(uv - pos, 0.01));
    }
    
    // Central dot that pulses
    float centerDot = sdCircle(uv, 0.02 * (1.0 + sin(t * (3.0 + iAudio.x * 2.0)) * (0.3 + iAudio.x * 0.2)));
    
    // Noise distortion
    vec2 noiseUV = uv * 5.0 + t;
    float noiseFactor = fbm(noiseUV) * (0.002 + iAudio.z * 0.01);
    
    // Apply noise distortion to all elements
    outerRing += noiseFactor * 0.0005;
    innerRing += noiseFactor * 0.0005;
    crosshair += noiseFactor * 0.0005;
    ticks += noiseFactor * 0.0005;
    targetDots += noiseFactor * 0.0005;
    centerDot += noiseFactor * 0.0005;
    
    // Combine all elements with glow
    float glowStrength = 0.02 + mouseInfluence * 0.03 + iAudio.x * 0.05;
    vec3 finalColor = bgColor;
    
    // Outer ring glow
    finalColor += primaryColor * glow(outerRing, 0.01, 0.001);
    
    // Inner ring glow
    finalColor += mix(primaryColor, secondaryColor, 0.5) * glow(innerRing, 0.01, 0.001);
    
    // Crosshair glow
    finalColor += secondaryColor * glow(crosshair, glowStrength, 0.001);
    
    // Ticks glow
    finalColor += mix(primaryColor, accentColor, 0.3) * glow(ticks, 0.008, 0.001);
    
    // Target dots glow
    finalColor += accentColor * glow(targetDots, 0.01, 0.001);
    
    // Center dot glow with color shift from mids
    finalColor += mix(primaryColor, accentColor, sin(t + iAudio.y * 2.0) * 0.5 + 0.5) * glow(centerDot, 0.015, 0.001);
    
    // Add scan lines effect
    float scanLine = sin(uv.y * 100.0 + t * (5.0 + iAudio.z * 10.0)) * 0.5 + 0.5;
    scanLine = pow(scanLine, 10.0) * 0.3;
    finalColor += vec3(scanLine) * primaryColor * 0.2;
    
    // Add vignette
    float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv) * 2.0);
    finalColor *= vignette;
    
    // Add flicker effect
    float flicker = 0.95 + 0.05 * sin(iTime * (10.0 + iAudio.z * 30.0));
    finalColor *= flicker;

    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;
