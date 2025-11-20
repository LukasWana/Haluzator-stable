const source = `
/*
	Simplex Truchet Tubing - Standalone Version
	------------------------------------------
	
	Upraveno pro funkci bez externích vstupů (iChannel0, iTime, iResolution)
*/
#define FAR 20. // Maximum ray distance. Analogous to the far plane.

//#define NO_BOLTS // Bland, but faster, plus it allows you to see the pattern better.

// Scene object ID. Either the bolts (0) or the tube itself (1).
float objID;
float svObjID; // Global ID to keep a copy of the above from pass to pass.

float hash(float n){ return fract(sin(n)*43758.5453); }

// Standard 2D rotation formula.
mat2 rot2(in float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// The path is a 2D sinusoid that varies over time, depending upon the frequencies, and amplitudes.
vec2 path(in float t){ 
    // Curvy path.
    float a = sin(t * 0.22);
    float b = cos(t * 0.28);
    return vec2(a*2. -b*.75, b*.85 + a*.75);
}

// Nahrazení textury proceduráním noise
vec3 proceduralTexture(vec3 p) {
    // Jednoduchý 3D noise
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    f = f * f * (3.0 - 2.0 * f); // smooth interpolation
    
    float n000 = hash(dot(i, vec3(1, 57, 113)));
    float n100 = hash(dot(i + vec3(1,0,0), vec3(1, 57, 113)));
    float n010 = hash(dot(i + vec3(0,1,0), vec3(1, 57, 113)));
    float n110 = hash(dot(i + vec3(1,1,0), vec3(1, 57, 113)));
    float n001 = hash(dot(i + vec3(0,0,1), vec3(1, 57, 113)));
    float n101 = hash(dot(i + vec3(1,0,1), vec3(1, 57, 113)));
    float n011 = hash(dot(i + vec3(0,1,1), vec3(1, 57, 113)));
    float n111 = hash(dot(i + vec3(1,1,1), vec3(1, 57, 113)));
    
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    
    float nxyz = mix(nxy0, nxy1, f.z);
    
    return vec3(nxyz, nxyz * 0.8, nxyz * 0.6);
}

// Tri-Planar blending function nahrazena proceduralním texturováním
vec3 tex3D(vec3 p, in vec3 n ){ 
    n = max(abs(n), 0.001);
    n /= dot(n, vec3(1));
    
    vec3 tx = proceduralTexture(p.yzx);
    vec3 ty = proceduralTexture(p.zxy);
    vec3 tz = proceduralTexture(p.xyz);
    
    return (tx*tx*n.x + ty*ty*n.y + tz*tz*n.z);
}

float hash31(vec3 p) { 
    float n = sin(dot(p, vec3(7.31, 157.47, 113.93)));    
    return fract(n);
}

// A cheap orthonormal basis vector function
mat3 basis(in vec3 n){
    float a = 1./(1. + n.z);
    float b = -n.x*n.y*a;
    return mat3(1. - n.x*n.x*a, b, n.x, b, 1. - n.y*n.y*a, n.y, -n.x, -n.y, n.z);
}

// Torus function
vec2 tor(vec3 p, float rad, float rad2){
    #ifndef NO_BOLTS
    // Bolts. Standard object repetition around a torus.
    vec3 q = p;
    q.xy = rot2(-3.14159/12.)*q.xy;

    float a = atan(q.y, q.x);
    
    const float oNum = 6.;
    float ia = floor(a/6.2831853*oNum);
    ia = (ia + .5)/oNum*6.2831853; 
    
    q.xy = rot2(ia)*q.xy; 
    q.x -= rad;
    
    q = abs(q);
    float sh = max(max(q.x*.866025 + q.z*.5, q.z) - rad2 - .0125, q.y - .045);
    sh = max(sh, -q.y + .01);
    #endif               
    
    #ifndef NO_BOLTS
    float a2 = atan(p.y, p.x);
    p.xy = vec2(length(p.xy) - rad, p.z);
    float torVal = length(p.xy) - rad2 + cos(a2*180.)*.0002;
    return vec2(torVal, sh);
    #else
    float a = atan(p.y, p.x);
    p.xy = vec2(length(p.xy) - rad, p.z);
    float torVal = length(p.xy) - rad2 + cos(a*180.)*.0002;
    return vec2(torVal, 1e8);
    #endif
}

// Breaking space into a 3D simplex grid
float simplexTruchet(in vec3 p)
{
    vec3 i = floor(p + dot(p, vec3(1./3.)));  p -= i - dot(i, vec3(1./6.)) ;
    vec3 i1 = step(p.yzx, p), i2 = max(i1, 1. - i1.zxy); i1 = min(i1, 1. - i1.zxy);    
    
    vec3 p0 = vec3(0), p1 = i1 - 1./6., p2 = i2 - 1./3., p3 = vec3(.5);

    float rnd = hash31(i*57.31 + i1*41.57 + i2*27.93);
    
    vec3 t0 = p1, t1 = p2, t2 = p3, t3 = p0;
    if (rnd > .66){ t0 = p2, t1 = p3; t2 = p0; t3 = p1; }
    else if (rnd > .33){ t0 = p3, t1 = p0; t2 = p1; t3 = p2; } 

    vec4 v;
    vec3 q, bn; 
 
    float rad = .306186218;
    float rad2 = .025 + pow(iAudio.x, 2.0) * 0.04;

    bn = (t0 - t1)*1.1547005;
    q = basis(bn)*(p - mix(t0, t1, .5));
    v.xy = tor(q, rad, rad2);

    bn = (t2 - t3)*1.1547005;
    q = basis(bn)*(p - mix(t2, t3, .5));
    v.zw = tor(q, rad, rad2);

    v.xy = min(v.xy, v.zw);
    objID = step(v.x, v.y);

    return min(v.x, v.y);
}

// The main distance field function
float map(vec3 p){
    p.xy -= path(p.z).xy;
    float ns = simplexTruchet(p);
    return ns*.9;
}

// Texture bump mapping s proceduralní texturou
vec3 bumpMap(vec3 p, in vec3 n, float bf){
    const vec2 e = vec2(0.001, 0);
    
    mat3 m = mat3( tex3D(p - e.xyy, n), tex3D(p - e.yxy, n), tex3D(p - e.yyx, n));
    
    vec3 g = vec3(0.299, 0.587, 0.114)*m;
    g = (g - dot(tex3D(p, n), vec3(0.299, 0.587, 0.114)) )/e.x; g -= n*dot(n, g);
                      
    return normalize( n + g*bf );
}

// Standard raymarching routine
float trace(vec3 ro, vec3 rd){
    float t = 0., d;
    
    const int MAX_STEPS = 96;
    int steps = int(mix(32.0, 96.0, u_quality));
    for (int i=0; i < MAX_STEPS; i++){
        if (i >= steps) break;
        d = map(ro + rd*t);
        if(abs(d)<.001*(t*.125 + 1.) || t>FAR) break;
        t += d;
    }
    
    return min(t, FAR);
}

// Soft shadows
float softShadow(vec3 ro, vec3 lp, float k, float t){
    if (u_quality < 0.05) return 1.0;
    const int MAX_STEPS = 24;
    int steps = int(mix(8.0, 24.0, u_quality));
    
    vec3 rd = lp-ro;

    float shade = 1.;
    float dist = .001*(t*.125 + 1.);
    float end = max(length(rd), 0.0001);
    rd /= end;

    for (int i=0; i < MAX_STEPS; i++){
        if (i >= steps) break;
        float h = map(ro + rd*dist);
        shade = min(shade, smoothstep(0.0, 1.0, k*h/dist));
        dist += clamp(h, .01, .25); 
        
        if (h<0.0 || dist > end) break; 
    }

    return min(max(shade, 0.) + .1, 1.); 
}

// Normal calculation
vec3 getNormal(vec3 p, inout float edge, inout float crv) { 
    vec2 e = vec2(2./iResolution.y, 0);

	float d1 = map(p + e.xyy), d2 = map(p - e.xyy);
	float d3 = map(p + e.yxy), d4 = map(p - e.yxy);
	float d5 = map(p + e.yyx), d6 = map(p - e.yyx);
	float d = map(p)*2.;

    edge = abs(d1 + d2 - d) + abs(d3 + d4 - d) + abs(d5 + d6 - d);
    edge = smoothstep(0., 1., sqrt(edge/e.x*2.));
    
    e = vec2(.002, 0);
	d1 = map(p + e.xyy); d2 = map(p - e.xyy);
	d3 = map(p + e.yxy); d4 = map(p - e.yxy);
	d5 = map(p + e.yyx); d6 = map(p - e.yyx);
	
    return normalize(vec3(d1 - d2, d3 - d4, d5 - d6));
}

// Ambient occlusion
float calculateAO(in vec3 pos, in vec3 nor)
{
	float sca = 2.0, occ = 0.0;
    for( int i=0; i<5; i++ ){
        float hr = 0.01 + float(i)*0.5/4.0;        
        float dd = map(nor * hr + pos);
        occ += (hr - dd)*sca;
        sca *= 0.7;
    }
    return clamp( 1.0 - occ, 0.0, 1.0 );    
}

// Coloring\texturing the scene objects
vec3 getObjectColor(vec3 p, vec3 n){
    vec3 tx = tex3D(p, n);
    tx = smoothstep(.05, .5, tx);

    if(svObjID>.5) tx *= vec3(1.25, 1., .8) + pow(iAudio.y, 2.0) * vec3(0.0, 0.4, 0.4); // Steel tubes.
    else tx *= vec3(.9, .6, .3); // Bolts.
    
    return tx;
}

// Simple environment mapping
vec3 eMap(vec3 rd, vec3 sn){
    vec3 tx = getObjectColor(rd, sn);
    return smoothstep(.15, .75, tx);
}

// Lighting and coloring
vec3 doColor(in vec3 ro, in vec3 rd, in vec3 lp, float t){
    vec3 sceneCol = vec3(0);
    
    if(t<FAR){
   		 vec3 sp = ro + rd*t;
        
        float edge = 0., crv = 1.;

        vec3 sn = getNormal(sp, edge, crv);
        vec3 svSn = sn;

        sn = bumpMap(sp*2., sn, .01);
        svSn = mix(sn, svSn, .75); 

        float sh = softShadow(sp + sn*.00125, lp, 16., t);
        float ao = calculateAO(sp, sn);
        sh = (sh + ao*.3)*ao;
    
        vec3 ld = lp - sp;
        float lDist = max(length(ld), 0.001);
        ld /= lDist;

        float atten = 2./(1. + lDist*0.125 + lDist*lDist*0.25);

        float diff = max(dot(sn, ld), 0.);
        diff = (pow(diff, 2.)*.66 + pow(diff, 4.)*.34)*2.;
        float spec = pow(max( dot( reflect(-ld, sn), -rd ), 0.0 ), 32.0);
        float fres = clamp(1. + dot(rd, sn), 0., 1.);

        vec3 objCol = getObjectColor(sp*2., sn);

        sceneCol = objCol*(diff + .5*ao + fres*fres*.25) + vec3(1, .97, .92)*spec*2.;
        sceneCol += eMap(reflect(rd, svSn)/2., svSn)*.75;
        sceneCol *= 1. - edge*.9;
    	sceneCol *= sh;  
        sceneCol *= atten;
    }
    
    vec3 fogCol = vec3(0);
    sceneCol = mix(sceneCol, fogCol, smoothstep(0., .75, t/FAR));
  
    return sceneCol;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    
    // Screen coordinates.
	vec2 uv = (fragCoord - iResolution.xy*.5) / iResolution.y;
    
	// Camera Setup.
    float time = iTime * (0.5 + pow(iAudio.w, 1.5) * 0.4);
	vec3 ro = vec3(0, 0, time);
	vec3 lk = ro + vec3(0, 0, .25);

    vec3 lp = ro + vec3(0, 1, .375);
    
    ro.xy += path(ro.z);
	lk.xy += path(lk.z);
	lp.xy += path(lp.z);

    float FOV = 3.14159/2.;
    vec3 forward = normalize(lk - ro);
    vec3 right = normalize(vec3(forward.z, 0., -forward.x )); 
    vec3 up = cross(forward, right);

    vec3 rd = normalize(forward + (uv.x*right + uv.y*up)*FOV);
    rd = normalize(vec3(rd.xy, rd.z - length(rd.xy)*.25 ));

    float t = trace(ro, rd);
    svObjID = objID;
    
    vec3 sceneColor = doColor(ro, rd, lp, t);
    
    // Postprocessing
    uv = fragCoord/iResolution.xy;
    sceneColor *= pow(16.*uv.x*uv.y*(1. - uv.x)*(1. - uv.y) , .125)*.5 + .5;

	fragColor = vec4(sqrt(clamp(sceneColor, 0., 1.)), 1);
}
`;
export default source;