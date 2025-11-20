// Shader "oOoOoOoOoOoOoOoOoOoOoOoOoOoOoOo" by TinyTexel
// Licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
// You are free to use and adapt this code, even commercially,
// but you must provide attribution and share derivative works under the same license.


const source = `
#define SPOT_COUNT_MUL 6.0

#define clamp01(x) clamp(x, 0.0, 1.0)

const float Pi = 3.14159265359;
const float Pi2  = Pi * 2.0;
const float Pi05 = Pi * 0.5;

float Pow2(float x) {return x*x;}
float Pow3(float x) {return x*x*x;}
float Pow4(float x) {return Pow2(Pow2(x));}

vec2 AngToVec(float ang)
{	
	return vec2(cos(ang), sin(ang));
}


float SqrLen(float v) {return v * v;}
float SqrLen(vec2  v) {return dot(v, v);}
float SqrLen(vec3  v) {return dot(v, v);}
float SqrLen(vec4  v) {return dot(v, v);}

float GammaEncode(float x) {return pow(x, 1.0 / 2.2);}
vec2 GammaEncode(vec2 x) {return pow(x, vec2(1.0 / 2.2));}
vec3 GammaEncode(vec3 x) {return pow(x, vec3(1.0 / 2.2));}
vec4 GammaEncode(vec4 x) {return pow(x, vec4(1.0 / 2.2));}

//=======================================================================//
///////////////////////////////////////////////////////////////////////////

float Intersect_Ray_Sphere(
vec3 rp, vec3 rd, 
vec3 sp, float sr2, 
out vec2 t)
{	
	rp -= sp;
	
	float a = dot(rd, rd);
	float b = 2.0 * dot(rp, rd);
	float c = dot(rp, rp) - sr2;
	
	float D = b*b - 4.0*a*c;
	
	if(D < 0.0) return 0.0;
	
	float sqrtD = sqrt(D);
	t = (-b + vec2(-sqrtD, sqrtD)) / a * 0.5;
	
	if(c < 0.0) t.xy = t.yx;

    if (t.x > 0.0 || c < 0.0) return 1.0;
    return -1.0;
}

const float PHI = 1.6180339887498948482045868343656;

float madfrac( float a,float b) { return a*b -floor(a*b); }
vec2  madfrac( vec2 a, float b) { return a*b -floor(a*b); }

float sf2id(vec3 p, float n) 
{
    float phi = min(atan(p.y, p.x), Pi), cosTheta = p.z;
    
    float k  = max(2.0, floor( log(n * Pi * sqrt(5.0) * (1.0 - cosTheta*cosTheta))/ log(PHI*PHI)));
    float Fk = pow(PHI, k)/sqrt(5.0);
    
    vec2 F = vec2( floor(Fk + 0.5), floor(Fk * PHI + 0.5) );

    vec2 ka = -2.0*F/n;
    vec2 kb = 2.0*Pi*madfrac(F+1.0, PHI-1.0) - 2.0*Pi*(PHI-1.0);    
    mat2 iB = mat2( ka.y, -ka.x, -kb.y, kb.x ) / (ka.y*kb.x - ka.x*kb.y);

    vec2 c = floor( iB * vec2(phi, cosTheta - (1.0-1.0/n)));
    float d = 8.0;
    float j = 0.0;
    for( int s=0; s<4; s++ ) 
    {
        vec2 uv = vec2( float(s-2*(s/2)), float(s/2) );
        
        float cosTheta_local = dot(ka, uv + c) + (1.0-1.0/n);
        
        cosTheta_local = clamp(cosTheta_local, -1.0, 1.0)*2.0 - cosTheta_local;
        float i = floor(n*0.5 - cosTheta_local*n*0.5);
        float phi_local = 2.0*Pi*madfrac(i, PHI-1.0);
        cosTheta_local = 1.0 - (2.0*i + 1.)/n;
        float sinTheta = sqrt( 1.0 - cosTheta_local*cosTheta_local);
        
        vec3 q = vec3( cos(phi_local)*sinTheta, sin(phi_local)*sinTheta, cosTheta_local);
        float squaredDistance = dot(q-p, q-p);
        if (squaredDistance < d) 
        {
            d = squaredDistance;
            j = i;
        }
    }
    return j;
}

vec3 id2sf( float i, float n) 
{
    float phi = 2.0*Pi*madfrac(i,PHI);
    float zi = 1.0 - (2.0*i+1.)/n;
    float sinTheta = sqrt( 1.0 - zi*zi);
    return vec3( cos(phi)*sinTheta, sin(phi)*sinTheta, zi);
}
//=================================================================================================//
/////////////////////////////////////////////////////////////////////////////////////////////////////


float ProjSphereArea(float rdz, vec3 p, float rr)
{
	float zz = p.z * p.z;	
	float ll = dot(p, p);
	
    return Pi * rdz*rdz * rr * inversesqrt(abs(Pow3(rr - zz) / (ll - rr)));
}

vec4 ProjDisk(vec3 rd, vec3 p, vec3 n, float rr)
{   
    vec3 np0 = n * p.xyz;
    vec3 np1 = n * p.yzx;
    vec3 np2 = n * p.zxy;  

    mat3 k_mat = mat3(vec3( np0.y + np0.z,  np2.x        ,  np1.x        ),
						  vec3(-np2.y        ,  np1.y        , -np0.x - np0.z),
						  vec3(-np1.z        , -np0.x - np0.y,  np2.z        ));    
    
    vec3 u =     k_mat * rd;
    vec3 k = u * k_mat;
    
    float nrd = dot(n, rd);
    float nrd_rr = nrd * rr;

    float v = dot(u, u) - nrd * nrd_rr; 
    vec3  g =    (k     - n   * nrd_rr) * 2.0;   
    
    return vec4(g.xy, 0.0, v);
}

float SphX0(float d, float rr0, float rr1) { return 0.5 * (d + (rr0 - rr1) / d); }

vec3 EvalSceneCol(vec3 cpos, mat3 cam_mat, float focalLen, vec2 uv0)
{      
    const vec3 cBG = 0.014 * vec3(0.9, 1.0, 1.2);

    vec2 uv2 = uv0 - iResolution.xy * 0.5;
    
  	vec3 rdir0 = vec3(uv2, focalLen);
    
    float rdir0S = 0.5 * iResolution.x;
    rdir0 /= rdir0S;
    
    vec3 rdir = normalize(cam_mat * rdir0); 
    
    
    vec2 t;
	float hit = Intersect_Ray_Sphere(cpos, rdir, vec3(0.0), 1.0, t);
    
    if(hit <= 0.0) return cBG;

    vec3 pf = cpos + rdir * t.x;
    vec3 pb = cpos + rdir * t.y;

	vec3 col = cBG;
    
    float rra = 0.0;

    vec3 p2;
    float rr;
    {
	// Bass affects number of spots
    float s = SPOT_COUNT_MUL + iAudio.x * 20.0;
    float n = 1024.0*s;
        
    float id = sf2id(pf.xzy, n);
    p2 = id2sf(id, n).xzy;        

    float u = id / n;
    // Overall volume affects spot radius animation speed
    float arg = (-u* 615.5*2.0*s) + iTime * (1.0 + iAudio.w * 1.5);
        
    rra = sin(arg);
    
	rra = mix(abs(rra), Pow2(rra), 0.75);        
    
    // Treble affects spot size flicker
    rr = (0.05/s * rra) * (1.0 + iAudio.z * 0.4); 
    }
    
    vec3 n2 = normalize(p2);
    
    const float maskS = 0.5;// sharpness
    
    if(SqrLen(pf - p2) > rr*rr) return cBG;

    float d = length(p2);

    float x0 = SphX0(d, 1.0, rr);        
    vec3 d0c = n2 * x0;

    float d0rr = 1.0 - x0*x0;

    vec3 dp_c = (d0c - cpos) * cam_mat;
    vec3 dn_c = n2 * cam_mat;

    vec4 r = ProjDisk(rdir0, dp_c, dn_c, d0rr);        

    float cmask = clamp01(-r.w * inversesqrt(dot(r.xy, r.xy))*rdir0S * maskS);

    float cmask2 = 0.0;
    {
        vec3 d1c = n2 * (x0 - 0.005);

        vec4 r2 = ProjDisk(rdir0, (d1c - cpos) * cam_mat, n2 * cam_mat, (1.0 - x0*x0)*rra);
        cmask2 = clamp01(-r2.w * inversesqrt(dot(r2.xy, r.xy))*rdir0S * maskS);
    }
	
    float A = ProjSphereArea(rdir0.z, dp_c, d0rr);        
    A *= rdir0S*rdir0S;
    float NdV = abs(dot(dn_c, normalize(dp_c)));
    A *= NdV;
    
    #ifndef USE_SSAA
    A *= NdV;
    cmask *= clamp01((A -2.0)*0.125);
    #else
    A = mix(A, A*NdV, 0.5);
    cmask *= clamp01((A - 3.)*0.125);
    #endif

    // Mids affect spot color
    vec3 cR = vec3(1., 0.02, 0.2) + iAudio.y * vec3(0.0, 0.4, 0.4);

    // Mix the spot color with a darker version of itself for the center, instead of black.
    vec3 final_spot_color = mix(cR, cR * 0.5, cmask2);
    return mix(cBG, final_spot_color, cmask);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec3 col = vec3(0.0);
    
    vec2 uv = fragCoord.xy - 0.5;
  
    vec2 ang = vec2(Pi * 0.0, -Pi * 0.3);

    // Overall volume affects camera rotation speed
    ang.x += iTime * (0.15 + iAudio.w * 0.3);

    float fov = Pi * 0.5;
    
    mat3 cam_mat;
    float focalLen;
    {
        float sinPhi   = sin(ang.x);
        float cosPhi   = cos(ang.x);
        float sinTheta = sin(ang.y);
        float cosTheta = cos(ang.y);    

        vec3 front = vec3(cosPhi * cosTheta, 
                                   sinTheta, 
                          sinPhi * cosTheta);

        vec3 right = vec3(-sinPhi, 0.0, cosPhi);
        vec3 up    = cross(right, front);

        focalLen = iResolution.x * 0.5 * tan(Pi05 - fov * 0.5);
        
        cam_mat = mat3(right, up, front);
    }
    
    vec3 cpos = -cam_mat[2] * (exp2(-0.3));

    cpos.y += .75;

    #ifndef USE_SSAA
    
	col = EvalSceneCol(cpos, cam_mat, focalLen, fragCoord);
    
	#else
    
    col  = EvalSceneCol(cpos, cam_mat, focalLen, uv + vec2(0.3, 0.1));
    col += EvalSceneCol(cpos, cam_mat, focalLen, uv + vec2(0.9, 0.3));
    col += EvalSceneCol(cpos, cam_mat, focalLen, uv + vec2(0.5, 0.5));
    col += EvalSceneCol(cpos, cam_mat, focalLen, uv + vec2(0.1, 0.7));
    col += EvalSceneCol(cpos, cam_mat, focalLen, uv + vec2(0.7, 0.9));   
    col *= 0.2;
    
 	#endif

    
	fragColor = vec4(GammaEncode(clamp01(col)), 1.0);
}
`;
export default source;