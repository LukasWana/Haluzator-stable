const source = `
#define viewscale 5.

#define limitX 10.
#define limitY 5.
#define buffer 1.

#define wormwidth .45
#define wormskin .8

#define minlength 3.
#define maxlength 5.

#define minspeed .3
#define maxspeed .8

#define seedX 14.
#define seedY 255.

// inigio quilez sdfs 
float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

// pseudo-random number generators (0. to <1.)
float N21(vec2 p) {
    p = fract(p*vec2(123.45, 678.9));
    p += dot(p, p+75.31);
    return fract(p.x*p.y);
}

vec2 N22(vec2 p) {
    float n = N21(p);
    return vec2(n, N21(p+n));
}

vec3 N23(vec2 p) {
    float m = N21(p);
    vec2 n = N22(p * m);
    return vec3(m, n);
}

float average_col (vec3 col) {
    return (col.r + col.g + col.b) / 3.;
}


vec3 worms_colour(vec2 p, vec2 id, bool isVt, vec4 iAudio) {

    vec2 seed0 = N22(id)*2.-1.;
    vec2 seed1 = N22(seed0)*2.-1.;
    vec3 seed2 = N23(seed1);
    
    // direction [seed0.x]
    float dir = (seed0.x >= 0.) ? 1. : -1. ;
    
    // worm length [seed0.y]
    float len = ((maxlength-minlength) * seed0.y) + minlength;

    // speed units/sec [seed1.x]
    float speed = ((maxspeed-minspeed) * seed1.x) + minspeed;
    
    // phase shift [seed1.y]
    float phase_offset = seed1.y;
   
    // limit definition Hz or Vt
    float limit = isVt ? limitY : limitX;

    // pre-calculate the full extents of the worm trail
    // across its entire phase from 0 to 1
    float full_traverse_length = 2.*limit + len + buffer;
    float full_traverse_phase = 1.;
    
    // phase rate wrt time - audio reactive
    float phase_rate = full_traverse_phase / full_traverse_length * speed * viewscale * dir * (1.0 + iAudio.w * 1.5);

    // phase-zero insert position
    float pos0 = -limit - len - (buffer/2.);
    float pos1 = pos0 + len;
    
    // actual phase position
    float actual_phase_position = fract( (phase_rate * iTime) + phase_offset );
    
    // worm position is phased fraction of full traverse
    pos0 += full_traverse_length * actual_phase_position;
    pos1 += full_traverse_length * actual_phase_position;

    // map worm end positions
    vec2 a = isVt ? vec2(id.y, pos0) : vec2(pos0, id.y);
    vec2 b = isVt ? vec2(id.y, pos1) : vec2(pos1, id.y);
    
    // calculate the segment - audio reactive thickness and edge softness
    float d = sdSegment(p,a,b);
    d = abs(d - (wormwidth + iAudio.x * 0.1));
    d = smoothstep(wormskin - iAudio.z * 0.3, 0.0, d);

    // audio reactive color
    return (seed2 + vec3(0.0, iAudio.y * 0.5, iAudio.y * 0.3)) * d;
}



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from -1 to 1) with ar 1:1
    vec2 uv = fragCoord/iResolution.xy * 2. - 1.;
    uv.x *= iResolution.x / iResolution.y;
    
    uv *= viewscale;
    
    vec2 id = floor(uv);
    vec2 gv = fract(uv) - 0.5;

    vec3 col = vec3(0.);

    for (int i = -4; i < 5; i++) {
        col += worms_colour(uv, vec2(seedX, float(i)), false, iAudio);
    }

    for (int i = -8; i < 9; i++) {
        col += worms_colour(uv, vec2(seedY, float(i)), true, iAudio);
    }
    
    col *= 0.99;
    
    // Output to screen
    fragColor = vec4(col,1.0);
}
`;
export default source;