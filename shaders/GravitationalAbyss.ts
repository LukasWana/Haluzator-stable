const source = `
// Gravitational Abyss by user, adapted and enhanced by AI
// Features a black hole with an accretion disk and gravitational lensing.

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// --- SDF Primitives ---
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdRing(vec2 p, float r, float thickness) {
    return abs(length(p) - r) - thickness;
}

// --- HSV to RGB Conversion ---
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// --- Noise Functions (Simplex-like for better quality) ---
vec2 hash( vec2 p ) {
	p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p ) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
	vec2 i = floor(p + (p.x+p.y)*K1);	
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
	vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    // Remap noise from [-1, 1] to [0, 1] range.
    return dot(n, vec3(70.0)) * 0.5 + 0.5;	
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    
    for(int i = 0; i < 6; i++) {
        sum += amp * noise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    
    return sum;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Setup and Audio ---
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float time = iTime * (0.1 + iAudio.w * 0.2); // Overall speed
    vec2 p = uv;
    
    // --- Black hole parameters with audio reactivity ---
    float blackHoleRadius = 0.1 + 0.05 * sin(time * 2.0) + pow(iAudio.x, 2.0) * 0.08; // Bass pulsates radius
    float accretionDiskRadius = 0.25 + 0.05 * sin(time);
    float accretionDiskThickness = 0.03;
    
    // --- Shapes ---
    float blackHole = sdCircle(p, blackHoleRadius);
    float accretionDisk = sdRing(p, accretionDiskRadius, accretionDiskThickness);
    
    // --- Gravitational lensing effect ---
    float distortion = (0.1 + pow(iAudio.x, 1.5) * 0.15) / (length(p) + 0.1); // Bass enhances lensing
    vec2 lensedUV = uv + p * distortion * 0.1;
    
    // --- Star field ---
    float stars = 0.0;
    for (int i = 1; i < 4; i++) {
        float scale = float(i) * 10.0;
        // Use lensedUV for stars behind the black hole
        stars += smoothstep(0.97, 1.0, noise(lensedUV * scale + time * 0.1));
    }
    stars *= (1.0 + iAudio.z * 1.5); // Highs make stars brighter

    // --- Accretion disk ---
    float angle = atan(p.y, p.x);
    // Mids create turbulence
    float diskNoise = fbm(vec2(angle * 3.0 + time * 2.0, time * 0.5 + iAudio.y * 2.0)); 
    float diskGlow = smoothstep(0.05, 0.0, accretionDisk) * (0.5 + 0.5 * diskNoise);
    
    // Mids speed up rotation
    float hue = fract(angle / TWO_PI + time * (0.5 + iAudio.y) + diskNoise * 0.1); 
    // Highs add brightness to the disk
    vec3 diskColor = hsv2rgb(vec3(hue, 0.8, 1.0 + iAudio.z * 0.5));
    
    // --- Effects ---
    float eventHorizon = smoothstep(0.0, -0.05, blackHole);
    float lightBending = smoothstep(0.2, 0.0, length(p) - blackHoleRadius);
    
    // --- Final Composition ---
    vec3 color = vec3(0.0);
    color += stars * vec3(0.8, 0.9, 1.0) * (1.0 - lightBending);
    color += diskGlow * diskColor * 2.0;
    color = mix(color, vec3(0.0), eventHorizon);
    
    float blueGlow = smoothstep(0.15, 0.0, blackHole - 0.05);
    color += blueGlow * vec3(0.0, 0.2, 0.5) * (1.0 - eventHorizon);

    fragColor = vec4(color, 1.0);
}
`;
export default source;