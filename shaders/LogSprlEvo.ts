// CC0: Logarithmic spiral of spheres
//  Inspired by: https://twitter.com/MaxDrekker/status/1643694297605103630?s=20
// Adapted for Shader Sequencer by AI

const source = `
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

const float ExpBy = 0.2630344058; // log2(1.2)

// tanh approximation for WebGL 1 compatibility
float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

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

float forward(float l) {
  return exp2(ExpBy*l);
}

float reverse(float l) {
  return log2(l)/ExpBy;
}

vec3 sphere(vec3 col, mat2 rot, vec3 bcol, vec2 p, float r, float aa) {
  vec3 lightDir = normalize(vec3(1.0, 1.5, 2.0));
  lightDir.xy *= rot;
  float z2 = (r*r-dot(p, p));
  vec3 rd = -normalize(vec3(p, 0.1));
  if (z2 > 0.0) {
    float z = sqrt(z2);
    vec3 cp = vec3(p, z);
    vec3 cn = normalize(cp);
    vec3 cr = reflect(rd, cn);
    float cd= max(dot(lightDir, cn), 0.0);
    // FIX: Replaced unsupported tanh(vec3) with component-wise tanh_approx
    vec3 tanh_bcol = vec3(tanh_approx(8.0 * bcol.r), tanh_approx(8.0 * bcol.g), tanh_approx(8.0 * bcol.b));
    vec3 cspe = pow(max(dot(lightDir, cr), 0.0), 10.0)*tanh_bcol*0.5;
    vec3 ccol = mix(0.2, 1.0, cd*cd)*bcol;
    ccol += cspe;
    float d = length(p)-r;
    col = mix(col, ccol, smoothstep(0.0, -aa, d));
  }
  return col;
}

vec3 effect(vec2 p, vec2 pp) {
  float aa = 4.0/iResolution.y;

  // Audio: Overall volume controls speed
  float ltm = 0.75*iTime * (1.0 + iAudio.w * 0.5);
  mat2 rot0 = ROT(-0.125*ltm); 
  p *= rot0;
  float mtm = fract(ltm);
  float ntm = floor(ltm);
  float gd = dot(p, p);
  float zz = forward(mtm);

  vec2 p0 = p;
  p0 /= zz;

  float l0 = length(p0);
  
  float n0 = ceil(reverse(l0));
  float r0 = forward(n0);
  float r1 = forward(n0-1.0);
  float r = (r0+r1)/2.0;
  float w = r0-r1;
  float nn = n0;
  n0 -= ntm;

  vec2 p1 = p0;
  // Audio: Bass affects repetitions
  float reps = floor(TAU*r/(w) * (1.0 + iAudio.x * 0.5));
  mat2 rot1 = ROT(0.66*n0); 
  p1 *= rot1;
  float m1 = modPolar(p1, reps)/reps;
  p1.x -= r;
  
  // Audio: Mids shift color
  vec3 ccol = (1.0+cos(0.85*vec3(0.0, 1.0, 2.0)+TAU*(m1)+0.5*n0 + iAudio.y * 2.0))*0.5;
  vec3 gcol = (1.5+cos(0.5*vec3(0.0, 1.0, 2.0) + 0.125*ltm))*0.005;
  mat2 rot2 = ROT(TAU*m1);

  vec3 col = vec3(0.0);
  float fade = 0.5+0.5*cos(TAU*m1+0.33*ltm);
  // Audio: Bass pulses sphere size
  col = sphere(col, rot0*rot1*rot2, ccol*mix(0.25, 1.0, sqrt(fade)), p1, mix(0.125, 0.5, fade)*w * (1.0 + iAudio.x * 0.5), aa/zz);
  // Audio: Highs boost glow
  col += gcol*vec3(0.25, 0.125, 1.0)/max(gd, 0.0015) * (1.0 + iAudio.z * 2.0);
  col -= 0.1*vec3(0.0, 1.0, 2.0).zyx*(length(pp)+0.25);
  col = clamp(col, 0.0, 1.0);
  col = sqrt(col);

  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/iResolution.xy;
  vec2 p = -1. + 2. * q;
  vec2 pp = p;
  p.x *= iResolution.x/iResolution.y;
  vec3 col = effect(p, p);
  fragColor = vec4(col, 1.0);
}
`;
export default source;
