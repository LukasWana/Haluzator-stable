// CC0: Mind flowers by Scry
// Adapted for Shader Sequencer with audio reactivity.
// Original inspiration: https://twitter.com/Scrygl/status/1614578715123683333

const source = `
#define RESOLUTION  iResolution
#define PI          3.141592654
#define PI_2        (0.5*PI)
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))
#define PCOS(a)     0.5*(cos(a)+1.0)

const float planeDist = 1.0-0.80;
const int   furthest  = 16;
const int   fadeFrom  = 12; // max(furthest-4, 0) -> 12
const float fadeDist  = planeDist*float(furthest - fadeFrom);

const float overSample  = 4.0;

// License: Unknown, author: Unknown, found: don't remember
vec4 alphaBlend(vec4 back, vec4 front) {
  float w = front.w + back.w*(1.0-front.w);
  vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.0-front.w))/(w + 1e-6);
  return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
}

// License: Unknown, author: Unknown, found: don't remember
vec3 alphaBlend(vec3 back, vec4 front) {
  return mix(back, front.xyz, front.w);
}

// License: Unknown, author: Unknown, found: don't remember
float tanh_approx(float x) {
  //  Found this somewhere on the interwebs
  //  return tanh(x);
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

// License: Unknown, author: Unknown, found: don't remember
float hash(float co) {
  return fract(sin(co*12.9898) * 13758.5453);
}

vec3 offset(float z) {
  float a = z;
  vec2 p = -0.15*(vec2(cos(a), sin(a*sqrt(2.0))) + vec2(cos(a*sqrt(0.75)), sin(a*sqrt(0.5))));
  return vec3(p, z);
}

vec3 doffset(float z) {
  float eps = 0.05;
  return 0.5*(offset(z + eps) - offset(z - eps))/(2.0*eps);
}

vec3 ddoffset(float z) {
  float eps = 0.05;
  return 0.5*(doffset(z + eps) - doffset(z - eps))/(2.0*eps);
}

vec3 skyColor(vec3 ro, vec3 rd) {
  return vec3(0.0);
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

// License: MIT, author: Pascal Gilcher, found: https://www.shadertoy.com/view/flSXRV
float atan_approx(float y, float x) {
  float cosatan2 = x / (abs(x) + abs(y) + 1e-6); // Added epsilon
  float t = PI_2 - cosatan2 * PI_2;
  return y < 0.0 ? -t : t;
}

// License: CC0, author: Mårten Rånge, found: https://github.com/mrange/glsl-snippets
vec2 toPolar(vec2 p) {
  return vec2(length(p), atan_approx(p.y, p.x));
}

vec3 glow(vec2 pp, float h) {
  float hh = fract(h*8677.0);
  // Mids affect color/positional spinning of rings
  float b = TAU*h + 0.5*iTime*(hh > 0.5 ? 1.0 + iAudio.y * 2.0 : -1.0 - iAudio.y * 2.0);
  float a = pp.y+b;
  float d = max(abs(pp.x)-0.001, 0.00125);
  
  // Bass affects glow intensity
  float glowFactor = 0.05 + iAudio.x * 0.1;
  float ringDistance = 0.075*overSample/4.0;

  return 
    (   smoothstep(0.667*ringDistance, 0.2*ringDistance, d)
      * smoothstep(0.1, 1.0, cos(a))
      * glowFactor
      * ringDistance
      / d
    )
    * (cos(a+b+vec3(0,1,2))+vec3(1.0))
    ;
}

vec3 glowRings(vec2 p, float hh) {
  vec2 pp = toPolar(p);

  vec3 col = vec3(0.0);
  float h = 1.0;
  const float nr = 1.0/overSample;

  // Treble affects number of rings
  float noOfRings   = (20.0 + iAudio.z * 30.0)*4.0/overSample;
  float ringDistance = 0.075*overSample/4.0;

  for (int i_int = 0; i_int < 4; ++i_int) {
    float i = float(i_int);
    vec2 ipp = pp;
    ipp.x -= ringDistance*(nr*i);
    float rn = mod1(ipp.x, ringDistance); 
    h = hash(rn+123.0*i);
    col += glow(ipp, h)*step(rn, noOfRings);
  }
  
  col += (0.01*vec3(1.0, 0.25, 0.0))/length(p);

  return col;
}

vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 off, float aa, float n) {
  float h = hash(n+123.4);

  vec3 hn;
  vec2 p = (pp-off*vec3(1.0, 1.0, 0.0)).xy;
  float l = length(p);
  float fade = smoothstep(0.1, 0.15, l);
  if (fade < 0.1) return vec4(0.0);
  vec4 col = vec4(0.0);
  
  col.xyz = glowRings(p*mix(0.5, 4.0 + iAudio.x * 4.0, h), h); // Bass makes flower patterns larger
  float i = max(max(col.x, col.y), col.z);

  col.w = (tanh_approx(0.5+max((i), 0.0))*fade);
  return col;
}

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
  float lp = length(p);
  vec2 np = p + 1.0/RESOLUTION.xy;
  const float rdd_per   = 10.0;
  float rdd =  (1.75+0.75*pow(lp,1.5)*tanh_approx(lp+0.9*PCOS(rdd_per*p.x)*PCOS(rdd_per*p.y)));
  
  vec3 rd = normalize(p.x*uu + p.y*vv + rdd*ww);
  vec3 nrd = normalize(np.x*uu + np.y*vv + rdd*ww);

  float nz = floor(ro.z / planeDist);

  vec3 skyCol = skyColor(ro, rd);

  vec4 acol = vec4(0.0);
  const float cutOff = 0.95;
  bool cutOut = false;

  float maxpd = 0.0;

  // Steps from nearest to furthest plane and accumulates the color 
  for (int i = 1; i <= furthest; ++i) {
    float pz = planeDist*nz + planeDist*float(i);

    float pd = (pz - ro.z)/rd.z;

    if (pd > 0.0 && acol.w < cutOff) {
      vec3 pp = ro + rd*pd;
      maxpd = pd;
      vec3 npp = ro + nrd*pd;

      float aa = 3.0*length(pp - npp);

      vec3 off = offset(pp.z);

      vec4 pcol = plane(ro, rd, pp, off, aa, nz+float(i));

      float fade_z = pp.z-ro.z;
      float fadeIn = smoothstep(planeDist*float(furthest), fadeDist, fade_z);
      float fadeOut = smoothstep(0.0, planeDist*0.1, fade_z);
      pcol.w *= fadeOut*fadeIn;
      pcol = clamp(pcol, 0.0, 1.0);

      acol = alphaBlend(pcol, acol);
    } else {
      cutOut = true;
      acol.w = acol.w > cutOff ? 1.0 : acol.w;
      break;
    }

  }

  vec3 col = alphaBlend(skyCol, acol);
  return col;
}

vec3 effect(vec2 p, vec2 q) {
  // Overall volume affects speed
  float tm  = planeDist*iTime * ((157.0/4.0/60.0) + iAudio.w * 2.0);
  vec3 ro   = offset(tm);
  vec3 dro  = doffset(tm);
  vec3 ddro = ddoffset(tm);

  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(normalize(vec3(0.0,1.0,0.0)+ddro), ww));
  vec3 vv = cross(ww, uu);

  vec3 col = color(ww, uu, vv, ro, p);
  
  // Random color tweaks
  col -= 0.075*vec3(2.0, 3.0, 1.0);
  col *= sqrt(2.0);
  col = clamp(col, 0.0, 1.0);
  col = sqrt(col);
  return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 q = fragCoord/RESOLUTION.xy;
  vec2 p = -1. + 2. * q;
  p.x *= RESOLUTION.x/RESOLUTION.y;

  vec3 col = effect(p, q);
  
  fragColor = vec4(col, 1.0);
}
`;
export default source;