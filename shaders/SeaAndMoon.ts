// License CC0: Sea and moon
// Tinkering with the colors of an old shaders to make it a better fit for windows terminal
// Adapted for Shader Sequencer with audio reactivity.

const source = `
#define PI          3.141592654
#define TAU         (2.0*PI)

const float gravity = 1.0;
const float waterTension = 0.01;

// License: Unknown, author: Unknown, found: don't remember
float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

vec2 wave(in float t, in float a, in float w, in float p) {
  float x = t;
  float y = a*sin(t*w + p);
  return vec2(x, y);
}

vec2 dwave(in float t, in float a, in float w, in float p) {
  float dx = 1.0;
  float dy = a*w*cos(t*w + p);
  return vec2(dx, dy);
}

vec2 gravityWave(in float t, in float a, in float k, in float h, float time) {
  float w = sqrt(gravity*k*tanh_approx(k*h));
  return wave(t, a ,k, w*time);
}

vec2 capillaryWave(in float t, in float a, in float k, in float h, float time) {
  float w = sqrt((gravity*k + waterTension*k*k*k)*tanh_approx(k*h));
  return wave(t, a, k, w*time);
}

vec2 gravityWaveD(in float t, in float a, in float k, in float h, float time) {
  float w = sqrt(gravity*k*tanh_approx(k*h));
  return dwave(t, a, k, w*time);
}

vec2 capillaryWaveD(in float t, in float a, in float k, in float h, float time) {
  float w = sqrt((gravity*k + waterTension*k*k*k)*tanh_approx(k*h));
  return dwave(t, a, k, w*time);
}

void mrot(inout vec2 p, in float a) {
  float c = cos(a);
  float s = sin(a);
  p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

vec4 sea(in vec2 p, in float ia, float time) {
  float y = 0.0;
  vec3 d = vec3(0.0);

  const int maxIter = 8;
  const int midIter = 4;

  float kk = 1.0/1.3;
  float aa = 1.0/(kk*kk);
  float k = 1.0*pow(kk, -float(maxIter) + 1.0);
  float a = ia*0.25*pow(aa, -float(maxIter) + 1.0);

  float h = 25.0;
  p *= 0.5;
  
  vec2 waveDir = vec2(0.0, 1.0);

  for (int i = midIter; i < maxIter; ++i) {
    float t = dot(-waveDir, p) + float(i);
    y += capillaryWave(t, a, k, h, time).y;
    vec2 dw = capillaryWaveD(-t, a, k, h, time);
    
    d += vec3(waveDir.x, dw.y, waveDir.y);

    mrot(waveDir, PI/3.0);

    k *= kk;
    a *= aa;
  }
  
  waveDir = vec2(0.0, 1.0);

  for (int i = 0; i < midIter; ++i) {
    float t = dot(waveDir, p) + float(i);
    y += gravityWave(t, a, k, h, time).y;
    vec2 dw = gravityWaveD(t, a, k, h, time);
    
    vec2 d2 = vec2(0.0, dw.x);
    
    d += vec3(waveDir.x, dw.y, waveDir.y);

    mrot(waveDir, -step(2.0, float(i)));

    k *= kk;
    a *= aa;
  }

  vec3 t = normalize(d);
  vec3 nxz = normalize(vec3(t.z, 0.0, -t.x));
  vec3 nor = cross(t, nxz);

  return vec4(y, nor);
}

vec3 sunDirection() {
  // Bass makes the moon rise and fall
  vec3 dir = normalize(vec3(0, 0.06 + iAudio.x * 0.1, 1));
  return dir;
}

vec3 skyColor(in vec3 rd) {
  const vec3 skyCol1_base = vec3(0.6, 0.35, 0.3).zyx*0.5;
  const vec3 skyCol2_base = vec3(1.0, 0.3, 0.3).zyx*0.5 ;
  const vec3 sunCol1_base = vec3(1.0,0.5,0.4).zyx;
  const vec3 sunCol2_base = vec3(1.0,0.8,0.8).zyx;
  
  // Mids shift sky color
  vec3 skyCol1 = skyCol1_base + vec3(0.1, -0.1, 0.1) * iAudio.y;
  vec3 skyCol2 = skyCol2_base + vec3(0.0, 0.1, -0.1) * iAudio.y;
  
  // Highs make moon/sun pulse
  vec3 sunCol1 = sunCol1_base * (1.0 + iAudio.z * 0.5);
  vec3 sunCol2 = sunCol2_base * (1.0 + iAudio.z * 0.5);

  vec3 sunDir = sunDirection();
  float sunDot = max(dot(rd, sunDir), 0.0);
  vec3 final_col = vec3(0.0);
  final_col += mix(skyCol1, skyCol2, rd.y);
  final_col += 0.5*sunCol1*pow(sunDot, 90.0);
  final_col += 4.0*sunCol2*pow(sunDot, 900.0);
  return final_col;
}

vec3 render(in vec3 ro, in vec3 rd, float time) {
  const vec3 seaCol1_base = vec3(0.1,0.2,0.2)*0.2;
  const vec3 seaCol2_base = vec3(0.2,0.9,0.6)*0.5;

  // Mids shift sea color
  vec3 seaCol1 = seaCol1_base + vec3(0.1, 0.1, -0.1) * iAudio.y;
  vec3 seaCol2 = seaCol2_base + vec3(-0.1, 0.1, 0.1) * iAudio.y;

  vec3 col = vec3(0.0);
  float dsea = (0.0 - ro.y)/rd.y;
  
  vec3 sunDir = sunDirection();
  
  vec3 sky = skyColor(rd);
  
  if (dsea > 0.0) {
    vec3 p = ro + dsea*rd;
    // Bass affects wave height/choppiness
    vec4 s = sea(p.xz, 1.0 + iAudio.x * 1.5, time);
    float h = s.x;    
    vec3 nor = s.yzw;
    nor = mix(nor, vec3(0.0, 1.0, 0.0), smoothstep(0.0, 200.0, dsea));

    float fre = clamp(1.0 - dot(-nor,rd), 0.0, 1.0);
    fre = fre*fre*fre;
    float dif = mix(0.25, 1.0, max(dot(nor,sunDir), 0.0));
    
    vec3 refl = skyColor(reflect(rd, nor));
    
    const vec3 sunCol1_refr = vec3(1.0,0.5,0.4).zyx;
    vec3 refr = seaCol1 + dif * sunCol1_refr * seaCol2 * 0.1; 
    
    col = mix(refr, 0.9*refl, fre);
    
    float atten = max(1.0 - dot(dsea,dsea) * 0.001, 0.0);
    col += seaCol2*(p.y - h) * 2.0 * atten;
    
    col = mix(col, sky, 1.0 - exp(-0.01*dsea));
    
  } else {
    col = sky;
  }
  
  return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  // Overall volume controls time speed
  float time = iTime * (1.0 + iAudio.w * 0.5);
  
  vec2 q = fragCoord/iResolution.xy;
  vec2 p = -1.0 + 2.0*q;
  p.x *= iResolution.x/iResolution.y;

  vec3 ro = vec3(0.0, 10.0, 0.0);
  vec3 ww = normalize(vec3(0.0, -0.1, 1.0));
  vec3 uu = normalize(cross( vec3(0.0,1.0,0.0), ww));
  vec3 vv = normalize(cross(ww,uu));
  vec3 rd = normalize(p.x*uu + p.y*vv + 2.5*ww);

  vec3 col = render(ro, rd, time);

  fragColor = vec4(col,1.0);
}
`;
export default source;