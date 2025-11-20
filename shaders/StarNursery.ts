const source = `
// Built from the basics of'Clouds' Created by inigo quilez - iq/2013
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

// Edited by Dave Hoskins into "Star Nursery"
// V.2.0 Optimized by replacing volumetric raymarching with surface raymarching for performance.

mat3 m = mat3( 0.30,  0.90,  0.60,
              -0.90,  0.36, -0.48,
              -0.60, -0.48,  0.34 );
#define time (iTime * (1.0 + pow(iAudio.w, 1.5) * 0.4) + 46.0)

//----------------------------------------------------------------------
float hash( float n )
{
    return fract(sin(n)*43758.5453123);
}

//----------------------------------------------------------------------
float noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);

    f = f*f*(3.0-2.0*f);

    float n = p.x + p.y*57.0;

    float res = mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                    mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y);

    return res;
}

//----------------------------------------------------------------------
// Procedural 3D noise replacement to avoid texture dependencies
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+0.0), hash(n+1.0),f.x),
                   mix( hash(n+57.0), hash(n+58.0),f.x),f.y),
               mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                   mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
}

//----------------------------------------------------------------------
float fbm( vec3 p )
{
    float f;
    f  = 1.600*noise( p ); p = m*p*2.02;
    f += 0.3500*noise( p ); p = m*p*2.33;
    f += 0.2250*noise( p ); p = m*p*2.03;
    f += 0.0825*noise( p ); p = m*p*2.01;
    return f;
}

//----------------------------------------------------------------------
// SDF map for the nebula surface
float map( in vec3 p )
{
	float f = fbm( p*1.0 - vec3(.4,0.3,-0.3)*time);
    float surfaceLevel = 0.2;
	return (f - surfaceLevel - p.y * 0.1) * 0.5;
}

//----------------------------------------------------------------------
vec3 calcNormal( in vec3 pos )
{
    vec2 e = vec2(0.002, 0.0);
    return normalize(vec3(
        map(pos + e.xyy) - map(pos - e.xyy),
        map(pos + e.yxy) - map(pos - e.yxy),
        map(pos + e.yyx) - map(pos - e.yyx)
    ));
}

//----------------------------------------------------------------------
// Surface raymarcher
float trace( in vec3 ro, in vec3 rd, float tmax )
{
    float t = 0.01;
    for(int i=0; i<80; i++)
    {
        vec3 pos = ro + t*rd;
        float d = map(pos);
        if(d < 0.001*t || t > tmax) break;
        t += d * 0.6;
    }
    return (t < tmax) ? t : -1.0;
}


//----------------------------------------------------------------------
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 q = fragCoord.xy / iResolution.xy;
    vec2 p = -1.0 + 2.0*q;
    p.x *= iResolution.x/ iResolution.y;
    vec2 mo = (-1.0 + 2.0 + iMouse.xy) / iResolution.xy;
    
    // Camera code...
    vec3 ro = 5.6*normalize(vec3(cos(2.75-3.0*mo.x), .4-1.3*(mo.y-2.4), sin(2.75-2.0*mo.x)));
	vec3 ta = vec3(.0, 5.6, 2.4);
    vec3 ww = normalize( ta - ro);
    vec3 uu = normalize(cross( vec3(0.0,1.0,0.0), ww ));
    vec3 vv = normalize(cross(ww,uu));
    vec3 rd = normalize( p.x*uu + p.y*vv + 1.5*ww );

    // Background and sun
    vec3 sundir = vec3(1.0,0.4,0.0);
	float sun = clamp( dot(sundir,rd), 0.0, 2.0 );
	vec3 col = mix(vec3(.3,0.0,0.05), vec3(0.2,0.2,0.3), sqrt(max(rd.y, 0.001)));
	col += .4*vec3(.4,.2,0.67)*sun;
	col = clamp(col, 0.0, 1.0);
	col += 0.43*vec3(.4,0.4,0.2)*pow( sun, 21.0 );
	
	// Do the stars...
	float v = 1.0/( 2. * ( 1. + rd.z ) );
	vec2 xy = vec2(rd.y * v, rd.x * v);
    vec3 rd_star = rd;
    rd_star.z += time*.002;
    float s = noise(rd_star.xz*134.0);
	s += noise(rd_star.xz*370.);
	s += noise(rd_star.xz*870.);
	s = pow(s,19.0) * 0.00000001 * max(rd_star.y, 0.0);
	if (s > 0.0)
	{
		vec3 backStars = vec3((1.0-sin(xy.x*20.0+time*13.0*rd_star.x+xy.y*30.0))*.5*s,s, s); 
		col += backStars;
	}

    // Raymarch the nebula surface
    float t = trace(ro, rd, 25.0);
    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        // Recreate material color from original logic
        float f = fbm( pos*1.0 - vec3(.4,0.3,-0.3)*time);
        float density_proxy = clamp(4.0 * f, 0.0, 1.0);
        vec3 mate = mix( .7*vec3(1.0,0.4,0.2), vec3(0.2,0.0,0.2), density_proxy);
        mate += pow(abs(.95-f), 26.0) * (1.85 + pow(iAudio.x, 2.0) * 4.0);

        // Simple lighting
        float dif = pow(max(dot(nor, sundir), 0.0), 1.5);
        float amb = 0.5 + 0.5 * dot(nor, vec3(0.0, 1.0, 0.0));
        float fre = pow(clamp(1.0 + dot(nor, rd), 0.0, 1.0), 3.0);
        
        vec3 lighting = vec3(0.3) * amb;
        lighting += vec3(1.0, 0.7, 0.5) * dif;
        lighting += vec3(0.8, 0.9, 1.0) * fre;

        vec3 cloudColor = mate * lighting;
        
        // Fog
        float fog = exp(-0.02 * t * t);
        col = mix(col, cloudColor, fog);
    }
	
	#define CONTRAST 1.1
	#define SATURATION 1.15
	#define BRIGHTNESS 1.03
	col = mix(vec3(.5), mix(vec3(dot(vec3(.2125, .7154, .0721), col*BRIGHTNESS)), col*BRIGHTNESS, SATURATION + pow(iAudio.y, 2.0) * 0.15), CONTRAST);
    
    fragColor = vec4( col, 1.0 );
}
`;
export default source;