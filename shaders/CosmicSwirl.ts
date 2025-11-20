
const source = `
// "Cosmic Swirl" - modified from a shader by @XorDev
// Adapted for Shader Sequencer with audio reactivity and compatibility fixes.

#define NUM_OCTAVES 5

// Manual tanh implementation for WebGL 1 compatibility
vec4 Tanh(vec4 x) {
    vec4 ex = exp(x);
    vec4 emx = exp(-x);
    // Add epsilon to avoid division by zero
    return (ex - emx) / (ex + emx + 1e-9);
}

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(x);
        x = rot * x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Audio-reactive time for overall speed
    float time = iTime * (0.5 + iAudio.w * 1.0);

    // Highs (z) affect screen shake
    vec2 shake = vec2(sin(time * 1.5) * 0.01, cos(time * 2.7) * 0.01);
    shake *= (1.0 + iAudio.z * 5.0);

    vec2 p = ((fragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5) / iResolution.y * mat2(8.0, -6.0, 6.0, 8.0);
    vec2 v;
    vec4 o = vec4(0.0);

    // Bass (x) affects the swirl shape/density
    float f = (3.0 + iAudio.x * 4.0) + fbm(p + vec2(time * 7.0, 0.0));

    // COMPATIBILITY FIX: Replaced float-based loop with a standard integer loop.
    for(int i = 1; i <= 50; i++)
    {
        float fi = float(i);
        v = p + cos(fi * fi + (time + p.x * 0.1) * 0.03 + fi * vec2(11.0, 9.0)) * 5.0 + vec2(sin(time * 4.0 + fi) * 0.005, cos(time * 4.5 - fi) * 0.005);

        float tailNoise = fbm(v + vec2(time, fi)) * (1.0 - (fi / 50.0));
        
        // Mids (y) affect the color contribution
        vec4 color_vec = vec4(1.0, 2.0 + iAudio.y, 3.0, 1.0);
        // Add epsilon to length to avoid division by zero
        vec4 currentContribution = (cos(sin(fi) * color_vec) + 1.0) * exp(sin(fi * fi + time)) / (length(max(v, vec2(v.x * f * 0.02, v.y))) + 1e-6);

        float thinnessFactor = smoothstep(0.0, 1.0, fi / 50.0);
        o += currentContribution * (1.0 + tailNoise * 2.0) * thinnessFactor;
    }

    o = Tanh(pow(o / 1e2, vec4(1.5)));
    fragColor = o;
}
`;
export default source;