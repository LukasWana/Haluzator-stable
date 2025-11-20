
// Fractal Vortex by user, adapted for Shader Sequencer

const source = `
float det = 0.001; // This can be a constant

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, s, -s, c);
}

vec3 path(float t_in) {
    vec3 p = vec3(vec2(sin(t_in * 0.1), cos(t_in * 0.05)) * 10.0, t_in);
    p.x += smoothstep(0.0, 0.5, abs(0.5 - fract(t_in * 0.02))) * 10.0;
    return p;
}

float fractal(vec2 p, float t_in) {
    p = abs(5.0 - mod(p * 0.2, 10.0)) - 5.0;
    float ot = 1000.0;
    for (int i = 0; i < 7; i++) {
        p = abs(p) / clamp(p.x * p.y, 0.25, 2.0) - 1.0;
        if (i > 0) ot = min(ot, abs(p.x) + 0.7 * fract(abs(p.y) * 0.05 + t_in * 0.05 + float(i) * 0.3));
    }
    ot = exp(-10.0 * ot);
    return ot;
}

float box(vec3 p, vec3 l) {
    vec3 c = abs(p) - l;
    return length(max(vec3(0.0), c)) + min(0.0, max(c.x, max(c.y, c.z)));
}

// DE function needs access to adv, t, and needs to output boxp, boxhit
float de(vec3 p, vec3 adv, float t_in, out vec3 out_boxp, out float out_boxhit) {
    out_boxhit = 0.0;
    vec3 p2 = p - adv;
    p2.xz *= rot(t_in * 0.2);
    p2.xy *= rot(t_in * 0.1);
    p2.yz *= rot(t_in * 0.15);
    float b = box(p2, vec3(1.0));
    p.xy -= path(p.z).xy;
    float s = sign(p.y);
    p.y = -abs(p.y) - 3.0;
    p.z = mod(p.z, 20.0) - 10.0;
    for (int i = 0; i < 5; i++) {
        p = abs(p) - 1.0;
        p.xz *= rot(radians(s * -45.0));
        p.yz *= rot(radians(90.0));
    }
    float f = -box(p, vec3(5.0, 5.0, 10.0));
    float d = min(f, b);
    if (d == b) {
        out_boxp = p2;
        out_boxhit = 1.0;
    }
    return d * 0.7;
}

vec3 march(vec3 from, vec3 dir, vec3 adv, float t_in, vec2 fragCoord) {
    vec3 p, n;
    vec3 g = vec3(0.0);
    float d, td = 0.0;
    float boxhit = 0.0;
    vec3 boxp = vec3(0.0);
    
    // Audio influence on detail level
    int steps = 80 + int(iAudio.y * 40.0);
    
    for (int i = 0; i < 120; i++) {
        if (i >= steps) break;
        
        p = from + td * dir;
        // pass boxp and boxhit as out params
        d = de(p, adv, t_in, boxp, boxhit) * (1.0 - hash(fragCoord + t_in) * 0.3);
        if (d < det && boxhit < 0.5) break;
        td += max(det, abs(d));

        if(td > 100.0) break; // Far clip

        float f = fractal(p.xy, t_in) + fractal(p.xz, t_in) + fractal(p.yz, t_in);
        float b = fractal(boxp.xy, t_in) + fractal(boxp.xz, t_in) + fractal(boxp.yz, t_in);
        
        // Yellow vortex instead of orange, audio reactive
        vec3 colf = vec3(f) * vec3(1.0, 1.0, 0.5 + 0.5 * sin(t_in*0.1));
        vec3 colb = vec3(b + 0.3, b + 0.3, 0.0); // More yellow, pulses with bass
        colb.r += iAudio.x * 0.5;
        
        // Increased clarity
        g += colf / (2.5 + d * d * 1.5) * exp(-0.0012 * td * td) * step(5.0, td) / 2.0 * (1.0 - boxhit);
        g += colb / (8.0 + d * d * 15.0) * boxhit * 0.6;
    }
    return g;
}

mat3 lookat(vec3 dir, vec3 up) {
    dir = normalize(dir);
    vec3 rt = normalize(cross(dir, normalize(up)));
    return mat3(rt, cross(rt, dir), dir);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    
    // Use app's time and audio uniforms
    float t = iTime * (7.0 + iAudio.w * 5.0);
    
    // Audio influence on camera
    vec2 audioOffset = vec2(iAudio.y - iAudio.x, iAudio.z - iAudio.y) * 0.5;
    
    vec3 from = path(t);
    vec3 adv = path(t + 6.0 + sin(t * 0.1) * 3.0 + audioOffset.x * 2.0);
    
    vec3 dir = normalize(vec3(uv, 0.7 + audioOffset.y * 0.3));
    dir = lookat(adv - from, vec3(0.0, 1.0, 0.0)) * dir;
    
    vec3 col = march(from, dir, adv, t, fragCoord);
    
    // Enhance yellow and add some subtle glow, reactive to treble
    col = mix(col, vec3(1.0, 1.0, 0.3), length(col) * 0.15);
    col *= 1.0 + 0.2 * sin(t * 0.1) + iAudio.z * 0.3;
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;
