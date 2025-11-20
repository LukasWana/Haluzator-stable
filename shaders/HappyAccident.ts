const source = `
// CC0: Glowing Walls
//  Some weekend tinkering
// Adapted for Shader Sequencer by AI

// tanh approximation for WebGL 1 compatibility
float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

vec3 tanh_approx_vec3(vec3 v) {
    return vec3(tanh_approx(v.x), tanh_approx(v.y), tanh_approx(v.z));
}

// License: Unknown, author: Unknown, found: don't remember
float hash(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,58.233))) * 13758.5453);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 pp = -1. + 2. * fragCoord/iResolution.xy;
  vec2 p  = pp;
  p.x *= iResolution.x/iResolution.y;

  // Audio: Overall volume controls speed
  float time = iTime * (1.0 + iAudio.w * 0.5);

  vec3
      col   = vec3(0)
    , ro    = vec3(0,0,time)
    , rd    = normalize(vec3(p,2))
    , ard   = abs(rd)
    , srd   = sign(rd)
    ;

  for (int i_int = 1; i_int < 10; ++i_int) {
    float i = float(i_int);
    float tw = -(ro.x-6.*sqrt(i))/ard.x;

    vec3 wp = ro+rd*tw;

    vec2 
        wp2 = (ro+rd*tw).yz*2E-2
      , wn2 = floor(wp2 + 0.5)
      , wc2 = wp2 - wn2
      ;

    if (hash(wn2+i+.5*srd.x) < .5)
      wc2 = vec2(wc2.y, -wc2.x);

    float
        // Audio: Mids affect pattern
        fo  = smoothstep(-sqrt(.5), 1., sin(.1*wp.z+time+i+srd.x + iAudio.y * 2.0))
        // Audio: Bass affects wall thickness
      , wd  = abs(min(length(wc2+.5)-.5, length(wc2-.5)-.5))-(25E-3 * (1.0 + iAudio.x * 2.0))
      ;


    col += 
       // Audio: Mids shift color phase
       (1.+sin(vec3(-4,3,1)/2.+5E-2*tw+time + iAudio.y))
      *exp(-3E-3*tw*tw)
      *fo
      // Audio: Highs boost glow intensity
      * (1.0 + iAudio.z * 1.5) * 25E-4/max(abs(wd), 3E-3*fo);
  }

  col *= smoothstep(sqrt(2.), sqrt(.5), length(pp));
  col = sqrt(tanh_approx_vec3(col));

  fragColor = vec4(col, 1.);
}
`;
export default source;