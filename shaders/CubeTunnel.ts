
const source = `
// "Cube Tunnel" - adapted from a user-provided shader
// Enhanced with audio reactivity and performance optimizations for Shader Sequencer.

// COMPATIBILITY FIX: WebGL 1 does not have a built-in round() function.
// We define a simple one here.
float round(float x) {
    return floor(x + 0.5);
}

// Corrected rotation matrix definition for camera controls
#define A(a) mat2(cos((a)*3.1416 + vec4(0, -1.5708, 1.5708, 0)))
#define H(v) (cos(((v)+.5)*6.2832 + radians(vec3(60, 0, -60)))*.5+.5)  // hue

float map(vec3 u, float time, float audio_x, float audio_z)
{
    float t = time,   // speed
          l = 5.,   // loop to reduce clipping
          w = 40. + audio_z * 10.0,  // z warp size, reactive to highs
          s = 0.3 + audio_x * 0.2,   // object size (max), reactive to bass
          f = 1e20;
    
    u.yz = -u.zy;
    u.xy = vec2(atan(u.x, u.y), length(u.xy));  // polar transform
    u.x += t/6.;                                // counter rotation
    
    vec3 p;
    // COMPATIBILITY/PERFORMANCE: Using a fixed integer loop.
    for (int i_loop = 0; i_loop < 5; i_loop++)
    {
        float i = float(i_loop);
        p = u;
        float y = round(max(p.y-i, 0.)/l)*l+i;  // segment y & skip rows
        p.x *= y;                         // scale x with rounded y
        p.x -= sqrt(y*t*t*2.);            // move x
        p.x -= round(p.x/6.2832)*6.2832;  // segment x
        p.y -= y;                         // move y
        p.z += sqrt(y/w)*w;               // curve inner z down
        float z = cos(y*t/50.)*.5+.5;           // radial wave
        p.z += z*2.;                      // wave z
        p = abs(p);
        f = min(f, max(p.x, max(p.y, p.z)) - s*z);  // cubes
    }
    
    return f;
}

void mainImage( out vec4 C, in vec2 U )
{
    // Overall volume (w) controls time/speed
    float T = iTime * (1.0 + iAudio.w * 4.0);
    
    float d = 0.0, s, r;
    
    vec2 R = iResolution.xy;
    vec2 m = iMouse.z > 0. ?
               (iMouse.xy - R/2.)/R.y:
               vec2(0, -.17);
    
    vec3 o = vec3(0, 20, -120),
         u = normalize(vec3(U - R/2., R.y)),
         c = vec3(0), p;
    
    // Corrected camera matrix application
    mat2 v = A(m.y);  // pitch
    mat2 h = A(m.x);  // yaw
    
    // Raymarch loop
    // COMPATIBILITY & PERFORMANCE: Switched to a standard integer loop, reduced from 50 to 35 steps.
    for (int i_loop = 0; i_loop < 35; i_loop++)
    {
        p = u*d + o;
        p.yz *= v;
        p.xz *= h;
        
        s = map(p, T, iAudio.x, iAudio.z);
        // Mids (y) affect color gradient
        r = (cos(round(length(p.xz))*T/50.)*.7 - 1.8)/2. + iAudio.y * 0.2;
        c += min(s, exp(-s/.07))
           * H(r+.5) * (r+2.4);
        
        if (s < 1e-3 || d > 1e3) break;
        d += s*.7;
    }
    
    // Gamma correct output
    C = vec4(pow(c, vec3(1.0/2.2)), 1.0);
}
`;
export default source;