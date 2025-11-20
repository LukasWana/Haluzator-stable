// CC0: Atans begone!
//  Tinkering around with an old shader
//  Managed to remove atan from the loop which made me happy
//  and thus sharing it

const source = `
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

const float bstart = 0.0;
const float bpm    = 150.0;
const float bhz    = bpm/60.0;
const float bperiod= 8.0/bhz;

#define BTIME(n) ((n)*bperiod+bstart)

float beatCount(float tm) {
  return (tm-bstart)*bhz;
}

float beat(float tm) {
  return smoothstep(0.25, 1.0, cos(TAU*beatCount(tm)));
}


// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}
// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
//  Macro version of above to enable compile-time constants
#define HSV2RGB(c)  (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

// License: Unknown, author: Unknown, found: don't remember
float hash(float co) {
  return fract(sin(co*12.9898) * 13758.5453);
}

vec3 skyColor(vec3 ro, vec3 rd) {
  vec3 gcol0 = HSV2RGB(vec3(0.55 + iAudio.y * 0.2, 0.9, 0.035*0.5));
  const vec3 gcol1 = HSV2RGB(vec3(0.75, 0.85, 0.035*2.0));
  float b = beat(iTime);
  vec2 pp = rd.xy;
  b *= step(BTIME(6.0), iTime);
  return mix(gcol0, gcol1, b)/max(dot(pp, pp), 0.0001);
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

// License: MIT, author: Inigo Quilez, found: https://www.iquilezles.org/www/articles/intersectors/intersectors.htm
vec2 rayCylinder(vec3 ro, vec3 rd, vec3 cb, vec3 ca, float cr) {
  vec3  oc = ro - cb;
  float card = dot(ca,rd);
  float caoc = dot(ca,oc);
  float a = 1.0 - card*card;
  float b = dot( oc, rd) - caoc*card;
  float c = dot( oc, oc) - caoc*caoc - cr*cr;
  float h = b*b - a*c;
  if( h<0.0 ) return vec2(-1.0); //no intersection
  h = sqrt(h);
  return vec2(-b-h,-b+h)/a;
}

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
  const float rdd = 2.0;
  float mm  = 5.0 + iAudio.x * 10.0;
  const float rep = 16.0;

  vec3 rd = normalize(-p.x*uu + p.y*vv + rdd*ww);
  
  vec3 skyCol = skyColor(ro, rd);

  vec2 etc = rayCylinder(ro, rd, ro, vec3(0.0, 0.0, 1.0), 1.0);
  vec3 etcp = ro+rd*etc.y;
  rd.yx *= ROT(0.3*etcp.z);

  vec3 col = skyCol;

  float fi = smoothstep(BTIME(1.0), BTIME(3.0), iTime);

  // I read somewhere that if you call atan in a shader you got no business writing shader code.
  float a = atan(rd.y, rd.x);
  const int MAX_ITER = 15;
  for(int i = 0; i < MAX_ITER; ++i) {
    if (float(i) >= mm) break;
    float fi_loop = float(i);
    float ma = a;
    float sz = rep+fi_loop*9.0;
    float slices = TAU/sz; 
    float na = mod1(ma, slices);

    float h1 = hash(na+13.0*fi_loop+123.4);
    float h2 = fract(h1*3677.0);
    float h3 = fract(h1*8677.0);

    float tr = mix(0.5, 3.0, h1);
    vec2 tc = rayCylinder(ro, rd, ro, vec3(0.0, 0.0, 1.0), tr);
    vec3 tcp = ro + tc.y*rd;
    vec2 tcp2 = vec2(tcp.z, a);
  
    float zz = mix(0.025, 0.05, sqrt(h1))*rep/sz;
    float tnpy = mod1(tcp2.y, slices);
    float fo = smoothstep(0.5*slices, 0.25*slices, abs(tcp2.y));
    tcp2.x += h2*iTime;
    tcp2.y *= tr*(PI/3.0);
    vec2 tcp3 = tcp2;
    float w = mix(.2, 1.0, h2);
    float tnpx = mod1(tcp3.x, w);
    float h4 = hash(tnpx+123.4);

    tcp2/=zz;
    tcp3/=zz;
    float d1 = abs(tcp2.y);

    float d2 = length(tcp3) - 2.0*h4;
    d2 = abs(d2)-1.0*h4;
    d2 = abs(d2)-0.5*h4;
    float d = mix(d1, d2, fi*(0.5+0.5*sin(0.01*tcp2.x)));
    d *= zz;

    vec3 bcol = (1.0+cos(vec3(0.0, 1.0, 2.0)+TAU*h3+0.5*h2*h2*tcp.z))*0.00005;
    bcol /= max(d*d, 0.00001+5E-7*tc.y*tc.y);
    bcol *= exp(-0.04*tc.y*tc.y);
    bcol *= smoothstep(-0.5, 1.0, sin(mix(0.125, 1.0, h2)*tcp.z));
    bcol *= fo;
    col += bcol;
  }

  return col;
}

// License: Unknown, author: Matt Taylor (https://github.com/64), found: https://64.github.io/tonemapping/
vec3 aces_approx(vec3 v) {
  v = max(v, 0.0);
  v *= 0.6;
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((v*(a*v+b))/(v*(c*v+d)+e), 0.0, 1.0);
}

vec3 effect(vec2 p, vec2 pp) {
  float tm  = 3.0 * iTime * (1.0 + iAudio.w * 2.0);
  vec3 ro   = vec3(0.0, 0.0, tm);
  vec3 dro  = normalize(vec3(1.0, 0.0, 3.0));
  dro.xz *= ROT(0.2*sin(0.05*tm));
  dro.yz *= ROT(0.2*sin(0.05*tm*sqrt(0.5)));
  const vec3 up = vec3(0.0,1.0,0.0);
  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(up, ww));
  vec3 vv = (cross(ww, uu));
  vec3 col = color(ww, uu, vv, ro, p);
  col += col * iAudio.z * 0.5;
  col -= (0.125 - iAudio.z * 0.1) *vec3(0.0, 1.0, 2.0).yzx*length(pp);
  col = aces_approx(col);
  col *= smoothstep(BTIME(0.0), BTIME(0.25), iTime);
  col = sqrt(col);
  return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 q = fragCoord/iResolution.xy;
  vec2 p = -1. + 2. * q;
  vec2 pp = p;
  p.x *= iResolution.x/iResolution.y;

  vec3 col = effect(p, pp);
  fragColor = vec4(col, 1.0);
}
`;
export default source;