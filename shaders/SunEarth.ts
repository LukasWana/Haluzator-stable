
const source = `
/*
I learned shader coding from the below links:
The Art of Code [YouTube: https://www.youtube.com/@TheArtofCodeIsCool]
NuSan FX [YouTube: https://www.youtube.com/@NuSan_fx]
Evvvvil [Twitch: https://www.twitch.tv/evvvvil_]
*/

// Number of iterations used in ray marching loop.
#define ITR 150
// Maximum ray marching distance
#define DST 90.0
// Anything less than this is counted as surface collision in the ray marching loop
#define SRF 0.001
// Used in normal calculations
#define EPS vec2(0.0001, -0.0001)
// Number of scene primitives
#define NSO 4
// used to move the sun into the earth
vec3 r0 = vec3(0);

#define PI 3.14159265359
#define RT(X) mat2(cos(X), -sin(X), sin(X), cos(X))
#define RND(X) fract(sin(dot(X, vec2(132.0, 513.1))) * 1331.23)
float g = 0.0;
float t = 0.0;

float snoise(vec2 uv)
{
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    
    float a = RND(i + vec2(0, 0));
    float b = RND(i + vec2(1, 0));
    float c = RND(i + vec2(0, 1));
    float d = RND(i + vec2(1, 1));
    
    vec2 u = smoothstep(0.0, 1.0, f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x)
                          + (d - b) * u.x * u.y;
}

// Cheap box
float box(vec3 sp, vec3 dm)
{
    sp = abs(sp) - dm;
    return max(max(sp.x, sp.y), sp.z);
}


// Map signed distance functions of the scene
vec2 map(vec3 sp)
{
    float dst[NSO];
    vec3 sp1 = sp;
    vec3 sp2 = sp;
    dst[0] = sp.y + 5.0 + snoise(sp.xz + t) * 0.05 + snoise(sp.xz * 0.1 + 23.0 + t * 1.1) * 0.2;
    sp.z = mod(sp.z + t, 6.0) - 3.0;
    sp1.z = sp.z;
    sp.y += 2.0 + sin(sp.z + t) * 0.2;
    for (int i = 0; i < 5; i++)
    {
        sp = abs(sp) - vec3(0, 0, 3);
        sp.xz *= RT(2.84);
    }
    
    dst[1] = box(sp, vec3(0.1, 0.1, 3.0));
    dst[2] = box(abs(sp1 + vec3(0, 5, 0)) - vec3(3, 0, 0), vec3(0.1, 4.0, 0.1));
    sp2 += vec3(40.0, t - 23.0, 51);
    dst[3] = length(mix(sp2, r0, clamp(t + 5.0, 0.0, 7.4) * 0.5 - 2.5)) - 1.0;
    
    // Audio-reactive glow
    g += pow(1.0 / max(dst[3], 0.001), 1.6) * (1.0 + iAudio.x * 2.0);
    
    float id = 0.0;
    for (int i = 1; i < NSO; i++) {
        if (dst[i] < dst[0]) {
            dst[0] = dst[i];
            id = float(i);
        }
    }
    
    return vec2(dst[0] * 0.89, id);
}



// March the rays
vec2 mrch(vec3 ro, vec3 rd) {
    float d0 = 0.0;
    float id = 0.0;
    for (int i = 0; i < ITR; i++) {
        vec3 sp = ro + rd * d0;
        vec2 ds = map(sp);
        if (d0 > DST || abs(ds.x) < SRF) break;
        d0 += ds.x;
        id = ds.y;
    }
    
    if (d0 > DST) d0 = 0.0;
    return vec2(d0, id);
}


// Normal for lighting calculations
vec3 nml(vec3 sp)
{
    return normalize(EPS.xyy * map(sp + EPS.xyy).x +
                     EPS.yyx * map(sp + EPS.yyx).x +
                     EPS.yxy * map(sp + EPS.yxy).x +
                     EPS.xxx * map(sp + EPS.xxx).x);
}


void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Audio-reactive time
    float time = iTime * (1.0 + iAudio.w * 0.5);
    t = mod(time, PI * 4.0);
    
    // Ray origin (position of camera)
    float a = PI * 0.25;
    vec3 ro = vec3(cos(a) * 7.0, 1, sin(a) * 7.0);
    ro = mix(ro, vec3(5, 5, -4), clamp(t - 2.0, 0.0, 1.0));
    ro = mix(ro, vec3(0.1, -3.0, -3), clamp(t - 5.0, 0.0, 1.0));
    r0 = ro;
    
    // Point camera is fixated
    vec3 fx = mix(vec3(0), vec3(0, -3.0, 0), clamp(t - 5.0, 0.0, 1.0));
    
    // camera stuff
    vec3 w = normalize(fx - ro);
    vec3 u = normalize(cross(w, vec3(0, 1, 0)));
    vec3 v = normalize(cross(u, w));
    vec3 rd = normalize(mat3(u, v, w) * vec3(uv, 1.0));
    vec3 clr = vec3(0);
    
    // light position
    vec3 lp = vec3(5.5, 3.15, -4.0);
    
    // Colors of scene objects indexed by id
    vec3 obj_clrs[NSO];
    obj_clrs[0] = vec3(0.015);
    obj_clrs[1] = vec3(cos(uv.x + t), 0.5 + iAudio.y * 0.5, sin(uv.y + t)); // Audio-reactive color
    obj_clrs[2] = vec3(0);
    obj_clrs[3] = vec3(1);

    vec3 acc = vec3(1.0);
    
    // background color
    vec3 bgc = vec3(1.0 - length(uv * 0.5)) * vec3(0.1, 0.2, 0.3);
    clr = bgc;
    
    for (int i = 0; i < 2; i++) {
        vec2 ds = mrch(ro, rd);
        float d = ds.x;
        int id = int(ds.y);

        if (d > 0.0) {
            vec3 sp = ro + rd * d;
            vec3 n = nml(sp);
            vec3 ld = normalize(lp - sp);
            
            vec3 clr_add = vec3(0);
            float df = max(0.0, dot(n, ld));
            float ao = clamp(map(sp + n * 0.5).x / 0.5, 0.0, 1.0);
            float spc = pow(max(dot(reflect(-ld, n), -rd), 0.0), 200.0);

            vec3 amb = obj_clrs[0];
            if (id == 1) amb = obj_clrs[1];
            else if (id == 2) amb = obj_clrs[2];
            else if (id == 3) amb = obj_clrs[3];

            clr_add = amb * ao *df + spc;
            clr_add = mix(clr_add, bgc, 1.0 - exp(-0.00011 * pow(d, 2.0)));
            clr = clr_add * acc;
            
            rd = reflect(rd, n);
            acc *= 0.8;
            ro = sp + 0.01 * rd;
        }
    }
    // Highs affect glow color
    clr += g * (0.6 + obj_clrs[1] * (0.5 + iAudio.z));
    fragColor = vec4(pow(clr, vec3(0.4545)), 1.0);
}
`;
export default source;
