// HexMarching - Combined and adapted by AI from user fragments.
// Features a procedural hex tunnel with audio-reactive speed,
// colors, glow, and pulsing details.

const source = `
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

const float planeDist = 0.8; // 1.0 - 0.2

// --- Helper Functions ---

// HSV to RGB Conversion
const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 hsv2rgb(vec3 c) {
  // Audio reactivity: Mids (y) shift the hue
  c.x = fract(c.x + iAudio.y * 0.3);
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}

// Tanh approximation
float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

// Simple hash
float hash(float co) {
  return fract(sin(co*12.9898) * 13758.5453);
}

// Camera path functions
vec3 offset(float z) {
  float a = z;
  vec2 p = -0.15*(vec2(cos(a), sin(a*sqrt(2.0))) + vec2(cos(a*sqrt(0.75)), sin(a*sqrt(0.5))));
  return vec3(p, z);
}

vec3 doffset(float z) {
  float eps = 0.05;
  return (offset(z + eps) - offset(z - eps))/(2.0*eps);
}

// Coordinate conversions & tiling
vec2 toPolar(vec2 p) { return vec2(length(p), atan(p.y, p.x)); }
vec2 toRect(vec2 p) { return vec2(p.x*cos(p.y), p.x*sin(p.y)); }

float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

vec2 hextile(inout vec2 p) {
  const vec2 sz = vec2(1.0, sqrt(3.0));
  const vec2 hsz = 0.5*sz;
  vec2 p1 = mod(p, sz)-hsz;
  vec2 p2 = mod(p - hsz, sz)-hsz;
  vec2 p3 = dot(p1, p1) < dot(p2, p2) ? p1 : p2;
  vec2 n = (p - p3) / sz;
  p = p3;
  return n;
}


// --- Core Scene Rendering ---

// Renders the glowing hex lines for a plane
vec4 hex_plane_effect(vec2 p, float aa, float h) {
  vec2 hhn = hextile(p);
  const float w = 0.02;
  vec2 pp = toPolar(p);
  float a = pp.y;
  mod1(pp.y, TAU/6.0);
  vec2 hp = toRect(pp);
  float hd = hp.x-(w*10.0);
  
  float x = hp.x-0.5*w;
  float n = mod1(x, w);
  float d = abs(x)-(0.5*w-aa);
  
  float h0 = hash(10.0*(hhn.x+hhn.y)+2.0*h+n);
  float h1 = fract(8667.0*h0);
  // Audio reactivity: Bass (x) pulses the hex pattern
  float cut = mix(-0.5, 0.999, 0.5+0.5*sin(iTime*2.0+TAU*h0 + iAudio.x * 3.0));
  const float coln = 6.0;
  
  // Audio reactivity: Treble (z) makes hex lines flicker/glow brighter
  float t = smoothstep(aa, -aa, d)*smoothstep(cut, cut-0.005, sin(a+2.0*(h1-0.5)*iTime+h1*TAU))*exp(-150.0*abs(x)) * (1.0 + iAudio.z * 1.5);
  vec3 col = hsv2rgb(vec3(floor(h0*coln)/coln, 0.8, 1.0))*t*1.75;

  t = mix(0.9, 1.0, t);
  t *= smoothstep(aa, -aa, -hd);
  if (hd < 0.0) {
    col = vec3(0.0);
    t = 15.*dot(p, p);
  }
  return vec4(col, t);
}

// Positions a hex plane in 3D space
vec4 render_plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n) {
  float h0 = hash(n);
  float h1 = fract(8667.0*h0);
  vec2 p  = (pp-off*vec3(1.0, 1.0, 0.0)).xy;
  p *= ROT(TAU*h0);
  p.x -= 0.25*h1*(pp.z-ro.z);
  p /= 1.0;
  float aa = distance(pp,npp)*sqrt(1.0/3.0);
  vec4 col = hex_plane_effect(p, aa, h1);
  return col;
}

// Raymarches the scene and composites the planes
vec3 render_scene(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
  float lp = length(p);
  vec2 np = p + 2.0/iResolution.y;
  float rdd = (2.-0.5*tanh_approx(lp));
  vec3 rd = normalize(p.x*uu + p.y*vv + rdd*ww);
  vec3 nrd = normalize(np.x*uu + np.y*vv + rdd*ww);

  const int furthest = 5;
  float nz_base = floor(ro.z / planeDist);

  vec4 accumulated_color = vec4(0.0);

  for (int i = 1; i <= furthest; ++i) {
    float pz = planeDist*nz_base + planeDist*float(i);
    float pd = (pz - ro.z)/rd.z;

    if (pd > 0.0 && accumulated_color.w < 0.95) {
      vec3 pp = ro + rd*pd;
      vec3 npp = ro + nrd*pd;
      vec3 off = offset(pp.z);
      vec4 plane_color = render_plane(ro, rd, pp, npp, off, nz_base+float(i));
      float nz = pp.z-ro.z;
      float fadeIn = smoothstep(planeDist*float(furthest), planeDist*float(furthest-2), nz);
      float fadeOut = smoothstep(0.0, planeDist*0.1, nz);
      plane_color.w *= fadeOut*fadeIn;
      plane_color = clamp(plane_color, 0.0, 1.0);
      
      // Alpha blending
      float w = plane_color.w + accumulated_color.w*(1.0-plane_color.w);
      vec3 xyz = (plane_color.xyz*plane_color.w + accumulated_color.xyz*accumulated_color.w*(1.0-plane_color.w))/(w + 1e-6);
      accumulated_color = w > 0.0 ? vec4(xyz, w) : vec4(0.0);
    }
  }

  return mix(vec3(0.0), accumulated_color.xyz, accumulated_color.w);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/iResolution.xy;
  vec2 p = -1. + 2. * q;
  p.x *= iResolution.x/iResolution.y;

  // --- Setup camera and render scene ---
  // Audio reactivity: Overall volume (w) controls speed
  float tm  = planeDist * iTime * (1.0 + iAudio.w * 3.0);
  vec3 ro   = offset(tm);
  vec3 dro  = doffset(tm);
  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(vec3(0.0,1.0,0.0), ww));
  vec3 vv = cross(ww, uu);
  vec3 base_col = render_scene(ww, uu, vv, ro, p);

  // --- Post-Processing ---
  // 1. Bloom/Glow effect (inspired by Fragment 2)
  // We use the brightness of the base color as a cheap blur/glow source
  float brightness = dot(base_col, vec3(0.299, 0.587, 0.114));
  // Audio reactivity: Bass (x) controls glow amount
  float glow_col = pow(brightness, 3.0) * (0.5 + iAudio.x * 2.0);

  // 2. Combine base color and glow (inspired by Fragment 2)
  vec3 col = base_col;
  col += vec3(0.9, .8, 1.2) * mix(0.5, 0.66, length(p)) * (0.05 + glow_col);
  
  // 3. Final color correction (inspired by Fragment 1)
  col = clamp(col, 0.0, 1.0);
  col *= smoothstep(0.0, 2.0, iTime); // Fade in
  col = sqrt(col); // Brightness curve

  fragColor = vec4(col, 1.0);
}
`;
export default source;