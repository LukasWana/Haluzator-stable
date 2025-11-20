const source = `
// --- Noise Functions (from CloudySky.ts for smoother, non-grid results) ---
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
    return dot(n, vec3(70.0));	
}

const mat2 mtx = mat2( 0.80,  0.60, -0.60,  0.80 );

// Fractal Brownian Motion using the new Simplex noise
float fbm( vec2 p )
{
    float f = 0.0;
    float amp = 0.5;
    // More octaves for richer detail
    for (int i=0; i<6; i++) {
        f += amp * noise( p ); 
        p = mtx*p*2.02;
        amp *= 0.5;
    }
    return f;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = fragCoord.xy / iResolution.xy;
    p.x *= iResolution.x/iResolution.y;
    vec2 q = p;

    float time = iTime * (0.2 + pow(iAudio.w, 1.5) * 0.4);
    
    // First layer of Simplex noise for displacement. Range is [-1, 1].
    float r = fbm( q*2.0 + time ); 
    
    // Second layer, displaced by the first, for a mixing effect.
    float c = fbm( q*1.5 + r*0.8 - time*0.5);
    
    // Remap noise from [-1, 1] to a more usable [0, 1] range.
    c = c * 0.5 + 0.5;

    // --- Contrast Enhancement ---
    // Create sharp boundaries between colors. High frequencies (z) make the boundaries sharper.
    float lower_bound = 0.45 - iAudio.z * 0.15;
    float upper_bound = 0.55 + iAudio.z * 0.15;
    float c_contrast = smoothstep(lower_bound, upper_bound, c);

    // --- New Coloring Logic ---
    // A more vibrant, liquid-like color palette
    vec3 color_dark = vec3(0.02, 0.0, 0.1);   // Deep Indigo
    vec3 color_mid  = vec3(0.1, 0.5, 1.0);   // Electric Blue
    vec3 color_light = vec3(0.8, 1.0, 1.0);  // Cyan highlights
    
    // Mix between dark and mid colors using the high-contrast noise value
    vec3 color = mix(color_dark, color_mid, c_contrast);
    
    // Add bright highlights to the peaks of the noise. Bass (x) makes highlights stronger.
    float highlights = pow(c, 5.0) * (1.0 + iAudio.x * 2.0);
    color = mix(color, color_light, highlights);
    
    // Add a central glow effect that pulses with mid-range frequencies (y).
    float glow_dist = length(q-vec2(0.5 * iResolution.x/iResolution.y, 0.5));
    float glow = (1.0 - smoothstep(0.0, 0.8, glow_dist)) * (0.5 + iAudio.y * 1.5);
    color += glow * vec3(0.1, 0.3, 0.5);

    fragColor = vec4(color,1.0);
}
`;
export default source;
