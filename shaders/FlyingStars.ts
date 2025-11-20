
const source = `
// License CC0: Flying through glowing stars
//  The result of playing around trying to improve an old shader
// Adapted for VJ App with audio reactivity

#define PI              3.141592654
#define TAU             (2.0*PI)
#define RESOLUTION      iResolution

#define LESS(a,b,c)     mix(a,b,step(0.,c))
#define SABS(x,k)       LESS((.5/(k))*(x)*(x)+(k)*.5,abs(x),abs(x)-(k))

#define MROT(a) mat2(cos(a), sin(a), -sin(a), cos(a))

// License: Unknown, author: Unknown, found: don't remember
float tanh_approx(float x) {
  //  Found this somewhere on the interwebs
  //  return tanh(x);
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

vec3 hsv2rgb(vec3 c) {
  const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hash(in vec3 co) {
  return fract(sin(dot(co, vec3(12.9898,58.233, 12.9898+58.233))) * 13758.5453);
}

float starn(vec2 p, float r, int n, float m) {
  // From IQ: https://www.shadertoy.com/view/3tSGDy
  // https://iquilezles.org/articles/distfunctions2d
  
  // Minor tweak to use SABS over abs to smooth inner corners
  // SABS: https://www.shadertoy.com/view/Ws2SDK

  // next 4 lines can be precomputed for a given shape
  float an = 3.141593/float(n);
  float en = 3.141593/m;  // m is between 2 and n
  vec2  acs = vec2(cos(an),sin(an));
  vec2  ecs = vec2(cos(en),sin(en)); // ecs=vec2(0,1) for regular polygon,

  float bn = mod(atan(p.x,p.y),2.0*an) - an;
  p = length(p)*vec2(cos(bn),SABS(sin(bn), 0.15));
  p -= r*acs;
  p += ecs*clamp( -dot(p,ecs), 0.0, r*acs.y/ecs.y);
  return length(p)*sign(p.x);
}

vec4 alphaBlend(vec4 back, vec4 front) {
  // Pre-multiplied alpha blending
  vec3 xyz = front.xyz * front.w + back.xyz * (1.0 - front.w);
  float w = front.w + back.w * (1.0 - front.w);
  return vec4(xyz, w);
}

void rot(inout vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

vec3 offset(float z) {
  float a = z;
  vec2 p = -0.075*(vec2(cos(a), sin(a*sqrt(2.0))) + vec2(cos(a*sqrt(0.75)), sin(a*sqrt(0.5))));
  return vec3(p, z);
}

vec3 doffset(float z) {
  float eps = 0.05;
  return 0.5*(offset(z + eps) - offset(z - eps))/eps;
}

vec3 ddoffset(float z) {
  float eps = 0.05;
  return 0.5*(doffset(z + eps) - doffset(z - eps))/eps;
}

vec4 planeCol(vec3 ro, vec3 rd, float n, vec3 pp) {
  const float s = 0.5;
  
  vec2 p = pp.xy;
  float z = pp.z;
  
  // Approximate anti-aliasing size from pixel size
  float aa = length(vec2(1.0/RESOLUTION.y));

  p -= (1.0+5.0*(pp.z - ro.z))*offset(z).xy;
  
  p *= s;
  float r = hash(vec3(floor(p+0.5), n));
  p = fract(p+0.5)-0.5;
  rot(p, ((TAU*r+n)*0.25));

  // Audio: Bass pulses star size
  float d = starn(p, 0.20 * (1.0 + iAudio.x * 0.5), 3 + 2*int(3.0*r), 3.0);
  d -= 0.06;
  d/=s;
  
  float ds = -d+0.03;
  // Audio: Mids shift color
  vec3 cols = hsv2rgb(vec3(337.0/360.0+0.1*sin(n*0.3 + iAudio.y * 2.0), 0.8, 0.54+0.2*sin(n*0.3)));
  float ts = 1.0 - smoothstep(-aa, 0.0, ds);
  vec4 cs =  vec4(cols, ts*0.93);

  float db = abs(d) - (0.06);
  db = abs(db) - 0.03;
  db = abs(db) - 0.00;
  db = max(db, -d+0.03);
  vec3 colb = vec3(1.0, 0.7, 0.5);
  // Audio: Highs add flicker/glow
  float tb = exp(-(db)*30.0*(1.0 - 10.0*aa)) * (1.0 + iAudio.z * 1.5);
  vec4 cb = vec4(1.5*colb, tb);

  vec4 ct = alphaBlend(cs, cb);

  return ct;
}

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
  vec3 rd = normalize(p.x*uu + p.y*vv + (2.0-tanh_approx(length(p)))*ww);
  
  vec4 col = vec4(0.0);

  const float planeDist = 1.0;
  const int furthest = 6;
  const int fadeFrom = furthest-3;

  float nz = floor(ro.z / planeDist);

  for (int i = 6; i >= 1; --i) {
    if (float(i) > float(furthest)) continue;

    float pz = planeDist*nz + float(i);
    
    float pd = (pz - ro.z)/rd.z;
    
    if (pd > 0.0) {
      vec3 pp = ro + rd*pd;
      
      vec4 pcol = planeCol(ro, rd, nz+float(i), pp);
      float fadeIn = 1.0-smoothstep(planeDist*float(fadeFrom), planeDist*float(furthest), pp.z-ro.z);
      pcol.xyz *= sqrt(fadeIn);
  
      col = alphaBlend(col, pcol);
    }
  }
  
  return col.xyz*col.w;
}

vec3 postProcess(vec3 col, vec2 q)  {
  col=pow(clamp(col,0.0,1.0),vec3(0.75)); 
  col=col*0.6+0.4*col*col*(3.0-2.0*col);
  col=mix(col, vec3(dot(col, vec3(0.33))), -0.4);
  col*=0.5+0.5*pow(19.0*q.x*q.y*(1.0-q.x)*(1.0-q.y),0.7);
  return col;
}

vec3 effect(vec2 p, vec2 q) {
  float tm = iTime * 0.65;
  
  vec3 ro   = offset(tm);
  vec3 dro  = doffset(tm);
  vec3 ddro = ddoffset(tm);

  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(vec3(0.0,1.0,0.0)+1.5*ddro, ww));
  vec3 vv = normalize(cross(ww, uu));
  
  vec3 col = color(ww, uu, vv, ro, p);
  col = postProcess(col, q);
  
  const float fadeIn = 2.0;
    
  return col*smoothstep(0.0, fadeIn, iTime);
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 q = fragCoord/RESOLUTION.xy;
  vec2 p = -1. + 2. * q;
  p.x *= RESOLUTION.x/RESOLUTION.y;
  
  vec3 col = effect(p, q);
  
  fragColor = vec4(col, 1.0);
}
`;
export default source;