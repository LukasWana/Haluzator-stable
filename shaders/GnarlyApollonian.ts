// CC0: Gnarly colorful apollonian by an anonymous author
// Adapted for Shader Sequencer by AI with GLSL ES 1.00 fixes and audio reactivity.
// Original inspiration: https://www.shadertoy.com/view/ds2GRW

const source = `
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

const int   max_iter      = 70;
 
// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
float box(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
vec2 modMirror2(inout vec2 p, vec2 size) {
  vec2 halfsize = size*0.5;
  vec2 c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  p *= mod(c,vec2(2))*2.0 - vec2(1.0);
  return c;
}

float apollonian(vec3 p, out float ss) {
  // Bass pulses the fractal's scale factor
  float s = mix(1.4, 1.45, smoothstep(0.9, 1.0, sin(-length(p.xz)+TAU*iTime/10.0))) + iAudio.x * 0.1; 
  float scale = 1.5;

  const int rep = 5;
  mat2 rr = ROT(PI/5.5);

  for(int i=0; i<rep; ++i) {
    mod1(p.y, 2.0);
    modMirror2(p.xz, vec2(2.0));
    p.xz *= rr;

    float r2 = dot(p,p);
    float k = s/r2;
    p *= k;
    scale *= k;
  }
  
  float d = -(box(p - 0.1, vec3(1.0, 2.0, 1.)) - 0.6);
  ss = scale;
  return 0.25*d/scale;
}

vec3 glow(vec3 ro, vec3 rd) {
  float res;
  float t = .75;
  int iter = max_iter;

  vec3 col = vec3(0.0);    
  for(int i = 0; i < max_iter; ++i) {
    vec3 p = ro + rd * t;
    float ss;
    res = apollonian(p, ss);
    
    // Mids shift colors, highs increase glow intensity/flicker
    float color_phase = 3.0 + iAudio.y * 2.0;
    float glow_falloff = 0.05 + iAudio.z * 0.03;
    float glow_intensity = 1.0 + iAudio.z * 1.5;
    col += glow_intensity * 0.06 * (0.5+0.5*cos(color_phase+vec3(1.0, 2.0, 3.0)+0.8*log(ss))) * exp(-glow_falloff*t - 0.5*res*float(i*i));
    
    if(res < 0.0003 * t || res > 20.) {
      iter = i;
      break;
    }
    t += res;
  }
    
  return col;
}

vec3 render(vec2 p) {
  // Overall volume affects camera rotation speed
  float cam_speed = 1.0 + iAudio.w * 0.5;
  vec3 ro = 1.2*vec3(-1.0, .8, -0.0);
  ro.xz   *= ROT(iTime/10.0 * cam_speed);
  const vec3 la = vec3(0.0, 1.6, 0.0); 
  vec3 ww = normalize(la-ro);
  vec3 uu = normalize(cross(vec3(0.0,1.0,0.0), ww ));
  vec3 vv = normalize(cross(ww,uu));
  const float fov = 3.0;
  vec3 rd = normalize(-p.x*uu + p.y*vv + fov*ww );

  return glow(ro, rd);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q  = fragCoord/iResolution.xy;
  vec2 p = -1.0 + 2.0*q; 
  p.x*=iResolution.x/iResolution.y;
 
  vec3 col = render(p);
  col -= 0.1*vec3(1.0, 2.0, 0.5);
  col = clamp(col, 0.0, 1.0);
  col = sqrt(col);

  fragColor=vec4(col, 1.0); 
}
`;

export default source;
