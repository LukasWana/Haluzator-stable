// Original code by an anonymous author, adapted for Shader Sequencer by AI.
// Features audio-reactive zoom, detail, and coloring.

const source = `
#define MANDELBROT_ZOOM_START 0.0

void pR(inout vec2 p, in float a) {
  p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

vec2 pMod2(inout vec2 p, in vec2 size) {
  vec2 c = floor((p + size*0.5)/size);
  p = mod(p + size*0.5,size) - size*0.5;
  return c;
}


vec4 mandelbrot(float time, vec2 p) {
  // --- Audio-reactive parameters ---
  float ztime = (time - MANDELBROT_ZOOM_START) * (1.0 + iAudio.w * 1.5);
  float max_iter = 80.0 + iAudio.z * 160.0;
  
  // --- Zoom and Pan ---
  float zoo = 0.64 + 0.36*cos(.07*ztime);
  float coa = cos(0.15*(1.0-zoo)*ztime);
  float sia = sin(0.15*(1.0-zoo)*ztime);
  zoo = pow(zoo,8.0);
  vec2 xy = vec2( p.x*coa-p.y*sia, p.x*sia+p.y*coa);
  vec2 c = vec2(-.745,.186) + xy*zoo;

  const float B = 10.0;
  float l = 0.0;
  vec2 z  = vec2(0.0);

  // Detail center, wobbles with mids
  vec2 zc = vec2(1.0, 1.0) + iAudio.y * vec2(0.5, -0.5);
  pR(zc, ztime);

  float d = 1e20;

  int i = 0;
  const int MAX_LOOP_ITER = 240; // Hard limit for safety
        
  for(int j = 0; j < MAX_LOOP_ITER; ++j) {
    if (float(j) > max_iter) break;

    float re2 = z.x*z.x;
    float im2 = z.y*z.y;
    float reim= z.x*z.y;
        
    if(re2 + im2 > (B*B)) break;

    z = vec2(re2 - im2, 2.0*reim) + c;

    // Detail calculation
    vec2 zm = z;
    vec2 n = pMod2(zm, vec2(4));
    vec2 pp = zm - zc;
    float dd = dot(pp, pp);
    d = min(d, dd);

    l += 1.0;
    i = j;
  }

  float ii = float(i) / max_iter;
  
  // Smoothed iteration count for color
  float sl = l - log2(log2(dot(z,z))) + 4.0; 

  // --- Coloring ---
  // Detail color, pulses with bass
  vec3 dc = vec3(pow(max(1.0 - d, 0.0), 20.0)) * (1.0 + iAudio.x * 2.0);
  // Main gradient color, shifts with mids
  vec3 gc = 0.5 + 0.5*cos(3.0 + sl*0.15 + vec3(0.1,0.5,0.9) + iAudio.y * 2.0);
  
  vec3 final_color = gc + dc*smoothstep(28.8, 29.0, ztime);
  
  return vec4(final_color, ii);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (-iResolution.xy + 2.0*fragCoord.xy)/iResolution.y;
  
  // A single, high-quality render. Removed the expensive multi-sample AA.
  vec4 result = mandelbrot(iTime, p);
  vec3 col = result.rgb;

  fragColor = vec4(col, 1.0);
}
`;
export default source;
