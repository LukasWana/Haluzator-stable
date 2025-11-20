// CC0: Oversaturated web
//  Bit of tinkering thursday night
//  Not entirely happy with the colors but good enough for now
//  This a deriative of BigWing's: https://www.shadertoy.com/view/lscczl
//  Adapted for Shader Sequencer by AI with fixes and audio reactivity.

const source = `
#define TIME        iTime
#define RESOLUTION  iResolution

#define ROT(a)     mat2(cos(a), sin(a), -sin(a), cos(a))

#define BEZIER
const float
  pi        = 3.14159265359
, tau       = 6.28318530718
, planeDist = .5
, furthest  = 6.
, fadeFrom  = 4.
, cutOff    = .975
;
const vec3  L  = vec3(0.299, 0.587, 0.114);

const vec2 
  pathA = vec2(.31, .41)
, pathB = vec2(1.41421356237, 1.0)
;

const vec4 
  U = vec4(0.0, 1.0, 2.0, 3.0)
  ;

vec2 get_off6(int i) {
    if (i == 0) return vec2(1.0, 0.0);
    if (i == 1) return vec2(0.5, 0.8660254);
    if (i == 2) return vec2(-0.5, 0.8660254);
    if (i == 3) return vec2(-1.0, 0.0);
    if (i == 4) return vec2(-0.5, -0.8660254);
    return vec2(0.5, -0.8660254); // for i == 5
}

vec2 get_noff6(int i) {
    if (i == 0) return vec2(1.0, 0.0);
    if (i == 1) return vec2(0.5, 0.8660254);
    if (i == 2) return vec2(-0.5, 0.8660254);
    if (i == 3) return vec2(-1.0, 0.0);
    if (i == 4) return vec2(-0.5, -0.8660254);
    return vec2(0.5, -0.8660254); // for i == 5
}

vec3 offset(float z) {
  return vec3(pathB*sin(pathA*z), z);
}

vec3 doffset(float z) {
  return vec3(pathA*pathB*cos(pathA*z), 1.0);
}

vec3 ddoffset(float z) {
  return vec3(-pathA*pathA*pathB*sin(pathA*z), 0.0);
}

float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27. + x2)/(27.+9.*x2), -1., 1.);
}

vec2 hextile(inout vec2 p) {
  const vec2 sz = vec2(1.0, 1.7320508);
  const vec2 hsz = 0.5*sz;

  vec2 p1 = mod(p, sz)-hsz;
  vec2 p2 = mod(p - hsz, sz)-hsz;
  vec2 p3 = dot(p1, p1) < dot(p2, p2) ? p1 : p2;
  vec2 n = ((p3 - p + hsz)/sz);
  p = p3;

  n -= vec2(0.5);
  return floor(n*2.0 + 0.5)*0.5;
}

float hexagon(vec2 p, float r) {
  p = p.yx;
  const vec3 k = 0.5*vec3(-1.7320508, 1.0, 1.1547005);
  p = abs(p);
  p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}

float hash(vec2 co) {
  co += 1.234;
  return fract(sin(dot(co.xy ,vec2(12.9898,58.233))) * 13758.5453);
}

float dot2(vec2 p) {
  return dot(p, p);
}

float segment(vec2 p, vec2 a, vec2 b ) {
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

float bezier(vec2 pos, vec2 A, vec2 B, vec2 C) {    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;
    float kk = 1.0/dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);      
    float res = 0.0;
    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx-3.0*ky) + kz;
    float h = q*q + 4.0*p3;
    if( h >= 0.0) 
    { 
        h = sqrt(h);
        vec2 x = (vec2(h,-h)-q)/2.0;
        vec2 uv_bezier = sign(x)*pow(abs(x), vec2(1.0/3.0));
        float t_bezier = clamp( uv_bezier.x+uv_bezier.y-kx, 0.0, 1.0 );
        res = dot2(d + (c + b*t_bezier)*t_bezier);
    }
    else
    {
        float z = sqrt(-p);
        float v = acos( q/(p*z*2.0) ) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3 t_bezier = clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);
        res = min( dot2(d+(c+b*t_bezier.x)*t_bezier.x),
                   dot2(d+(c+b*t_bezier.y)*t_bezier.y) );
    }
    return sqrt( res );
}

vec2 coff(float h) {
  float h0 = h;
  float h1 = fract(h0*9677.0);
  // Audio: Treble/highs (z) affect flicker
  float t = 0.75*mix(0.5, 1.0, h0*h0)*(TIME * (1.0 + iAudio.z) + 1234.5);
  return mix(0.1, 0.2, h1*h1)*sin(t*vec2(1.0, 0.70710678));
}

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

vec3 alphaBlend(vec3 back, vec4 front) {
  return mix(back, front.xyz, front.w);
}

vec4 alphaBlend(vec4 back, vec4 front) {
  float w = front.w + back.w*(1.-front.w);
  vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.-front.w))/(w + 1e-6);
  return w > 0. ? vec4(xyz, w) : vec4(0.);
}

vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 off, float aa, float n) {
  vec2 p = (pp-off*U.yyx).xy;
  vec2 p2 = p;
  p2 *= ROT(tau*0.1*n+0.05*TIME);
  p2 += + 0.125*(ro.z-pp.z)*vec2(1.0)*ROT(tau*hash(vec2(n)));
  vec2 hp = p2;
  hp += 0.5;

  const float z = 1.0/3.0;
  hp /= z;
  vec2 hn = hextile(hp);
  
  float h0 = hash(hn+n);
  vec2 p0 = coff(h0);
  
  // Audio: Mids (y) affect color
  vec3 bcol = 0.5*(1.0+cos(vec3(0.0, 1.0, 2.0) + 2.0*(p2.x*p2.y+p2.x)-+0.33*n + iAudio.y * 2.0)); 
  vec3 col = vec3(0.0);
  
  for (int i = 0; i < 6; ++i) {
    float h1 = hash(hn+get_noff6(i)+n);
    vec2 p1 = get_off6(i)+coff(h1);
    
    float h2 = h0+h1;
    float fade = smoothstep(1.05, 0.85, distance(p0, p1)); 

    if (fade < 0.0125) continue;

#ifdef BEZIER
    vec2 p_bezier = 0.5*(p1+p0)+coff(h2);
    float dd = bezier(hp, p0, p_bezier, p1);
#else
    float dd = segment(hp, p0, p1);
#endif
    float gd = abs(dd);
    gd *= sqrt(gd);
    gd = max(gd, 0.0005);

    // Audio: Bass (x) affects web thickness/glow
    col += fade*0.002*bcol/(gd + 1e-6) * (1.0 + iAudio.x * 2.0);
  }

  {  
    float cd = length(hp-p0);
    float gd = abs(cd);
    gd *= (gd);
    gd = max(gd, 0.0005);
    col += 0.0025*sqrt(bcol)/(gd + 1e-6);
  }
  
  {
    float hd = hexagon(hp, 0.485);
    float gd = abs(hd);
    gd = max(gd, 0.005);
    col += 0.0005*bcol*bcol/(gd + 1e-6);
  }
  
  float l = dot(col, L);  

  return vec4(col, tanh_approx(sqrt(l)+dot(p, p)));
}

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
  float lp = length(p);
  vec2 np = p + 1./RESOLUTION.xy;
  float rdd = 2.0;
  
  vec3 rd = normalize(p.x*uu + p.y*vv + rdd*ww);
  vec3 nrd = normalize(np.x*uu + np.y*vv + rdd*ww);

  float nz_float = floor(ro.z / planeDist);

  vec4 acol = vec4(0.0);

  vec3 skyCol = vec3(0.0);

  // Use an integer loop for compatibility
  for (int i = 1; i <= 6; ++i) {
    if (float(i) > furthest) break;

    float pz = planeDist*nz_float + planeDist*float(i);
    float pd = (pz - ro.z)/rd.z;

    if (pd > 0. && acol.w < cutOff) {
      vec3 pp = ro + rd*pd;
      vec3 npp = ro + nrd*pd;
      float aa = 3.*length(pp - npp);
      vec3 off = offset(pp.z);
      vec4 pcol = plane(ro, rd, pp, off, aa, nz_float+float(i));
      float nz = pp.z-ro.z;
      float fadeIn = smoothstep(planeDist*furthest, planeDist*fadeFrom, nz);
      float fadeOut = smoothstep(0., planeDist*.1, nz);
      pcol.w *= fadeOut*fadeIn;
      acol = alphaBlend(pcol, acol);
    } else {
      acol.w = acol.w > cutOff ? 1. : acol.w;
      break;
    }
  }
  return alphaBlend(skyCol, acol);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord) {
  vec2 r = RESOLUTION.xy, q = fragCoord/r.xy, pp = -1.0+2.0*q, p = pp;
  p.x *= r.x/r.y;

  float tdist = length(pp);
  // Audio: Overall volume (w) affects speed
  float tm  = 0.2*planeDist*(TIME * (1.0 + iAudio.w * 1.5))+0.1*tdist;

  vec3 ro   = offset(tm);
  vec3 dro  = doffset(tm);
  vec3 ddro = ddoffset(tm);

  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(U.xyx+ddro, ww));
  vec3 vv = cross(ww, uu);
  vec3 col = color(ww, uu, vv, ro, p);
  col -= 0.02*U.zwx*(length(pp)+0.125);
  col *= smoothstep(1.5, 1.0, length(pp));
  col *= smoothstep(0.0, 10.0, TIME-2.0*(q.x-q.x*q.y));
  col = aces_approx(col);
  col = sqrt(col);
  fragColor = vec4(col, 1.0);
}
`;
export default source;