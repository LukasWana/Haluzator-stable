// Shader by an anonymous author, adapted for Shader Sequencer by AI
// Features a procedural heightmap with wave-like patterns.

const source = `
// tanh approximation for WebGL 1 compatibility
float tanh_approx(float x) {
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

float pmin(float a, float b, float k) {
  float h = clamp(.5+.5*(b-a)/k, 0., 1.);
  return mix(b, a, h) - k*h*(1.-h);
}

#define pabs(a,k) -pmin(a, -(a), k)

float height(vec2 p) {
    // Overall volume controls time speed
    float t = iTime * (1.0 + iAudio.w * 0.5);
    
    // Bass (x) affects horizontal texture stretching
    float xm = .002562 * (1.0 + iAudio.x * 2.0);
    // Mids (y) affect vertical wave frequency
    float ym = ( 3. - cos(6.28*t/6e2) ) / (16.0 - iAudio.y * 8.0);
    
    float d = length(p)*.4;
    float x = pow(d, .1);
    float y = ( atan(p.x, p.y) + .05*t - 2.*d ) / 6.28;
    float c = 1e6;
    float v;

    // FIX: Changed for loop to use an integer counter for WebGL 1 compatibility
    for (int i = 0; i < 3; ++i) {
        float fi = float(i);
        v = length( fract( vec2( x - t*fi*xm, fract(y + fi*ym)*.5 )  *20. )*2.-1.);
        c = pmin(c, v, .125);
    }

    // FIX: Replaced tanh with tanh_approx
    return .015*( pabs(tanh_approx(5.5*d-80.*c*c*d*d*(.55-d)) -d/4., .25) -1. );
}

#define R iResolution.xy
#define e  vec2(4./R.y, 0)
#define normal(p) normalize( vec3( height(p + e.xy) - height(p - e.xy), \
                                   -2.*e.x,                             \
                                   height(p + e.yx) - height(p - e.yx)  \
                           )      )

vec3 shad(vec3 po, vec3 ref, vec3 n, float dm, vec3 mat, float i) {
    // Lighting direction wobbles with overall volume
    vec3 L = normalize( -vec3(i*1.25 , 1.95, -1.25 + sin(iTime * iAudio.w)) - po );
    float diff = max(dot(n, L), 0.);
    return dm* ( diff*diff* dm*mat + pow(max(dot(ref, L), 0.), 16. ) );
}

void mainImage( out vec4 O, vec2 u ) {
  vec2 p = (u+u - R ) / R.y;
  // FIX: Replaced tanh with tanh_approx
  float h = height(p);
  float dm = tanh_approx(abs(h)*120.);
  vec3 n = normal(p);
  vec3 po = vec3(p.x, 0, p.y);
  vec3 rd = normalize( vec3(0,8,0) - po );
  vec3 ref = reflect(rd, n);
  
  // Highs (z) affect material color
  vec3 mat = .05*vec3(.1 + iAudio.z * 0.5, .73, 1);
  
  vec3 C = shad(po,ref,n,dm,mat, 1.) * 2.*vec3(.72,1,.65)
         + shad(po,ref,n,dm,mat,-1.) * 2.*vec3(.4,.75,1);
  
  O.rgb = sqrt(C);
}
`;
export default source;
