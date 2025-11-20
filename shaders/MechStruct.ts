// Mechanical Structure by an anonymous author
// Adapted for Shader Sequencer with audio reactivity and GLSL fixes.
const source = `
// Mechanical Structure by an anonymous author
// Adapted for Shader Sequencer with audio reactivity and GLSL fixes.

#define NSP 4
#define DST 220.0
#define SRF 0.001
#define e   vec2(0.0001, -0.0001)
#define PI 3.14159265359
#define RT(X) mat2(cos(X), sin(X), -sin(X), cos(X))

float t = 0.0;
float g = 0.0;

// Forward declare map function so nml can use it.
vec2 map(vec3 sp);

float box(vec3 sp, vec3 d)
{
	sp = abs(sp) - d;
	return max(max(sp.x, sp.y), sp.z);
}

float prim1(vec3 sp)
{
	
	float sdf = box(abs(sp) - vec3(0.25, 0, 0), vec3(0.12, 5, 0.2));
	sdf = min(sdf, box(abs(sp) - vec3(0, 2.5, 0), vec3(0.25, 0.1, 0.1)));
	return sdf;
	
}

float prim2(vec3 sp)
{
	float s = 1.0;
	float sdf = DST;
	vec3 sp1 = sp;
	sp.xz *= RT(sp.y * ((0.5 + 0.5 * sin(t))) * 0.1);
	
	sp = abs(sp) - vec3(0.01, 0.5, 2.5);
	sdf = min(sdf, prim1(sp) / s);
	sp.xy *= RT(6.7);
	s *= 1.1;
	sp *= s;
	
	sp1 = abs(sp1) - vec3(1.0, 1.0, 0.0);
	sp1.yx *= RT(2.0 + (0.5 + 0.5 * cos(t)) * 0.2);	
	
	sdf = max(sdf, -box(sp1, vec3(1.0, 0.5, 2.0)));
	return sdf;
}

vec2 map(vec3 sp)
{
    // FIX: WebGL 1 requires local arrays to be constant-indexed.
    // Unrolling the array operations.
	float dst0, dst1, dst2, dst3;
	float id = 0.0;
	
	for (int i = 0; i < 3; i++)
	{
		sp = abs(sp) - vec3(0.5, 0.5, 0.5);
		sp.xy *= RT(4.0);
        // Audio: Mids affect rotation
		sp.zy *= RT(0.5 + (0.5 + 0.5 * cos(t)) * (0.2 + iAudio.y * 0.3));
		
	}
    // Audio: Treble affect rotation
    sp.xz *= RT(0.0 + (0.5 + 0.5 * cos(t * 0.6)) * (1.4 + iAudio.z * 1.5));
	dst3 = length(sp.xy) - 0.1;

	vec3 sp3 = sp;
	sp.x = abs(sp.x) - 16.0;
	sp.x = abs(sp.x) - 8.0;
	sp.xz *= RT(sp.y * 0.05);
	sp.y = mod(sp.y + t * 6.0, 10.0) - 5.0;
	
	sp = abs(sp) - vec3(3.0, 0.0, 0.0);
	dst0 = prim2(abs(sp) - vec3(clamp((0.5 + 0.5 * sin(sp.y + t)) * 3.0, 0.0, 1.0), 0.0, 0.0));
	
	vec3 sp1 = sp;
	vec3 sp2 = sp;
    
	for (int i = 0; i < 2; i++)
	{
		sp = abs(sp) - vec3(1.0, 0.0, 1.0);
		sp.xy *= RT(2.0);
	}
	
	dst1 = box(sp, vec3(0.2, 5.0, 0.2));
	sp1 = abs(sp1) - vec3(3.0, 0.0, 3.0);
	dst2 = length(sp1) - 0.01;
    // Audio: Bass affects glow intensity
	g += pow(0.2 / max(dst2, 0.0001), 2.0) * (1.0 + iAudio.x * 3.0);	

	sp2 = abs(sp2) - vec3(0.5, 0, 0.5);
	sp2.xy *= RT(3.1);
	sp2.xz *= RT(4.0);

    // FIX: Unroll the min() loop for material ID selection
    float final_dst = dst0;
    if (dst1 < final_dst) { final_dst = dst1; id = 1.0; }
    if (dst2 < final_dst) { final_dst = dst2; id = 2.0; }
    if (dst3 < final_dst) { final_dst = dst3; id = 3.0; }

	return vec2(final_dst * 0.8, id);
}

vec3 nml(vec3 sp)
{
	
	return normalize(e.xyy * map(sp + e.xyy).x + 
		             e.yyx * map(sp + e.yyx).x + 
		             e.yxy * map(sp + e.yxy).x + 
		             e.xxx * map(sp + e.xxx).x); 
	
}

vec2 mrch(vec3 ro, vec3 rd)
{
	float d0 = 0.0;
	float id = 0.0;
    const int MAX_ITR = 130;
	for (int i = 0; i < MAX_ITR; i++)
	{
		vec3 sp = ro + rd * d0;
		vec2 ds = map(sp);
		if (abs(ds.x) < SRF || d0 > DST) break;
		d0 += ds.x;
		id = ds.y;
		
		
	}
	if (d0 > DST) d0 = 0.0;
	return vec2(d0, id);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    // Audio: Overall volume affects time
	t = mod(iTime * (1.0 + iAudio.w * 0.5), PI * 12.0);
	
	vec3 ro = vec3(0, 24, -40);
	vec3 w  = normalize(vec3(0.0) - ro);
	vec3 u  = normalize(cross(w, vec3(0, 1, 0)));
	vec3 v  = normalize(cross(u, w));
	vec3 rd = mat3(u, v, w) * normalize(vec3(uv, 1.2));
	
	vec3 lp = vec3(0, 0.2, -3.0);
	
	vec2 ds = mrch(ro, rd);
	float d0 = ds.x;
	int id = int(ds.y);
	
    // FIX: Unrolled array access for GLSL ES 1.00
    vec3 alb;
    if (id == 0)      alb = vec3(1.0, 0.5 + iAudio.y * 0.2, 0.4);
    else if (id == 1) alb = vec3(0.0, 0.01, 0.01);
    else if (id == 2) alb = vec3(1.0);
    else if (id == 3) alb = vec3(1.0);
    else              alb = vec3(0.0); // Default case

	vec3 amb = vec3(0.0001);
	vec3 bgc = vec3(0.5, 0.6, 0.8) * 0.001 * (1.0 + iAudio.w);
	
	vec3 clr = vec3(0.0);
	
	if (d0 > 0.0)
	{
		vec3 sp = ro + rd * d0;
		vec3 n = nml(sp);
		vec3 ld = normalize(lp - sp);
		float dif = max(0.0, dot(n, ld));
		float fre = clamp(1.0 + dot(rd, n), 0.0, 1.0);
		float ao = clamp(map(sp + 0.5 * n).x / 0.5, 0.0, 1.0);
		float spc = pow(max(dot(reflect(-ld, n), -rd), 0.0), 80.0);
		
		clr = amb + (amb + dif) * alb * ao + spc;
		clr = mix(clr, bgc, min(0.1, fre));
		clr = mix(clr, bgc, 1.0 - exp(-0.000001 * pow(d0, 3.0)));
	
    } else {
		clr = bgc;
	}
	clr += g * vec3(0.001, 0.1, 0.1) * (1.0 + iAudio.x * 1.5);
	fragColor = vec4(pow(clr, vec3(0.4545)), 1.0);
}
`;
export default source;