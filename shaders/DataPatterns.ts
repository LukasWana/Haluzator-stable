const source = `
// Data Patterns by AxiomCrux.net
// Adapted and enhanced for VJ App

#define TWO_PI 6.28318530718

// Using fixed seeds for consistency
#define seed 71.34
#define seed2 seed+218.0
#define seed1 seed+3578.1
#define seed3 seed+45378.0

// --- Utility Functions ---
mat2 rot(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s, s, c);
}

float ranf(in float x) { return fract(sin(x)*1e4);}
float rant(in vec2 st) { return fract(sin(dot(st.xy, vec2(seed1,seed2)))*seed3);}

float pattern(vec2 st, vec2 v, float t) {
    vec2 p = floor(st+v);
    return step(t, rant(100.+p*.000001)+ranf(p.x)*0.5 );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Audio-reactive parameters ---
    // Overall volume pulses the pattern speed and direction.
    float rate = (0.5 - iAudio.w) * 0.3; 
    // Low frequencies control the density of data bits.
    float density = 100.0 + iAudio.x * 1200.0;
    // Mid and High frequencies stretch and scale the grid.
    vec2 grid = vec2(25.0 + iAudio.y * 50.0, 30.0 + iAudio.z * 60.0);
    // Mid frequencies also affect the velocity grid.
    vec2 grid2 = vec2(6.0 + iAudio.y * 20.0, 50.0);
    // High frequencies create a vertical wipe/band effect.
    float shift = iAudio.z * 0.9;
    // Mid frequencies control the blend between cartesian and polar coordinates.
    float curve = 0.5 + iAudio.y * 0.5; 
    float offset = -0.05;

    // --- Static defines based on original inputs ---
    #define offset1 (offset<5.0)?offset*5.1:1.0
    #define offset2 (offset>5.0)?(offset-5.0)*0.01:0.0
    
    vec2 st = fragCoord.xy/iResolution.xy;
    st.x *= iResolution.x/iResolution.y;
    
    // Center coordinates and apply a subtle audio-reactive rotation
    vec2 center = vec2(0.5 * iResolution.x/iResolution.y, 0.5);
	st -= center;
    st *= rot(iTime * 0.05 + iAudio.w * 0.3);
 
    // Polar coordinates transformation
    // FIX: Normalize angle to a 0-1 range to remove the seam/artifact from atan().
    vec2 polar;
    polar.x = ((atan(st.y, st.x) / TWO_PI) + 0.5) * 10.0;
    polar.y = length(st) * 2.0;
    st = mix(st, polar, curve);
    
    st *= grid;

    vec2 ipos = floor(st);
    vec2 fpos = fract(st);
    
    vec2 vel = vec2(iTime*rate*max(grid.x,grid.y));
    vel *= vec2(-1.,0.0) * ranf(1.0+ipos.y);
    vel *= grid2;
    
    vec2 off1 = vec2(offset1,0.);
    vec2 off2 = vec2(offset2,0.);
    
    vec3 color = vec3(0.0);
    // Generate patterns for R, G, B channels with slight offsets for chromatic aberration.
    // FIX: Changed '+' to '-' in the threshold calculation. A higher density (from audio)
    // now correctly LOWERS the threshold, making more pixels visible.
    color.r = pattern(st+off1,vel,0.5-density/iResolution.x);
    color.g = pattern(st,vel,0.5-density/iResolution.x);
    color.b = pattern(st-off2,vel,0.5-density/iResolution.x);
    
    // Apply the vertical wipe effect with a soft edge.
    color *= smoothstep(shift, shift + 0.1, fpos.y);
    
    // FIX: Slightly reduce the final color's brightness. Pure white (1.0) has 100% lightness
    // in HSL, which prevents the "Color" blend mode from applying a new hue.
    // A very light gray (e.g., 0.98) allows for proper color mixing.
    fragColor = vec4(color * 0.98, 1.0);
}
`;
export default source;