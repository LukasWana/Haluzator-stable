// CC0: Tuesday infinite zoom
// Adapted for Shader Sequencer by AI with audio reactivity.

const source = `
const float per  = 16.0;
const float zoom_const = 0.2630344058; // log2(1.2)

#define TIME        iTime
#define RESOLUTION  iResolution
#define PI          3.141592654
#define TAU         (2.0*PI)

#define REV(x)      exp2((x)*zoom_const)
#define FWD(x)      (log2(x)/zoom_const)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))
#define SCA(a)      vec2(sin(a), cos(a))

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float modPolar(inout vec2 p, float repetitions) {
  float angle = TAU/repetitions;
  float a = atan(p.y, p.x) + angle/2.;
  float r = length(p);
  float c = floor(a/angle);
  a = mod(a,angle) - angle/2.;
  p = vec2(cos(a), sin(a))*r;
  if (abs(c) >= (repetitions/2.0)) c = abs(c);
  return c;
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

vec3 effect(vec2 p, vec2 pp) {
  // Audio-reactive parameters
  float rep = 7.0 + iAudio.x * 10.0; // Bass controls repetitions
  float time_mod = 1.0 + iAudio.w * 1.5; // Overall volume controls speed
  
  vec2 op = p;
  p *= ROT(0.05*TIME);

  vec2 zp = p;
  float tm = TIME * time_mod + 14.0*TAU;
  float ctm = floor(tm);
  float ftm = fract(tm);
  float z = REV(ftm);
  zp /= z;
  float np = modPolar(zp, rep);
  float x = zp.x;
  float n = floor(FWD(abs(x)));
  float x0 = REV(n);
  float x1 = REV(n+1.0);
  n -= ctm;

  float m = (x0+x1)*0.5;
  float w = x1-x0;


  float aa = 4.0/RESOLUTION.y;

  float dz = abs(zp.x-m) - w*0.45;
  dz *= z;
  
  vec2 ap = p;
  vec2 cp0 = p;
  vec2 cp1 = p;
  float ltm = TIME * time_mod +TAU*14.0;
  float mp = mod(n, 2.0*per)/per;
  mp = mix(mp, 2.0-mp, step(1.0, mp));
  float ntm = ltm*(mp-0.55);
  ap *= ROT(ntm);
  ap.y = abs(ap.y);
  const float a = PI*0.75;
  const vec2 sca = SCA(a);
  float da = dot(ap,sca);
  float a0 = PI-a+ntm;
  float a1 = PI+a+ntm;
  cp0 *= ROT(a0);
  mod1(a0, TAU/rep);
  cp0 -= vec2(z*m/cos(a0),0.0);
  cp1 *= ROT(a1); 
  mod1(a1, TAU/rep);
  cp1 -= vec2(z*m/cos(a1),0.0);
  float dc0 = length(cp0)-w*0.49*z;
  float dc1 = length(cp1)-w*0.49*z;
  float dc = min(dc0, dc1);
  
  float d = max(da, dz);

  vec3 col = vec3(0.0);
  // Mids shift color palette
  vec3 ccol = (0.5)*(1.0+cos(1.5*vec3(0., 1.0, 2.0)+(n)+PI*op.x*op.y + iAudio.y * 2.0));
  vec3 ccol0 = ccol+max(-3.0*dz, 0.0);
  vec3 ccol1 = ccol0*ccol0*0.075;
  vec3 ccol2 = ccol+max(2.0*sqrt(max(-dc, 0.0)), 0.0);
  ccol2 = sqrt(ccol2);

  // Highs add shimmer/glow to edges
  float shimmer = 1.0 + iAudio.z * 0.8;
  col = mix(col, ccol1 * shimmer, smoothstep(0.0, -aa, dz));
  col = mix(col, ccol0 * shimmer, smoothstep(0.0, -aa, d));
  col = mix(col, ccol2 * shimmer, smoothstep(0.0, -aa, dc));

  col *= smoothstep(0.025, 0.075, length(op));
  col *= smoothstep(1.5, 0.75, length(pp));
  col = sqrt(col);
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/RESOLUTION.xy;
  vec2 p = -1. + 2. * q;
  vec2 pp = p;
  p.x *= RESOLUTION.x/RESOLUTION.y;
  vec3 col = effect(p, pp);
  fragColor = vec4(col, 1.0);
}
`;
export default source;
