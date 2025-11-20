// CC0: We need an expert.. Dave Hoskins
// Thanks Dave_Hoskins for fixing the shader
// Adapted for Shader Sequencer by AI. Made compatible with GLSL 1.0 and audio-reactive.

const source = `
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

const int   MaxIter   = 40;
const float Bottom    = 0.0;
const float MinHeight = 0.25;
const float MaxHeight = 7.0;
const float sz        = 0.475;
const float eps       = 1E-3;

// --- Globals to replace 'out' parameters for GLSL 1.0 compatibility ---
vec3 g_outNormal;
int   g_iter;
vec2  g_cell;
vec2  g_boxi;
vec3  g_boxn;


// --- Noise functions to replace texture lookups ---
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}


// --- Utility Functions ---
float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

// --- Raymarching Scene ---
// License: MIT, author: Inigo Quilez
vec2 rayBox(vec3 ro, vec3 rd, vec3 boxSize)  {
    vec3 m = 1.0/rd;
    vec3 n = m*ro;
    vec3 k = abs(m)*boxSize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max( max( t1.x, t1.y ), t1.z );
    float tF = min( min( t2.x, t2.y ), t2.z );
    if( tN>tF || tF<0.0) return vec2(-1.0);
    g_outNormal = (tN>0.0) ? step(vec3(tN),t1) :
                           step(t2,vec3(tF));
    g_outNormal *= -sign(rd);
    return vec2( tN, tF );
}

float select(vec2 p) {
  p *= 0.00125;
  float h = noise(p * 5.0 + iTime * 0.1);
  h -= 0.5;
  h *= 2.0;
  return h;
}

vec3 baseCol(vec2 p) {
  float h = select(p);
  // Audio-reactive coloring for the buildings
  vec3 sc = h > 0.0 ? vec3(0.1 + iAudio.y * 0.2) : vec3(1.0, 0.0, iAudio.z * 0.5);
  return mix(vec3(1.0), sc, smoothstep(0.33, 0.66, abs(h)));
}

float height(vec2 p) {
    // Create a procedural mask to scatter the audio reactivity
    // Increased frequency for smaller zones, wider smoothstep for more reactive areas
    float reactivity_mask = smoothstep(0.3, 0.7, noise(p * 0.1));

    // Get a unique random value for this cell to vary its behavior
    float cell_hash = hash(p);

    // Base height for non-reactive buildings
    float base_h = 0.1 + noise(p * 0.005 + 10.0) * 0.3;
    
    // Calculate a stronger, more direct audio level.
    // Let's use bass for the primary pulse and mids for some extra energy.
    float audio_level = iAudio.x * 1.5 + iAudio.y * 0.5;
    
    // Determine the audio-driven height for reactive buildings
    // Use the cell hash to give each building a unique max height.
    float audio_h = (0.2 + audio_level) * (0.5 + cell_hash * 1.5);
    
    // Use the mask to choose between the base height and the audio-reactive height
    float h = mix(base_h, audio_h, reactivity_mask);
    
    // Clamp the final normalized height
    h = clamp(h, 0.0, 1.0);
    
    // Map to the final world-space height
    return mix(MinHeight, MaxHeight, h) * 0.5;
}


float cellTrace(vec3 ro, vec3 rd, float near, float far) {
  vec2 rd2  = rd.xz;
  vec2 ird2 = 1.0/rd.xz;
  vec2 stp  = step(vec2(0.0), rd2);

  float ct = near;
  vec2 np2 = vec2(0.0);
  float ft = far;

  for (int i = 0; i < MaxIter; ++i) {
    vec3 cp = ro+rd*ct;
    np2 = floor(cp.xz);
    float h = height(np2);
    vec3 bdim = vec3(sz, h, sz);
    vec3 coff = vec3(np2.x+0.5, h, np2.y+0.5);
    vec3 bro = ro-coff;
    vec2 bi = rayBox(bro, rd, bdim);
    vec3 bn = g_outNormal;

    if (bi.x > 0.0) {
      float bt = bi.x;
      if (bt >= far) {
        break;
      }
      ft = bt;
      g_iter = i;
      g_boxn = bn;
      break;
    }

    vec2 dif = np2 - cp.xz;
    dif += stp;
    dif *= ird2;
    float dt = min(dif.x, dif.y);
    ct += dt+eps;

    if (ct >= far) {
      g_iter = MaxIter;
      break;
    }
    g_iter = i;
  }
  g_cell = np2;
  return ft;
}

vec3 render(vec3 ro, vec3 rd) {
  vec3 sky = vec3(0.1, 0.2, 0.4) * (0.8 + 0.2 * iAudio.y);

  float skyt = 1E3;
  float bottom  = -(ro.y-Bottom)/rd.y;
  float near    = -(ro.y-(MaxHeight))/rd.y;
  float far     = bottom >= 0.0 ? bottom : skyt;

  float ct = cellTrace(ro, rd, near, far);
  int iter = g_iter;
  vec2 cell = g_cell;
  vec3 boxn = g_boxn;
  
  if (ct >= far) { 
    return sky;
  }

  vec3 p = ro + ct*rd;
  
  vec3 LightDir0 = normalize(vec3(2.0, 2.0, 1.0));

  float sfar  = -(p.y-MaxHeight)/LightDir0.y;
  float sct   = cellTrace((p-2.0*eps*rd), LightDir0, eps, sfar);
  int siter = g_iter;

  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 bcol = vec3(0.5);

  if (iter < MaxIter) {
    n = boxn;
    bcol = baseCol(cell);
    vec2 boxi = rayBox(ro - vec3(cell.x + 0.5, height(cell), cell.y + 0.5), rd, vec3(sz, height(cell), sz));
    bcol *= smoothstep(0.0, 0.1, boxi.y-boxi.x);
  }
  float dif0 = max(dot(n, LightDir0), 0.0);
  dif0 = sqrt(dif0);
  float sf = siter < MaxIter ? tanh_approx(0.066*sct) : 1.0;
  bcol *= mix(0.3, 1.0, dif0*sf);

  vec3 col = bcol;
  col = mix(col, sky, 1.0-exp(-0.125*max(ct-50.0, 0.0)));
  
  return col;
}

vec3 effect(vec2 p, vec2 pp) {
  const float fov = tan(TAU/6.0);
  
  // New orbital camera to prevent losing the scene
  float cam_angle = iTime * 0.05;
  float cam_radius = 20.0;
  vec3 ro = vec3(sin(cam_angle) * cam_radius, 10.0, cos(cam_angle) * cam_radius);

  // Look at the center of the city
  vec3 target = vec3(0.0, 2.0, 0.0);
  
  const vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 ww = normalize(target - ro);
  vec3 uu = normalize(cross(up, ww));
  vec3 vv = cross(ww,uu);
  vec3 rd = normalize(-p.x*uu + p.y*vv + fov*ww);

  vec3 col = render(ro, rd);
  col -= 0.1;
  col *= 1.1;
  col = clamp(col, 0.0, 1.0);
  col = sqrt(col);
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/iResolution.xy;
  vec2 p = -1. + 2. * q;
  vec2 pp = p;
  p.x *= iResolution.x/iResolution.y;
  vec3 col = effect(p, pp);
  fragColor = vec4(col, 1.0);
}
`;
export default source;