const source = `
// UltimateFlame by mojovideotech
// Adapted for VJ App from shadertoy.com/lsjcRt and shadertoy.com/XsX3zB

#define pi 3.141592653589793

// --- Hardcoded seeds for consistency ---
#define seed1 111.0
#define seed2 277.0
#define seed3 497.0

vec3 random3(vec3 c) {
	float j = 4231.0*sin(dot(c,vec3(seed1, seed2, seed3)));
	vec3 k;
	k.z = fract(seed1*j);
	j *= .5;
	k.x = fract(seed2*j);
	j *= .25;
	k.y = fract(seed3*j);
	return k-0.5;
}

const float F3 =  0.3333333;
const float G3 =  0.1666667;

float simplex3d(vec3 p) {
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 vec4 w, d;
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 w = max(0.6 - w, 0.0);
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 w *= w;
	 w *= w;
	 d *= w;
	 return dot(d, vec4(100.0)); // Use a fixed depth
}

const mat3 rot1 = mat3(-0.37, 0.36, 0.85,-0.14,-0.93, 0.34,0.92, 0.01,0.4);
const mat3 rot2 = mat3(-0.55,-0.39, 0.74, 0.33,-0.91,-0.24,0.77, 0.12,0.63);
const mat3 rot3 = mat3(-0.71, 0.52,-0.47,-0.08,-0.72,-0.68,-0.7,-0.45,0.56);

float simplex3d_fractal(vec3 n) {
    return   0.5333333*simplex3d(n*rot1)
			+0.2666667*simplex3d(2.0*n*rot2)
			+0.1333333*simplex3d(4.0*n*rot3)
			+0.0666667*simplex3d(8.0*n);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // --- Audio-reactive parameters mapped from ISF inputs ---
    float rate = 1.75 + iAudio.w * 1.25;
    float scale = 0.5 + iAudio.w * 0.5;
    float flicker = 5.0 + iAudio.y * 45.0;
    float intensity = 0.15 + iAudio.x * 0.5;
    float wave = 0.15 + iAudio.z * 0.8;

    // --- Static parameters from ISF defaults ---
    vec2 center = vec2(0.0, 0.0);
    float freq = 1.5;
    float light = 0.45;
    float contours = 1.05;
    float bottomedges = 0.05;
    float topedges = 0.45;
    float expand = 0.8;
    float cutoff = 8.0;
    float fractnoise = 0.33;
    float multiplier = 2.0;

   	vec3 finalColor, bgColor, hColor, fColor;
   	float noise, value, edge, m, v, r, h, o;
   	float TT = 28.22 + iTime * rate;
    float nf = 1.0/freq;
	vec2 pos = fragCoord.xy / iResolution.y;
    vec2 wf = vec2(0.0);
    float aspect = iResolution.x/iResolution.y;
    vec2 poc = pos-vec2(0.5*aspect, 0.5) - center;
    poc/=scale;
    poc.x /= expand;
    float pob = 0.5*(poc.y+1.0);
    wf.x += pob*sin(4.0*poc.y-4.0*TT);
    wf.y += 0.1*pob*sin(4.0*poc.x-1.561*TT);
    poc += wave*wf;
	poc.x += poc.x / (1.0-(poc.y));
    m = 1.0-pow(1.0-clamp(1.0-length(poc), 0.0, 1.0), 10.1-cutoff);
    vec3 p3 = nf*0.25*vec3(pos.x, pos.y, 0.0) + vec3(0.0, -TT*0.1, TT*0.025);
    noise = mix(simplex3d(p3*16.0*floor(multiplier)),simplex3d_fractal(p3*8.0*floor(multiplier)),fractnoise);
	noise = 0.5 + 0.5*noise;
    value = (m*noise)+intensity*m;    
    
    // Using style 1 (PhotoReal) by default
    edge = mix(bottomedges, topedges, pow(0.5*(poc.y+1.0), 1.2) );
    v = smoothstep(edge,edge+0.1, value);
    h = light+.5-clamp(value-edge, 0.0 , 1.0);
    p3 = nf*0.1*vec3(pos.x, pos.y, 0.0) + vec3(0.0, -TT*0.01, TT*0.025);
    noise = simplex3d(p3*32.0);
    noise = 0.5 + 0.5*noise;
    r = mix(h, noise, 0.65);
    r = 0.5*sin(6.0*pi*(1.0-pow(1.0-r,1.8)) - 0.5*pi)+0.5;
    o = smoothstep(0.95, 1.0, pow(r, 8.0));
    o = mix(o, 0.0, (2.1-contours)-noise);
    h = max(o, h);
    h = pow(h, 2.0);
    hColor = mix(vec3(1.0,0.4,0.0), vec3(2.0,0.6,0.0), pos.y);
    hColor += vec3(0.9,0.4,0.0) * pow(sin(iTime*flicker), 4.0);
    fColor = mix(vec3(0.2,0.2,0.2), vec3(1.0,0.05,0.05), pos.y);
    finalColor = hColor*(v*h);
    finalColor += fColor*v;
    bgColor = mix(vec3(0.07,0.0,0.15), vec3(0.075,0.025,0.15), 1.0);
    finalColor += bgColor;
    
	fragColor = vec4(finalColor,1.0);
}
`;
export default source;