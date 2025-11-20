const source = `
// QuantumVortex by AI, based on user submission
// Features a swirling vortex with particles and audio reactivity.

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function for randomization
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 2D simplex noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
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

// Fractal Brownian Motion
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// Vortex function
float vortex(vec2 uv, vec2 center, float time, float strength) {
    vec2 delta = uv - center;
    float angle = atan(delta.y, delta.x);
    float dist = length(delta);
    
    float spiral = angle + strength / (dist + 0.0001);
    float vortexVal = sin(spiral * 5.0 + time * 2.0) * 0.5 + 0.5;
    
    return vortexVal * smoothstep(1.0, 0.0, dist * 2.0);
}

// Chromatic aberration
vec3 chromaticAberration(vec2 uv, vec2 center, float strength, float time) {
    vec2 dir = normalize(uv - center);
    float dist = length(uv - center);
    
    float redOffset = snoise(uv * 2.0 + time * 0.1) * strength * dist;
    float greenOffset = snoise(uv * 2.1 + time * 0.12) * strength * dist;
    float blueOffset = snoise(uv * 2.2 + time * 0.14) * strength * dist;
    
    float red = vortex(uv - dir * redOffset, center, time, 5.0);
    float green = vortex(uv - dir * greenOffset, center, time, 5.0);
    float blue = vortex(uv - dir * blueOffset, center, time, 5.0);
    
    return vec3(red, green, blue);
}

// Star particle function
vec3 starParticle(vec2 uv, vec2 center, float time) {
    vec3 color = vec3(0.0);
    
    // Generate several particles
    for (int i = 0; i < 50; i++) {
        float t = float(i) / 50.0;
        // Mids affect particle speed
        float angle = t * TWO_PI + time * (0.2 + t * 0.8 + iAudio.y * 0.5);
        float dist = 0.2 + 0.6 * t + 0.1 * sin(time * 2.0 + t * 10.0);
        
        vec2 particlePos = center + vec2(cos(angle), sin(angle)) * dist;
        
        // Particle movement based on vortex
        float vortexInfluence = vortex(particlePos, center, time, 3.0);
        particlePos = mix(particlePos, center, vortexInfluence * 0.2);
        
        // Calculate distance and create particle
        float d = length(uv - particlePos);
        // Highs affect particle size
        float particleSize = (0.005 + 0.01 * hash21(vec2(t, time * 0.1))) * (1.0 + iAudio.z * 1.5);
        
        // Trail effect
        vec2 trailDir = normalize(center - particlePos);
        // Bass affects trail length
        float trailLen = (0.05 + 0.1 * hash21(vec2(t, 0.5))) * (1.0 + iAudio.x * 2.0);
        
        for (int j = 0; j < 5; j++) {
            float trailT = float(j) / 5.0;
            vec2 trailPos = particlePos + trailDir * trailLen * trailT;
            float trailDist = length(uv - trailPos);
            float trailBrightness = smoothstep(particleSize, 0.0, trailDist) * (1.0 - trailT);
            
            // Rainbow coloring for trails
            float hue = t * 6.28 + time * 0.2 + trailT * 2.0;
            vec3 trailColor = 0.5 + 0.5 * vec3(
                cos(hue),
                cos(hue + 2.0944), // 2π/3
                cos(hue + 4.1888)  // 4π/3
            );
            
            color += trailColor * trailBrightness * 0.5;
        }
        
        // Main particle
        float brightness = smoothstep(particleSize, 0.0, d);
        color += vec3(1.0) * brightness;
    }
    
    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Adjust for aspect ratio
    vec2 uv = fragCoord / iResolution.xy;
    float aspectRatio = iResolution.x / iResolution.y;
    uv.x *= aspectRatio;
    
    // Center coordinates
    vec2 center = vec2(aspectRatio * 0.5, 0.5);
    
    // Mouse influence
    vec2 mousePos = iMouse.xy / iResolution.xy;
    mousePos.x *= aspectRatio;
    float mouseDistance = length(mousePos - center);
    center = mix(center, mousePos, smoothstep(0.5, 0.0, mouseDistance) * 0.5);
    
    // Audio-reactive time
    float time = iTime * (1.0 + iAudio.w * 0.5);

    // Vortex effect
    float vortexStrength = 5.0 + 3.0 * sin(time * 0.2) + iAudio.x * 4.0;
    float vortexVal = vortex(uv, center, time, vortexStrength);
    
    // Fractal noise for the center pulsation
    float centerPulse = fbm(uv * 3.0 + time * 0.1, 5);
    centerPulse = pow(centerPulse, 2.0) * 2.0;
    
    // Depth effect
    float depth = 0.0;
    float scale = 1.0;
    float totalWeight = 0.0;
    
    for (int i = 0; i < 6; i++) {
        float weight = 1.0 / pow(2.0, float(i));
        totalWeight += weight;
        depth += fbm(uv * scale + time * 0.05 * (1.0 - float(i) * 0.1), 3) * weight;
        scale *= 2.0;
    }
    
    depth /= totalWeight;
    
    // Calculate distance to center for various effects
    float dist = length(uv - center);
    
    // Chromatic aberration stronger at edges, reactive to highs
    vec3 chromatic = chromaticAberration(uv, center, (0.05 + 0.05 * sin(time)) * (1.0 + iAudio.z * 2.0), time);
    
    // Star particles with trails
    vec3 particles = starParticle(uv, center, time);
    
    // Combine effects
    vec3 color = vec3(0.0);
    
    // Deep space background
    vec3 bgColor = vec3(0.02, 0.01, 0.05);
    
    // Vortex color - liquid starlight, reactive to mids
    vec3 vortexColor = mix(
        vec3(0.1, 0.2, 0.5) + iAudio.y * 0.2, // Deep blue
        vec3(0.6, 0.7, 1.0), // Bright blue/white
        vortexVal
    );
    
    // Add depth effect to vortex
    vortexColor = mix(vortexColor, vec3(0.8, 0.9, 1.0), depth * 0.5);
    
    // Pulsating center
    float centerGlow = smoothstep(0.4, 0.0, dist) * (0.5 + 0.5 * sin(time * 1.5));
    vec3 centerColor = mix(
        vec3(0.5, 0.7, 1.0),
        vec3(0.8, 0.5, 1.0),
        centerPulse
    );
    
    // Combine all elements
    color = bgColor;
    color = mix(color, vortexColor, smoothstep(1.0, 0.0, dist * 2.0) * 0.8);
    color = mix(color, centerColor, centerGlow * centerPulse);
    
    // Apply chromatic aberration
    color *= 1.0 + chromatic * smoothstep(0.2, 1.0, dist) * 0.5;
    
    // Add particles
    color += particles;
    
    // Final adjustments - make brighter where mouse is
    float mouseBrightness = smoothstep(0.5, 0.0, length(uv - mousePos)) * 0.3;
    color += mouseBrightness * vec3(0.6, 0.7, 1.0);
    
    // Output
    fragColor = vec4(color, 1.0);
}
`;
export default source;
