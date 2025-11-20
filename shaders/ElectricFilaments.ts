
const source = `
// "Electric Filaments" - a flowing, mirrored, electric pattern
// Inspired by user reference and enhanced with audio reactivity.

#define TAU 6.28318530718

float hash21(vec2 p){
    p = fract(p*vec2(123.34, 345.45));
    p += dot(p, p+34.345);
    return fract(p.x*p.y);
}

mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

// Smooth value noise
float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i+vec2(0,0));
    float b = hash21(i+vec2(1,0));
    float c = hash21(i+vec2(0,1));
    float d = hash21(i+vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p, float audio_bass){
    // Domain-warped FBM for electric filaments
    float t = 0.0;
    float amp = 0.5;
    mat2 m = rot(0.5);
    for(int i=0;i<5;i++){
        t += amp * noise(p);
        p = m*p*(2.1 + audio_bass * 0.5) + vec2(0.17, -0.23); // Bass makes filaments more chaotic
        amp *= 0.55;
    }
    return t;
}

// Palette: deep blue -> cyan -> orange -> gold
vec3 palette(float x, float audio_mids){
    vec3 a = vec3(0.02, 0.05, 0.08);  // base
    vec3 b = vec3(0.05, 0.30, 0.55);  // blue
    vec3 c = vec3(1.00, 0.55, 0.10);  // orange
    vec3 d = vec3(0.00, 0.80, 1.00);  // cyan
    
    x = fract(x + audio_mids * 0.2); // Mids shift the color palette
    
    vec3 cold  = mix(b, d, smoothstep(0.2, 0.7, x));
    vec3 warm  = mix(c, vec3(1.0,0.85,0.25), smoothstep(0.5, 1.0, x));
    return a + mix(cold, warm, smoothstep(0.4, 0.95, x));
}

// Distance to a wavy "ribbon" centered on a sine curve
float ribbon(vec2 p, float scale, float warp, float amp){
    float y = amp * sin(p.x*scale + warp);
    return abs(p.y - y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 R = iResolution.xy;
    vec2 uv = (fragCoord - 0.5*R)/R.y;

    // Kaleidoscope symmetry
    const float sectors = 6.0;
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    a = abs(mod(a, TAU/sectors) - (TAU/sectors)*0.5);
    vec2 p = vec2(cos(a), sin(a))*r;

    // Subtle mirror to densify filaments
    p.x = abs(p.x);

    // Audio-reactive time and domain warp
    float time = iTime * (0.1 + iAudio.w * 0.3);
    vec2 pw = p;
    float w1 = fbm(pw*2.0 + time, iAudio.x);
    float w2 = fbm(pw*3.7 - time*1.3, iAudio.x);
    float warp = 4.0*w1 + 6.0*w2;

    // Build layered ribbons
    float glow = 0.0;
    float mask = 0.0;
    vec3 col = vec3(0.0);

    for (int k=0; k<3; k++){
        float kk = float(k);
        float sc  = mix(4.0, 12.0, kk/2.0);
        float amp = mix(0.25, 0.05, kk/2.0);
        float d   = ribbon(p*rot(kk*0.4), sc, warp + kk*1.7 + time*1.8, amp);

        float th  = mix(0.010, 0.005, w1);
        float core = smoothstep(th, 0.0, d);
        float g    = 0.012/(d*d + 0.0008);

        float huev = fract(0.15*sc*p.x + 0.22*warp + 0.1*kk);
        vec3  c = palette(huev, iAudio.y);

        col  += c * (core*1.2 + g*0.6);
        glow += g;
        mask  = max(mask, core);
    }

    // Extra filament combs (feathery look)
    float comb = 0.0;
    for (int i=0; i<6; i++){
        float fi = float(i);
        vec2 q = p*rot(fi*0.2 + 1.1);
        float s = sin(q.x*9.0 + warp*0.6 + time*2.0);
        comb += smoothstep(0.045, 0.0, abs(q.y - 0.18*s));
    }
    comb /= 6.0;

    // Base background with vignette and sparks
    float vign = smoothstep(1.4, 0.2, length(uv));
    float spark = pow(max(0.0, fbm(p*7.0 + time*2.0, iAudio.x) - 0.55), 3.0);

    vec3 bg = vec3(0.01, 0.02, 0.04);
    vec3 finalCol = bg * (0.7 + 0.3*vign) + col;
    finalCol += 0.25 * comb * palette(0.65 + 0.35*fbm(p*5.0 - time, iAudio.x), iAudio.y) * (1.0 + iAudio.z * 1.5); // Treble boosts comb brightness
    finalCol += 0.6 * spark * (1.0 + iAudio.z * 1.0); // Treble boosts spark brightness

    // High-energy boost and tone mapping
    finalCol = pow(finalCol, vec3(0.85));
    finalCol *= 1.2 + 0.3*glow;

    // Subtle white hot core
    finalCol += 0.12*vec3(1.0)*(mask*glow);

    fragColor = vec4(finalCol, 1.0);
}
`;
export default source;
