
const source = `
precision mediump float;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// 3D noise
float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(
        mix(
            mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 157.0), hash(n + 158.0), f.x),
            f.y),
        mix(
            mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 270.0), hash(n + 271.0), f.x),
            f.y),
        f.z);
}

// Fractional Brownian Motion
float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 6; i++) {
        f += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return f;
}

// Star field
vec3 starField(vec2 uv, float speed, float time) {
    vec3 color = vec3(0.0);
    
    // Rotate the star field slowly
    float angle = time * 0.01;
    float s = sin(angle);
    float c = cos(angle);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    // Create multiple layers of stars
    for(int i = 0; i < 3; i++) {
        float depth = float(i) * 0.2 + 0.1;
        float scale = mix(15.0, 30.0, depth);
        float fade = smoothstep(0.8, 0.0, depth) * 0.8;
        
        vec2 p = uv * scale;
        
        vec3 pos = vec3(p, time * (speed + iAudio.z * 0.2) * (depth + 0.1));
        float n = max(0.0, noise(pos * 10.0) - (0.6 - 0.4 * depth));
        n = pow(n, 20.0 - depth * 15.0) * 5.0;
        
        // Add stars with different colors
        vec3 starColor = mix(
            vec3(0.7, 0.7, 1.0),  // Bluish stars
            vec3(1.0, 0.9, 0.8),   // Yellowish stars
            hash(pos.x + pos.y * 100.0 + pos.z)
        );
        
        color += n * fade * starColor;
    }
    
    return color;
}

// Galaxy dust cloud function
vec3 galaxyDust(vec2 uv, float time) {
    // Rotate the galaxy
    float angle = time * 0.02;
    float s = sin(angle);
    float c = cos(angle);
    vec2 rotatedUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    // Create spiral arms
    float r = length(rotatedUv);
    float theta = atan(rotatedUv.y, rotatedUv.x);
    
    // Spiral function
    float spiral = sin(theta * 2.0 + r * (4.0 + iAudio.y * 2.0) - time * 0.1) * 0.5 + 0.5;
    spiral = smoothstep(0.4, 0.6, spiral) * smoothstep(1.0, 0.2, r);
    
    // Add some noise to the spiral
    vec3 p = vec3(rotatedUv * 3.0, time * 0.05);
    float noiseVal = fbm(p);
    
    // Combine spiral and noise
    float dustDensity = spiral * noiseVal * smoothstep(1.0, 0.0, r);
    
    // Dust colors
    vec3 dustColor1 = vec3(0.6, 0.3, 0.9); // Purple
    vec3 dustColor2 = vec3(0.2, 0.5, 0.9); // Blue
    vec3 dustColor3 = vec3(0.9, 0.6, 0.3); // Orange
    
    vec3 finalDustColor = mix(
        mix(dustColor1, dustColor2, noiseVal),
        dustColor3,
        sin(theta * 5.0 + time * 0.1) * 0.5 + 0.5
    );
    
    return finalDustColor * dustDensity;
}

// Star cluster function
vec3 starCluster(vec2 uv, float time) {
    float angle = time * 0.03;
    float s = sin(angle);
    float c = cos(angle);
    vec2 rotatedUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    // Create several clusters at different positions
    vec3 clusterColor = vec3(0.0);
    
    for(int i = 0; i < 5; i++) {
        float clusterAngle = float(i) * TWO_PI / 5.0 + time * 0.05;
        float clusterDist = 0.3 + float(i) * 0.1;
        
        vec2 clusterPos = vec2(
            cos(clusterAngle) * clusterDist,
            sin(clusterAngle) * clusterDist
        );
        
        float dist = length(rotatedUv - clusterPos);
        float brightness = smoothstep(0.2, 0.0, dist) * 2.0;
        
        // Vary the cluster colors
        vec3 thisClusterColor = mix(
            vec3(0.9, 0.8, 1.0), // Bright white-purple
            vec3(1.0, 0.9, 0.7), // Warm yellow
            float(i) / 5.0
        );
        
        clusterColor += brightness * thisClusterColor;
    }
    
    // Add a central bright cluster
    float centralBrightness = smoothstep(0.1, 0.0, length(rotatedUv)) * 3.0;
    clusterColor += centralBrightness * vec3(1.0, 0.9, 0.8);
    
    return clusterColor;
}

// Galactic core glow
vec3 galacticCore(vec2 uv, float time) {
    float r = length(uv);
    
    // Core glow
    float coreBrightness = smoothstep(0.3, 0.0, r);
    vec3 coreColor = mix(
        vec3(1.0, 0.9, 0.7), // Yellowish core
        vec3(0.9, 0.6, 0.3), // Orange-ish outer core
        r * 3.0
    );
    
    // Add some pulsing
    coreBrightness *= 1.0 + 0.1 * sin(time * 0.5) + iAudio.x * 0.3;
    
    return coreColor * coreBrightness;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float time = iTime * (1.0 + iAudio.w * 0.5);

    // Correct aspect ratio
    vec2 v_uv = fragCoord / iResolution.xy;
    vec2 uv = v_uv - 0.5;
    uv.x *= iResolution.x / iResolution.y;
    
    // Mouse interaction
    vec2 mousePos = (iMouse.xy / iResolution.xy) - 0.5;
    mousePos.x *= iResolution.x / iResolution.y;
    float mouseDist = length(uv - mousePos);
    float mouseInfluence = smoothstep(0.3, 0.0, mouseDist);
    
    // Apply mouse influence to zoom and rotation
    uv *= 1.0 - mouseInfluence * (0.3 + iAudio.z * 0.2); // Treble enhances zoom
    float mouseAngle = mouseInfluence * 0.5;
    float s = sin(mouseAngle);
    float c = cos(mouseAngle);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    // Background stars (distant stars)
    vec3 color = starField(uv, 0.1, time) * 0.5;
    
    // Galaxy components
    color += galaxyDust(uv, time);
    color += starCluster(uv, time);
    color += galacticCore(uv, time);
    
    // Add more stars in the foreground
    color += starField(uv * 2.0, 0.2, time) * 0.3;
    
    // Add vignette effect
    float vignette = smoothstep(1.0, 0.3, length(v_uv - 0.5) * 1.5);
    color *= vignette;
    
    // Enhance contrast
    color = pow(color, vec3(0.8));
    
    // Set final color
    fragColor = vec4(color, 1.0);
}
`;
export default source;
