const source = `
#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function for random values
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
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
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// Fractal Brownian Motion
float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    // 6 octaves of noise
    for(int i = 0; i < 6; i++) {
        sum += amp * snoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

// Vortex swirl effect
vec2 vortex(vec2 uv, vec2 center, float strength, float speed, float time) {
    vec2 delta = uv - center;
    float angle = atan(delta.y, delta.x);
    float dist = length(delta);
    float swirl = strength * (0.5 - dist) * sin(dist * 8.0 - time * speed);
    
    float s = sin(angle + swirl);
    float c = cos(angle + swirl);
    
    return center + vec2(c, s) * dist;
}

// Chromatic aberration
vec3 chromaticAberration(vec2 uv, vec2 center, float strength, float time) {
    float dist = length(uv - center);
    float distortion = strength * dist * dist;
    
    vec2 redOffset = normalize(uv - center) * distortion * 0.02;
    vec2 greenOffset = normalize(uv - center) * distortion * 0.01;
    
    vec3 color;
    color.r = fbm(vortex(uv - redOffset, center, 3.0, 0.5, time));
    color.g = fbm(vortex(uv - greenOffset, center, 3.0, 0.5, time));
    color.b = fbm(vortex(uv, center, 3.0, 0.5, time));
    
    return color;
}

// Rainbow color function
vec3 rainbow(float t) {
    t = fract(t);
    if(t < 0.167) return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.5, 0.0), t * 6.0);
    else if(t < 0.333) return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.167) * 6.0);
    else if(t < 0.5) return mix(vec3(1.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), (t - 0.333) * 6.0);
    else if(t < 0.667) return mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), (t - 0.5) * 6.0);
    else if(t < 0.833) return mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 0.0, 1.0), (t - 0.667) * 6.0);
    else return mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), (t - 0.833) * 6.0);
}

// Particle system
vec3 particles(vec2 uv, vec2 center, float time, float aspect) {
    vec3 color = vec3(0.0);
    
    for(int i = 0; i < 15; i++) {
        float idx = float(i) / 15.0;
        // iAudio.y (mids) increases particle speed
        float angle = idx * TWO_PI + time * (0.1 + idx * 0.2 + iAudio.y * 0.5);
        float radius = 0.2 + 0.15 * sin(time * 0.5 + idx * PI);
        
        vec2 particlePos = center + vec2(cos(angle), sin(angle) / aspect) * radius;
        
        // Particle trail
        // iAudio.x (bass) increases trail length
        float trailLength = 0.1 + 0.2 * sin(time * 0.3 + idx * TWO_PI) + iAudio.x * 0.2;
        for(int j = 0; j < 10; j++) {
            float trailIdx = float(j) / 10.0;
            float trailAngle = angle - trailIdx * 0.8;
            float trailRadius = radius - trailIdx * trailLength;
            
            vec2 trailPos = center + vec2(cos(trailAngle), sin(trailAngle) / aspect) * trailRadius;
            float glow = exp(-100.0 * length(uv - trailPos));
            
            // iAudio.y (mids) shifts color palette
            color += glow * rainbow(idx + time * 0.1 + trailIdx * 0.2 + iAudio.y * 0.2) * (1.0 - trailIdx * 0.8);
        }
    }
    
    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Correct aspect ratio
    float aspect = iResolution.x / iResolution.y;
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv.x *= aspect;

    // Audio-reactive time
    float time = iTime * (1.0 + iAudio.w);
    
    // Center of the screen
    vec2 center = vec2(aspect * 0.5, 0.5);
    
    // Mouse influence
    vec2 mousePos = vec2(iMouse.x / iResolution.x * aspect, iMouse.y / iResolution.y);
    float mouseDistance = length(mousePos - center);
    float mouseInfluence = 0.5 + 0.5 * exp(-mouseDistance * 3.0);
    
    // Modify center based on mouse
    vec2 vortexCenter = mix(center, mousePos, 0.3);
    
    // Pulsating effect at the center
    float pulse = 0.5 + 0.5 * sin(time * 0.5);
    
    // Vortex effect with mouse and bass influence
    // iAudio.x (bass) increases vortex strength
    vec2 swirledUV = vortex(uv, vortexCenter, 3.0 + mouseInfluence * 2.0 + iAudio.x * 3.0, 0.5, time);
    
    // Fractal noise for the center
    float fractalNoise = fbm(swirledUV * (1.0 + pulse * 0.2) + time * 0.1);
    
    // Distance from center for intensity calculations
    float dist = length(uv - vortexCenter);
    
    // Chromatic aberration stronger at the edges, influenced by treble
    // iAudio.z (highs) increases chromatic aberration
    vec3 chromatic = chromaticAberration(uv, vortexCenter, 5.0 * (0.2 + mouseInfluence) + iAudio.z * 5.0, time);
    
    // Particles with trails
    vec3 particleEffect = particles(uv, vortexCenter, time, aspect);
    
    // Combine all effects
    vec3 finalColor = vec3(0.0);
    
    // Deep space background color
    vec3 bgColor = vec3(0.02, 0.0, 0.05);
    
    // Vortex color (starlight blue)
    vec3 vortexColor = vec3(0.4, 0.7, 1.0);
    
    // Center pulsating effect
    float centerIntensity = smoothstep(0.4, 0.0, dist) * (0.5 + 0.5 * pulse);
    finalColor += centerIntensity * mix(vortexColor, vec3(1.0), centerIntensity * 0.5);
    
    // Add fractal noise to the vortex
    finalColor += chromatic * vortexColor * (0.3 + 0.2 * sin(time * 0.3));
    
    // Add particle trails
    finalColor += particleEffect * (1.0 + mouseInfluence);
    
    // Add background
    finalColor = mix(bgColor, finalColor, min(1.0, length(finalColor)));
    
    // Add a subtle glow at the center
    finalColor += vec3(0.6, 0.8, 1.0) * exp(-20.0 * dist) * (1.0 + 0.5 * sin(time));
    
    // Final output with HDR-like effect
    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;