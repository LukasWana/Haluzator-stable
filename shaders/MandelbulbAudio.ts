const source = `
#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001

vec3 getRayDir(vec2 uv, vec3 p, vec3 l, float z) {
    vec3 f = normalize(l-p),
        r = normalize(cross(vec3(0,1,0), f)),
        u = cross(f,r),
        c = f*z,
        i = c + uv.x*r + uv.y*u;
    return normalize(i);
}

vec2 mandelbulb(vec3 pos) {
    float n = 8.0 + iAudio.x * 6.0; // Audio-reactive power
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    int iterations = 0;
    
    for(int i = 0; i < 15; i++) {
        iterations = i;
        r = length(z);
        
        if(r > 2.0) break;
        
        // spherical coordinates
        float theta = acos(z.z/r);
        float phi = atan(z.y, z.x);
        dr = pow(r, n-1.0)*n*dr + 1.0;
        
        // scale and rotate
        float zr = pow(r, n);
        theta = theta*n;
        phi = phi*n;
        
        // convert back to cartesian
        z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
        z += pos;
    }
    return vec2(0.5*log(r)*r/dr, float(iterations));
}

vec2 rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;
    float iterations = 0.0;
    
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd*dO;
        vec2 res = mandelbulb(p);
        float dS = res.x;
        iterations = res.y;
        
        dO += dS;
        if(dO > MAX_DIST || abs(dS) < SURF_DIST) break;
    }
    return vec2(dO, iterations);
}

vec3 getPastelColor(float t) {
    return 0.5 + 0.5*cos(6.28318*(t + vec3(0.0,0.23,0.45)));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    
    float audio_speed = 1.0 + iAudio.w * 1.5;
    vec3 ro = vec3(3.0*sin(iTime*0.2 * audio_speed), 2.0*cos(iTime*0.15 * audio_speed), 4.0*cos(iTime*0.1 * audio_speed));
    vec3 lookAt = vec3(0,0,0);
    
    vec2 mouse_norm = iMouse.xy / iResolution.xy;
    float mouseInfluence = length(mouse_norm - vec2(0.5));
    ro *= (1.0 + mouseInfluence + iAudio.y * 0.5);
    
    vec3 rd = getRayDir(uv, ro, lookAt, 1.0);
    vec2 res = rayMarch(ro, rd);
    
    vec3 col = vec3(0.0);
    
    if(res.x < MAX_DIST) {
        float t = res.y/15.0;
        col = getPastelColor(t + iTime*0.1 * (1.0 + iAudio.z));
        col *= 1.0 - res.x*0.03;
    }
    
    col = mix(col, vec3(0.1,0.12,0.2), smoothstep(0.0, 5.0, res.x));
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;