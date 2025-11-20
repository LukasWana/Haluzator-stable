// License CC0: Freistil in Colors
// Adapted for Shader Sequencer by AI

const source = `
const float globalHeight    = 2.75;
const float eps             = 1E-4;
const float miss            = -1E6;
const float delta           = 1.0 ;

const vec3 lightPos1        = 100.0*vec3(2.0, .35, -1.0);
const vec3 lightPos2        = 100.0*vec3(-2.0, 3.0, 1.0);
const vec3 lightCol1        = vec3(8.0/8.0,7.0/8.0,6.0/8.0);
const vec3 lightCol2        = vec3(8.0/8.0,6.0/8.0,7.0/8.0);

// FIX: Removed const from lightDir initializations for GLSL ES 1.00 compatibility.
// They will be defined inside functions that use them.
const float pi              = 3.14159654;
const float tau             = 2.0*pi;

float hash1(vec2 n) { 
  return fract(43758.5453123*sin(dot(n,vec2(1.0,113.0)))); 
}

vec2 mod2_1(inout vec2 x) {
  vec2 n = floor(x+0.5);
  x = fract(x+0.5)-0.5;
  return n;
}

float pmin(float a, float b, float k) {
  float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
  return mix( b, a, h ) - k*h*(1.0-h);
}

float psin(float a) {
  return 0.5 + 0.5*sin(a);
}

void rot(inout vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

float circle(vec2 p, float r) {
  return length(p) - r;
}

float box(vec2 p, vec2 b, float r) {
  vec2 d = abs(p)-(b - r);
  return length(max(d,0.0)) + min(max(d.x,d.y),0.0) - r;
}

float tanh_approx(float z) {
  float z2 = z*z;
  return clamp(z / (1.0 + z2/(3.0+ z2/5.0)), -1.0, 1.0);
}

vec2 freistil_logo(vec2 p) {
  vec2 mp = p;
  vec2 mn = mod2_1(mp);
  vec2 amp = abs(mp);

  const float lw = 0.03;
  
  float d0 = circle(mp, 0.40);
  vec2 d1 = -(amp-(0.5)) - lw;
  float d3 = pmin(d1.x, d1.y, 0.1);
  float d4 = box(p, vec2(3.0/2.0+lw), 0.1);


  float d = 1E6;
  d = (mn.x + mn.y) == 1.0 || mn.y == -1.0 ? d0 : d;
  d = min(d, d3);
  d = max(d, d4);
  return vec2(d, d4);
}

float height(vec2 x, float t) {
  vec2 n = x;
  vec2 p = (x) * 0.025;
  vec2 f = freistil_logo(p)-0.02;
  float d = f.x;
  float fh = max(tanh_approx(-d*5.0), 0.0);
  // Audio: Bass pulses building heights
  float audio_height_mult = 1.0 + iAudio.x * 0.5;
  float nh = hash1(n)*mix(0.35, 1.0, psin(iTime+max(10.0*f.y, 0.0))) * audio_height_mult;
  float m = 1.0-smoothstep(-0.1, 0.125, f.y);
  return globalHeight*mix(nh, fh, 0.9*m);
}

vec4 cylinder(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float ra) {
  vec3 ba     = pb-pa;
  vec3  oc    = ro - pa;
  float baba  = dot(ba,ba);
  float bard  = dot(ba,rd);
  float baoc  = dot(ba,oc);
  float k2    = baba            - bard*bard;
  float k1    = baba*dot(oc,rd) - baoc*bard;
  float k0    = baba*dot(oc,oc) - baoc*baoc - ra*ra*baba;
  float h     = k1*k1 - k2*k0;
  if (h<0.0) return vec4(miss);
  h = sqrt(h);
  float t = (-k1-h)/k2;
  float y = baoc + t*bard;
  if (y>0.0 && y<baba) return vec4(t, (oc+t*rd - ba*y/baba)/ra);
  t = (((y<0.0) ? 0.0 : baba) - baoc)/bard;
  if (abs(k1+k2*t)<h) return vec4(t, ba*sign(y)/sqrt(baba));
  return vec4(miss);
}

vec4 gridTrace(vec3 ro, vec3 rd, float initial, int max_iter) {
  float t = initial;
  vec2 x = 0.5*(1.0 + sign(rd.xz));
  vec2 y = 1.0/rd.xz;
  float mt = (-globalHeight - ro.y)/rd.y;

  for (int i = 0; i < 40; ++i) {
    if (i >= max_iter) break;
    vec3 p = ro + t*rd;
    vec2 n = floor(p.xz);
    vec2 m = fract(p.xz);
    float h = height(n, t);
    float dt = (h - p.y)/rd.y;
    vec3 tp = p + dt*rd;
    if (p.y < -globalHeight) {
      return vec4(mt, vec3(0.0, 1.0, 0.0));
    }
    float hh = hash1(n+100.0);
    if (n == floor(tp.xz)||h > p.y) {
      vec3 lp = vec3(m.x, p.y, m.y);
      vec4 c = cylinder(lp, rd, vec3(0.5, -globalHeight, 0.5), vec3(0.5, h, 0.5), 0.35 + 0.145*hh);
      float tt = t + c.x;
      if (mt >= 0.0 && tt > mt) {
        return vec4(mt, vec3(0.0, 1.0, 0.0));
      }
      if (c.x >= 0.0) {
        return vec4(tt, c.yzw);
      }
    }
    vec2 z = (x - fract(p.xz))*y;
    t += min(z.x, z.y) + eps;
  }
  return vec4(miss);
}

vec3 skyColor(vec3 rayDir) {
  const vec3 lightDir1 = normalize(lightPos1);
  float ld1      = max(dot(lightDir1, rayDir), 0.0);
  // Audio: Mids shift sky color
  vec3 final     = vec3(0.125) + vec3(0.0, 0.1, 0.2) * iAudio.y;
  final += 1.0*pow(lightCol1, vec3(2.0, 1.5, 1.5)) * pow(ld1, 8.0);
  final += 1.0*lightCol1 * pow(ld1, 200.0);
  return final;
}


vec3 render(vec3 ro, vec3 rd) {
  const vec3 lightDir1 = normalize(lightPos1);
  const vec3 lightDir2 = normalize(lightPos2);
  vec3 col = vec3(0.125);
  
  float dup = (1.025*globalHeight - ro.y)/rd.y;
  vec3 upp = ro + rd*dup;

  vec3 sky = skyColor(rd);

  if (dup > 0.0) {
    vec4 dgt  = gridTrace(ro, rd, dup, 40);
    float t   = dgt.x;
    vec3 nor  = dgt.yzw;
    vec3 gtp  = ro + rd*t;

    vec2 n = floor(gtp.xz);
    float h = height(n, t);
    float l2 = dot(gtp.xz, gtp.xz);

    vec4 dst  = gridTrace(gtp + nor*0.01, lightDir1, 0.0, 8);

    vec3 refl     = reflect(rd, nor);
    vec3 reflCol  = skyColor(refl);

    vec3 refr     = refract(rd, nor, 1.25);

    
    float dif1 = max(dot(lightDir1, nor), 0.0);  
    float dif2 = max(dot(lightDir2, nor), 0.0);  
    
    // Audio: Mids shift object color palette
    float color_shift = iAudio.y * 0.2;
    // FIX: Replaced tanh() with tanh_approx()
    vec3 baseCol = pow(vec3(0.5 + 0.5*sin(iTime + color_shift + 0.1*vec3(n, n.x + n.y)/(1.0+0.0000125*l2)))*mix(vec3(1.0), vec3(0.125), tanh_approx(abs(2.0*h))), vec3(1.0, 1.5, 0.5)/(1.0+0.00005*l2));

    float shade = dst.x > miss ? tanh_approx(0.25*dst.x) : 1.0;

    dif1 *= shade;
    if (dgt.x > miss) {
      col += baseCol*0.75*mix(0.125, 1.0, sqrt(dif1 + dif2));
      col += 0.5*sqrt(reflCol)*mix(1.0, shade, max(dot(refl, lightDir1), 0.0));
      if (refr != vec3(0.0)) {
        col += 0.3*vec3(1.0)*pow(max(dot(refr, rd), 0.0), 100.0);
      }
    } else {
      col = sky;
    }
    
    float mm = 1.0-max(dot(rd, vec3(0.0, -1.0, 0.0)), 0.0);
    mm*=mm;
    col = mix(col, sky, mm*(1.0-exp(-0.0125*max(t-100.0, 0.0))));
  } else {
    col = sky;
  }

  // Audio: Highs add a shimmering glow
  col += col * iAudio.z * 0.5;
  return col;
}

vec3 pos(float time) {
  float m1 = smoothstep(0.0, 10.0, time);
  float m2 = smoothstep(13.0, 30.0, time);
  float h = mix(10.0, 25.0, m1);
  vec3 p1 = vec3(15.0*time-250.0, h, 0.5);
  const float r = 100.0;
  time *= 0.2;
  float h2 = mix(25.0, 350.0, m2);
  vec3 p2 = vec3(-r*sin(time), h2, -r*cos(time));
  return mix(p1, p2, m2);
}

vec3 dpos(float time) {
  float m = smoothstep(0.0, 10.0, time);
  vec3 dp = (pos(time + delta) - pos(time - delta))/(2.0*delta);
  rot(dp.xy, mix(1.0, 0.5, m)); 
  return dp;
}

vec3 ddpos(float time) {
  vec3 ddp = (dpos(time + delta) - dpos(time - delta))/(2.0*delta);
  return ddp;
}

vec3 dir(vec3 ro, float time) {
  vec3 dpos =  normalize(dpos(time));
  vec3 la = normalize(vec3(0.0)-ro);
  float m = smoothstep(13.0, 20.0, time);  
  return normalize(mix(dpos, la, m));
}

vec3 up(float time) {
  vec3 ddp = ddpos(time);  
  vec3 up = normalize(vec3(0.0, 1.0, 0.0) + 0.1*ddp);
  float m = 0.5*(tanh_approx(time - 11.0)+1.0);
  rot(up.yz, m*tau);
  return up;
}


vec3 postProcess(vec3 col, vec2 q)  {
  col=pow(clamp(col,0.0,1.0),vec3(0.75)); 
  col=col*0.6+0.4*col*col*(3.0-2.0*col);  // contrast
  col=mix(col, vec3(dot(col, vec3(0.33))), -0.4);  // satuation
//  col*=0.5+0.5*pow(19.0*q.x*q.y*(1.0-q.x)*(1.0-q.y),0.7);  // vigneting
  return col;
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 q = fragCoord.xy/iResolution.xy;
  vec2 p = -1.0 + 2.0*(fragCoord.xy) / iResolution.xy;
  p.x *= iResolution.x/ iResolution.y;
  
  // Audio: Overall volume controls animation speed
  float tm = mod(iTime * (1.0 + iAudio.w * 0.5), 35.0);
  vec3 ro  = pos(tm);
  vec3 dir = dir(ro, tm);
  vec3 up = up(tm);

  vec3 ww = dir;
  vec3 uu = normalize(cross(up, ww));
  vec3 vv = normalize(cross(ww, uu));
  
  vec3 rd = normalize(p.x*uu + p.y*vv + 2.0*ww);

  vec3 col = render(ro, rd);
  
  float ss1 = smoothstep(28.00, 35.0, tm);
  float ss2 = smoothstep(33.0, 35.0, tm);
  float ss3 = smoothstep(28.00, 31.40, tm);
  float scale = 0.22+0.1*ss1;

  vec2 lp = p;
  rot(lp, -0.5*(1.0-tanh_approx((tm-30.0))));
  vec2 df = freistil_logo(lp/scale)*scale;
  float aa = 2.0/iResolution.y;
  vec3 col2 = mix(vec3(1.0), vec3(ss2*ss2), smoothstep(-aa, aa, -df.x));
  col = mix(col, col2, ss3*ss3);
  
  float fadeIn = 1.0 - smoothstep(0.0, 3.0, tm);
  col += fadeIn;

  col = postProcess(col, q);
    
  fragColor = vec4(col, 1.0);
}
`;
export default source;
