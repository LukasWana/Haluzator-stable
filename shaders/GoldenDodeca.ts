
// License: CC0
// Results after some random coding while listening to online concert
// Adapted for Shader Sequencer with fixes and audio reactivity.

const source = `
#define PI    3.141592654
#define TAU   (2.0*PI)

// These are pre-calculated normalized vectors from the original shader's constants.
// normalize() is not a constant expression in WebGL 1.
const vec3 n1 = vec3(-0.809017, 0.309017, 0.5);
const vec3 n2 = vec3(0.309017, -0.5, 0.809017);

float pmin(float a, float b, float k) {
  float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
  return mix( b, a, h ) - k*h*(1.0-h);
}

float dodec(in vec3 z, float size, float width, float ttime) {
  vec3 p = z;
  float t;
  z = abs(z);
  t=dot(z,n1); if (t>0.0) { z-=2.0*t*n1; }
  t=dot(z,n2); if (t>0.0) { z-=2.0*t*n2; }
  z = abs(z);
  t=dot(z,n1); if (t>0.0) { z-=2.0*t*n1; }
  t=dot(z,n2); if (t>0.0) { z-=2.0*t*n2; }
  z = abs(z);

  const vec3 plnormal = vec3(0.57735, 0.57735, -0.57735); // normalize(vec3(1,1,-1))
  float dmin = dot(z-vec3(size,0.,0.),plnormal);
        
  // Bass pulses the surface texture
  float audio_width = width * (1.0 + iAudio.x * 2.0);
  dmin = abs(dmin) - audio_width*7.5*(0.55 + 0.45*sin(10.0*length(p) - 0.5*p.y + ttime/9.0));
        
  return dmin;
}

void rot(inout vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

float df(vec2 p, float size, float offc, float width, float ttime) {
  float d = 100000.0;
  float off = 0.30  + 0.25*(0.5 + 0.5*sin(ttime/11.0));
  
  // WebGL 1 requires constant loop conditions
  for (int i = 0; i < 15; ++i) {
    vec2 ip = p;
    rot(ip, float(i)*TAU/15.0);
    ip -= vec2(offc*size, 0.0);
    vec2 cp = ip;
    rot(ip, ttime/73.0);
    float dd = dodec(vec3(ip, off*size), size, width, ttime);
    float cd = length(cp - vec2(0.25*sin(ttime/13.0), 0.0)) - 0.125*size;
    cd = abs(cd) - width*0.5;
    d = pmin(d, dd, 0.05);
    d = pmin(d, cd, 0.025);
  }
  return d;
}

vec3 postProcess(vec3 col, vec2 q, vec2 p) {
  col=pow(clamp(col,0.0,1.0),vec3(0.75)); 
  col=col*0.6+0.4*col*col*(3.0-2.0*col);  // contrast
  col=mix(col, vec3(dot(col, vec3(0.33))), -0.4);  // saturation
  const float r = 1.5;
  float d = max(r - length(p), 0.0)/r;
  col *= vec3(1.0 - 0.25*exp(-200.0*d*d));
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Overall volume controls animation speed
  float ttime = iTime * (1.0 + iAudio.w * 0.5) * TAU;

  const float size  = 0.75 ;
  const float offc  = 1.05;
  const float width = 0.0125;

  vec2 q = fragCoord.xy / iResolution.xy;
  vec2 p = 2.0*(q - 0.5);
  p.x *= iResolution.x/iResolution.y;
  float d = df(p, size, offc, width, ttime);

  // Highs soften/sharpen the edges
  float fuzzy = 0.0025 * (1.0 + iAudio.z * 5.0);
    
  vec3 col = vec3(0.0);

  const vec3 baseCol = vec3(240.0, 175.0, 20.0)/255.0;
  
  col += 0.9*baseCol*vec3(smoothstep(fuzzy, -fuzzy, d));

  // Mids shift color waves
  vec3 rgb = 0.5 + 0.5*vec3(sin(TAU*vec3(50.0, 49.0, 48.0)*(d - 0.050) + ttime/3.0 + iAudio.y * 2.0));

  col += baseCol.xyz*pow(rgb, vec3(8.0, 9.0, 7.0)); 
  // Replaced tanh with a compatible clamp expression
  col *= 1.0 - clamp(0.05+length(8.0*d), 0.0, 1.0);

  float phase = TAU/4.0*(-length(p) - 0.5*p.y) + ttime/11.0;
 
  float wave = sin(phase);
  float fwave = sign(wave)*pow(abs(wave), 0.75);
 
  col = abs(0.79*(0.5 + 0.5*fwave) - col);
  col = pow(col, vec3(0.25, 0.5, 0.75));
  col = postProcess(col, q, p);

  fragColor = vec4(col, 1.0);
}
`;
export default source;
