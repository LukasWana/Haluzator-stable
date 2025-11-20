// "Impact" - Originally by Kyle, adapted by Lux & P_Malin
// https://www.shadertoy.com/view/Xds3zn
// Optimized, refactored, and made audio-reactive for Shader Sequencer.
const source = `
// --- OPTIMIZATION & COMPATIBILITY SETTINGS ---
#define MAX_TRACE_DISTANCE 6.0
#define INTERSECTION_PRECISION 0.001

#define FOG_STEPS 14

// --- UTILITY & NOISE FUNCTIONS ---

vec3 hsv(float h, float s, float v) {
  return mix( vec3( 1.0 ), clamp( ( abs( fract(
    h + vec3( 3.0, 2.0, 1.0 ) / 3.0 ) * 6.0 - 3.0 ) - 1.0 ), 0.0, 1.0 ), s ) * v;
}

float hash (float n) {
	return fract(sin(n)*43758.5453);
}

// Procedural 3D noise (from Star Nursery)
float noise (in vec3 x) {
	vec3 p = floor(x);
	vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	float n = p.x + p.y*57.0 + 113.0*p.z;
	float res = mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
						mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
					mix(mix( hash(n+113.0), hash(n+114.0),f.x),
						mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
	return res;
}

// Tri-planar noise (for distinct patterns)
float tri(in float x){return abs(fract(x)-.5);}
vec3 tri3(in vec3 p){return vec3( tri(p.z+tri(p.y*1.)), tri(p.z+tri(p.x*1.)), tri(p.y+tri(p.x*1.)));}

float triNoise3D(in vec3 p, in float spd) {
    float z=1.4;
	float rz = 0.;
    vec3 bp = p;
	for (float i=0.; i<=3.; i++ )
	{
        vec3 dg = tri3(bp*2.);
        p += (dg+iTime*.1*spd);
        bp *= 1.8;
		z *= 1.5;
		p *= 1.2;
        rz+= (tri(p.z+tri(p.x+tri(p.y))))/z;
        bp += 0.14;
	}
	return rz;
}

// --- CAMERA ---

mat3 calcLookAtMatrix( in vec3 ro, in vec3 ta ) {
    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww,vec3(0.0,1.0,0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
    return mat3( uu, vv, ww );
}

void doCamera( out vec3 camPos, out vec3 camTar, in float time ) {
    // Continuous spiral path, orbiting the center
    float angle = time * 0.15;
    float radius = 3.5 + sin(time * 0.1) * 0.5;
    camPos = vec3(cos(angle) * radius, 0.7, sin(angle) * radius);
    camTar = vec3(0.0, 0.0, 0.0); // Always look at the origin
}

// --- DISTANCE FUNCTIONS (SDF) ---

float sdSphere( vec3 p, float s ) {
  return length(p) - s;
}

float sdPlanet( vec3 p, float s ) {
    // Bass affects the scale of the noise, making the planet more turbulent
    float noise_scale = 0.5 + iAudio.x * 0.5;
    // Mids affect the "wobble" speed of the surface sine wave
    float wobble_speed = 1.0 + iAudio.y * 2.0;
    return length(p) - s + .1 * triNoise3D( p * noise_scale , .01 ) + .04 * sin( p.x * p.y * p.z * 10. + iTime * wobble_speed );
}

// Union of two shapes, retaining material ID
vec2 opU( vec2 d1, vec2 d2 ){
	return (d1.x < d2.x) ? d1 : d2;
}

// Main scene SDF
vec2 map( vec3 pos, vec3 planet_pos ){
    // Central Planet (ID 1.0)
    vec2 res = vec2( sdPlanet( pos, .8 ), 1.0 );
    // Orbiting Moon (ID 2.0)
    vec2 res2 = vec2( sdSphere( pos - planet_pos, .1 ), 2.0 );
    res = opU( res, res2 );
   	return res;
}

// --- RAYMARCHING & SHADING ---

vec2 calcIntersection( in vec3 ro, in vec3 rd, in vec3 planet_pos ){
    float h = INTERSECTION_PRECISION*2.0;
    float t = 0.0;
	float res = -1.0;
    float id = -1.0;
    const int MAX_ITR = 100;
    int ITR = int(mix(30.0, 100.0, u_quality));
    for( int i=0; i< MAX_ITR ; i++ ){
        if (i >= ITR) break;
        if( h < INTERSECTION_PRECISION || t > MAX_TRACE_DISTANCE ) break;
	   	vec2 m = map( ro+rd*t, planet_pos );
        h = m.x;
        t += h;
        id = m.y;
    }
    if( t < MAX_TRACE_DISTANCE ) res = t;
    if( t > MAX_TRACE_DISTANCE ) id =-1.0;
    return vec2( res , id );
}

vec3 calcNormal( in vec3 pos, in vec3 planet_pos ){
	vec3 eps = vec3( 0.001, 0.0, 0.0 );
	vec3 nor = vec3(
	    map(pos+eps.xyy, planet_pos).x - map(pos-eps.xyy, planet_pos).x,
	    map(pos+eps.yxy, planet_pos).x - map(pos-eps.yxy, planet_pos).x,
	    map(pos+eps.yyx, planet_pos).x - map(pos-eps.yyx, planet_pos).x );
	return normalize(nor);
}

// Volumetric fog/nebula
vec4 overlayFog( vec3 ro, vec3 rd, vec3 planet_pos ){
    float lum = 0.0;
    vec3 col = vec3( 0.0 );
    for( int i = 0; i < FOG_STEPS; i++ ){
        vec3 p = ro + rd * (MAX_TRACE_DISTANCE / float(FOG_STEPS)) * float(i);
        vec2 m = map(p, planet_pos);
        if(m.x < 0.0) continue; // Skip fog inside objects
        
        float ss = pow(clamp(pow(m.x * 10., 3.), 0., 5.) / 5., 1.0);
        float planetFog = 5.0 / (length(p - planet_pos) * length(planet_pos));
        
        float fog_noise = noise(p * 0.3 + vec3(100.0));
        lum += ss * pow(planetFog, 2.0) * .3 * fog_noise;
        // Mids (y) shift the hue of the nebula
        col += ss * planetFog * hsv(lum * .7 + .5 + iAudio.y * 0.2, 1., 1.);
    }
    return vec4(col, lum) / float(FOG_STEPS);
}


// --- MAIN ---
void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 p = (-iResolution.xy + 2.0*fragCoord.xy)/iResolution.y;
    
    // Audio-reactive time controls overall animation speed
    float time = iTime * (0.2 + iAudio.w * 0.5);

    // Orbiting moon position
    float r = 1.5;
    vec3 planet_pos = vec3(r * cos(.3 + time), 0.0, r * sin(.3 + time));
        
    // --- Camera Setup ---
    vec3 ro, ta;
    doCamera( ro, ta, time );
    mat3 camMat = calcLookAtMatrix( ro, ta );
	vec3 rd = normalize( camMat * vec3(p.xy, 2.0) ); // 2.0 is lens length
    
    vec3 col = vec3(0.0);
    vec2 res = calcIntersection( ro, rd, planet_pos );

    if( res.y > 0.0 ){ // If we hit an object
       vec3 pos = ro + rd * res.x;
       vec3 nor = calcNormal( pos, planet_pos );
       vec3 lightDir = normalize(pos - planet_pos); // Light emanates from the moon

       float match = max(0.0, dot(-nor, lightDir));
       vec3 refl = reflect(lightDir, nor);
       float reflMatch = max(0.0, dot(-rd, refl));
       float eyeMatch = 1.0 - max(0.0, dot(-rd, nor));
        
       // Highs (z) make lighting brighter and shift towards blue/white
       vec3 audio_light_mod = vec3(1.0) + iAudio.z * vec3(0.5, 0.8, 1.2);
       
       vec3 ambi = vec3(.1, 0.1, 0.1);
       vec3 lamb = vec3(1., .5, .3) * match * audio_light_mod;
       vec3 spec = vec3(1., .3, .2) * pow(reflMatch, 20.0) * audio_light_mod;
       vec3 rim = vec3(1., .3, .1) * pow(eyeMatch, 3.0);
       col = rim + ((ambi + lamb + spec) * 2.0 / length(lightDir));
    } else {
      // Background stars/nebula
      float neb = pow(triNoise3D((sin(rd) - vec3(156.29)) * 1.0, .1), 3.0);
      col = neb * hsv(neb + .6, 1., 1.0);
    }
    
    // Volumetric Fog
    vec4 fog = overlayFog(ro, rd, planet_pos);
    col += .4 * fog.xyz * fog.w;
    
	fragColor = vec4(col, 1.0);
}
`;
export default source;