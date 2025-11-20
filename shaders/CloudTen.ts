//Cloud Ten
//by nimitz 2015 (twitter: @stormoid)
//License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
//Adapted for Shader Sequencer with procedural noise and audio reactivity.
const source = `
#define time iTime

// --- Procedural Noise Functions (from CloudySky & others) ---
vec2 hash( vec2 p ) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise2D( in vec2 p ) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2 i = floor(p + (p.x+p.y)*K1);
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0); //vec2 of = 0.5 + 0.5*vec2(sign(a.x-a.y), sign(a.y-a.x));
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot(n, vec3(70.0));
}

// Simple procedural 3D noise by layering 2D noise
float noise(in vec3 p) {
    float n = 0.0;
    n += noise2D(p.xy);
    n += noise2D(p.yz);
    n += noise2D(p.xz);
    return n / 3.0; // Average the results
}
// --- End Noise ---

mat2 mm2(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
float moy = 0.;


float fbm(in vec3 x)
{
    float rz = 0.;
    float a = .35;
    // OPTIMIZATION: Reduced iterations for performance.
    for (int i = 0; i<2; i++)
    {
        rz += noise(x)*a;
        a*=.35;
        // Softer features: lower frequency multiplier for smoother noise.
        x*= 3.0;
    }
    return rz;
}

float path(in float x){ return sin(x*0.01-3.1415)*28.+6.5; }
float map(vec3 p){
    // Audio-reactive cloud surface
    float audio_wave = sin(p.x*0.24 + sin(p.z*.01)*7.) * (0.22 + iAudio.y*0.1);
    float audio_pulse = sin(p.z*0.08) * (0.05 + iAudio.x*0.05);
    return p.y*0.07 + (fbm(p*0.3)-0.1) + audio_wave + 0.15 + audio_pulse;
}

float march(in vec3 ro, in vec3 rd)
{
    float precis = .3;
    float h= 1.;
    float d = 0.;
    // OPTIMIZATION: Reduced iterations for performance.
    for( int i=0; i<12; i++ )
    {
        if( abs(h)<precis || d>70. ) break;
        d += h;
        vec3 pos = ro+rd*d;
        pos.y += .5;
	    float res = map(pos)*7.;
        h = res;
    }
	return d;
}

vec3 lgt = vec3(0);
float mapV( vec3 p ){ return clamp(-map(p), 0., 1.);}
vec4 marchV(in vec3 ro, in vec3 rd, in float t, in vec3 bgc)
{
	vec4 rz = vec4( 0.0 );
	
    const int MAX_STEPS = 48;
    int steps = int(mix(16.0, 48.0, u_quality));
	for( int i=0; i < MAX_STEPS; i++ )
	{
        if (i >= steps) break;
		if(rz.a > 0.99 || t > 200.) break;
		
		vec3 pos = ro + t*rd;
        float den = mapV(pos);
        
        // Softer edges: apply a power function to the density to make the falloff smoother.
        den = pow(den, 1.8);
        
        // Audio-reactive coloring within the volume
        vec3 color_mix1 = mix( vec3(.8,.75,.85), vec3(.0), den );
        vec3 color_mix2 = mix(vec3(0.1,0.2,0.55),vec3(.8, .85 + iAudio.z*0.1, .9),moy*0.4);
        vec4 col = vec4(color_mix1, den);
        col.xyz *= mix(bgc*bgc*2.5,  color_mix2, clamp( -(den*40.+0.)*pos.y*.03-moy*0.5, 0., 1. ) );
        col.rgb += clamp((1.-den*6.) + pos.y*0.13 +.55, 0., 1.)*0.35*mix(bgc,vec3(1),0.7); //Fringes
        col += clamp(den*pos.y*.15, -.02, .0); //Depth occlusion
        
        // OPTIMIZATION: Replaced expensive shadow calculation with a cheaper self-shadowing approximation.
        float shadow = 0.25 + 0.75 * pow(1.0 - den, 2.0);
        col *= shadow;
        
        // Softer volume: reduce the per-step alpha for a more blended, atmospheric look.
		col.a *= 0.85;
		col.rgb *= col.a;
		rz = rz + col*(1.0 - rz.a);

        // OPTIMIZATION: Increased minimum step size to traverse empty space faster.
        t += max(.4,(2.-den*30.)*t*0.011);
	}

	return clamp(rz, 0., 1.);
}

float pent(in vec2 p){    
    vec2 q = abs(p);
    return max(max(q.x*1.176-p.y*0.385, q.x*0.727+p.y), -p.y*1.237)*1.;
}

vec3 lensFlare(vec2 p, vec2 pos)
{
	vec2 q = p-pos;
    float dq = dot(q, q);
    vec2 dist = p*(length(p))*0.75;
	float ang = atan(q.x,q.y);
    vec2 pp = mix(p, dist, 0.5);
    float sz = 0.01;
    // Replaced noise(float) with remapped noise2D
    float ang_noise = noise2D(vec2(ang*15.0, 0.0)) * 0.5 + 0.5;
    float rz = pow(abs(fract(ang*.8+.12)-0.5),3.) * ang_noise * 0.5;
    rz *= smoothstep(1.0, 0.0, dot(q,q));
    rz *= smoothstep(0.0, 0.01, dot(q,q));
    rz += max(1.0/(1.0 + 30.0*pent(dist + 0.8*pos)),.0)*0.17;
	rz += clamp(sz-pow(pent(pp + 0.15*pos),1.55),.0, 1.)*5.0;
	rz += clamp(sz-pow(pent(pp + 0.1*pos),2.4),.0, 1.)*4.0;
	rz += clamp(sz-pow(pent(pp - 0.05*pos),1.2),.0, 1.)*4.0;
    rz += clamp(sz-pow(pent((pp + .5*pos)),1.7),.0, 1.)*4.0;
    rz += clamp(sz-pow(pent((pp + .3*pos)),1.9),.0, 1.)*3.0;
    rz += clamp(sz-pow(pent((pp - .2*pos)),1.3),.0, 1.)*4.0;
    return vec3(clamp(rz,0.,1.));
}

mat3 rot_x(float a){float sa = sin(a); float ca = cos(a); return mat3(1.,.0,.0,    .0,ca,sa,   .0,-sa,ca);}
mat3 rot_y(float a){float sa = sin(a); float ca = cos(a); return mat3(ca,.0,sa,    .0,1.,.0,   -sa,.0,ca);}
mat3 rot_z(float a){float sa = sin(a); float ca = cos(a); return mat3(ca,sa,.0,    -sa,ca,.0,  .0,.0,1.);}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{	
    vec2 q = fragCoord.xy / iResolution.xy;
    vec2 p = q - 0.5;
	float asp =iResolution.x/iResolution.y;
    p.x *= asp;
	vec2 mo = iMouse.xy / iResolution.xy;
	moy = mo.y;

    // Audio-reactive travel speed
    float travel_speed = 20.0 + iAudio.w * 25.0;
    float st = sin(time*0.3-1.3)*0.2;
    vec3 ro = vec3(0.,-2.+sin(time*.3-1.)*2.,time*travel_speed);
    ro.x = path(ro.z);
    
    vec3 ta = ro + vec3(0,0,1);
    vec3 fw = normalize( ta - ro);
    vec3 uu = normalize(cross( vec3(0.0,1.0,0.0), fw ));
    vec3 vv = normalize(cross(fw,uu));
    const float zoom = 1.;
    vec3 rd = normalize( p.x*uu + p.y*vv + -zoom*fw );
    
    float rox = sin(time*0.2)*0.6+2.9;
    rox += smoothstep(0.6,1.2,sin(time*0.25))*3.5;
   	float roy = sin(time*0.5)*0.2;
    mat3 rotation = rot_x(-roy)*rot_y(-rox+st*1.5)*rot_z(st);
	mat3 inv_rotation = rot_z(-st)*rot_y(rox-st*1.5)*rot_x(roy);
    rd *= rotation;
    rd.y -= dot(p,p)*0.06;
    rd = normalize(rd);
    
    vec3 col = vec3(0.);
    lgt = normalize(vec3(-0.3,mo.y+0.1,1.));  
    float rdl = clamp(dot(rd, lgt),0.,1.);
  
    vec3 hor = mix( vec3(.9,.6,.7)*0.35, vec3(.5,0.05,0.05), rdl );
    hor = mix(hor, vec3(.5,.8,1),mo.y);
    col += mix( vec3(.2,.2,.6), hor, exp2(-(1.+ 3.*(1.-rdl))*max(abs(rd.y),0.)) )*.6;
    col += .8*vec3(1.,.9,.9)*exp2(rdl*650.-650.);
    col += .3*vec3(1.,1.,0.1)*exp2(rdl*100.-100.);
    col += .5*vec3(1.,.7,0.)*exp2(rdl*50.-50.);
    col += .4*vec3(1.,0.,0.05)*exp2(rdl*10.-10.);  
    vec3 bgc = col;
    
    float rz = march(ro,rd);
    
    if (rz < 70.)
    {   
        vec4 res = marchV(ro, rd, rz-5., bgc);
    	col = col*(1.0-res.w) + res.xyz;
    }
    
    vec3 proj = (-lgt*inv_rotation);
    col += 1.4*vec3(0.7,0.7,0.4)*clamp(lensFlare(p,-proj.xy/proj.z*zoom)*proj.z,0., 1.);
    
    float g = smoothstep(0.03,.97,mo.x);
    col = mix(mix(col,col.brg*vec3(1,0.75,1),clamp(g*2.,0.0,1.0)), col.bgr, clamp((g-0.5)*2.,0.0,1.));
    
	col = clamp(col, 0., 1.);
    col = col*0.5 + 0.5*col*col*(3.0-2.0*col); //saturation
    col = pow(col, vec3(0.416667))*1.055 - 0.055; //sRGB
	col *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.12 ); //Vign

	fragColor = vec4( col, 1.0 );
}
`;
export default source;