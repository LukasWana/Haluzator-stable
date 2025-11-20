const source = `
// A new shader provided by the user, adapted for Shader Sequencer.
// Combines volumetric rendering, raymarching, and 2D patterns.

// --- UTILITY & NOISE FUNCTIONS ---

#define iterations 11
#define volsteps 20
#define stepsize 0.1
#define zoom   0.800
#define tile   0.850
#define brightness 0.0015
#define distfading 0.730
const float tau = 6.2831853;

const mat2 m2 = mat2(0.80, 0.60, -0.60, 0.80);

mat2 R(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

vec3 palette(float t, float audio_y) {
    vec3 a = vec3(0.5, 0.5, 1.0);
    vec3 b = vec3(0.5, 0.5, 1.0);
    vec3 c = vec3(0.5, 0.5, 1.0);
    vec3 d = vec3(0.2, 0.4, 0.6);
    return a + b*cos(6.28318*(c*t + d + audio_y * 0.1));
}

float happy_star(vec2 uv, float anim) {
    uv = abs(uv);
    vec2 pos = min(uv.xy/uv.yx, anim);
    float p = (2.0 - pos.x - pos.y);
    return (2.0+p*(p*p-1.5)) / (uv.x+uv.y + 1e-6);
}

float hash(in vec2 co) {
	return fract(sin(dot(co.xy ,vec2(12.9898,58.233))) * 13758.5453);
}

float noise(vec2 p) {
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	float res = mix(
		mix(hash(ip),hash(ip+vec2(1.0,0.0)),u.x),
		mix(hash(ip+vec2(0.0,1.0)),hash(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}

float fbm_2d( in vec2 x ) {
	float f = 2.0;
	float a = 1.1;
	float t = 0.0;
	for( int i=0; i<5; i++ ) { // Reduced from 10 for performance
		t += a*noise(x);
		a *= 0.5; // Corrected falloff
        x = f*m2*x;
	}
	return smoothstep(0.,1.8,t);
}

float pattern(in vec2 p, out vec2 q, out vec2 r, float time) {
    q = vec2(fbm_2d(p), fbm_2d(p+vec2(1.5, 4.0)));
    r = vec2(fbm_2d(p + time + 4.0*q + vec2(1.7, 3.0)), fbm_2d(p + time + 5.0*q + vec2(10.5, 7.8)));
    return fbm_2d(p+4.*r);
}

// --- RAYMARCHING ---

float MapWorld(vec3 point) {
    float displacement = sin(5.0 * point.x) * cos(5.0 * point.y) * sin(5.0 * point.z - iTime) * 0.05;
    return distance(point, vec3(0.0)) - 1.0 + displacement;
}

vec3 CalculateNormal(vec3 point) {
    vec3 SMALL_STEP = vec3(1e-3, 0.0, 0.0);
    float gradient_x = MapWorld(point + SMALL_STEP) - MapWorld(point - SMALL_STEP);
    float gradient_y = MapWorld(point + SMALL_STEP.yxy) - MapWorld(point - SMALL_STEP.yxy);
    float gradient_z = MapWorld(point + SMALL_STEP.yyx) - MapWorld(point - SMALL_STEP.yyx);
    return normalize(vec3(gradient_x, gradient_y, gradient_z));
}

vec3 getDomainWrapColor(vec2 uv, float time) {
    vec2 q, r;
    float density = pattern(uv*10.0, q, r, time/10.0);
    vec3 color = mix(vec3(0), vec3(0.451, 1.0, 0.0), density);
    color = mix(color, vec3(1.0, 1.0, 1.0), r.y);
    return color;
}

vec3 RayMarch(vec3 ro, vec3 rd) {
    float total_distance_traveled = 0.0;
    const int STEPS = 32;
    for(int i = 0; i <STEPS; ++i) {
        vec3 current_position = ro + total_distance_traveled * rd;
        float distance_to_closest = MapWorld(current_position);
        if(distance_to_closest < 1e-3) {
            vec3 normal = CalculateNormal(current_position);
            vec2 color_coord = normal.xy + vec2(iTime/10.0, 0.0);
            vec3 diffuse_color = getDomainWrapColor(color_coord, iTime);
            vec3 light_position = vec3(20.0, -50.0, 50.0);
            vec3 direction_to_light = normalize(current_position - light_position);
            float diffuse_intensity = max(0.0, dot(normal, direction_to_light));
            vec3 ambient = vec3(0.05);
            return diffuse_intensity * diffuse_color + ambient;
        }
        if(total_distance_traveled > 10.0) break;
        total_distance_traveled += distance_to_closest;
    }
    return vec3(0.2);
}

// --- MAIN IMAGE ---

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // --- Setup ---
	vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec3 final_color = vec3(0.0);

    // --- Audio Reactivity ---
    float time_w = iTime * (1.0 + iAudio.w * 2.0);
    float formuparam = 0.53 + iAudio.x * 0.1;
    float saturation = 0.85 + iAudio.y * 0.15;
    float darkmatter = 0.3 - iAudio.z * 0.15;

	// --- Volumetric Rendering (base layer) ---
	vec3 dir = vec3(uv * zoom, 1.0);
	float time_vol = time_w * 0.01 + 0.25;

	float a1 = 0.5 + time_w * 0.05;
	float a2 = 0.8 + time_w * 0.025;
	mat2 rot1 = R(a1);
	mat2 rot2 = R(a2);
	dir.xz *= rot1;
	dir.xy *= rot2;
    
    vec3 ro_vol = vec3(1.,.5,0.5);
    // Offset start by raymarched sphere color
    ro_vol += RayMarch(vec3(0.0, 0.0, -2.0), normalize(vec3(uv,1.0)));
	ro_vol += vec3(time_vol*2., time_vol, -2.);
	ro_vol.xz *= rot1;
	ro_vol.xy *= rot2;
    
	float s = 0.1;
    float fade = 1.0;
	vec3 v = vec3(0.0);
	for (int r=0; r < volsteps; r++) {
		vec3 p = ro_vol + s * dir * 0.5;
		p = abs(vec3(tile) - mod(p, vec3(tile*2.0)));
		float pa=0.0, a=0.0;
		for (int i=0; i < iterations; i++) {
			p = abs(p) / (dot(p,p) + 1e-6) - formuparam;
            // Slower internal rotation
            p.xy *= R(iTime*0.003);
			a += abs(length(p) - pa);
			pa = length(p);
		}
		float dm = max(0.0, darkmatter - a*a*0.001);
		a *= a*a;
		if (r>6) fade *= 1.0 - dm;
		v += fade;
		v += vec3(s,s*s,s*s*s*s) * a * brightness * fade;
		fade *= distfading;
		s += stepsize;
	}
	v = mix(vec3(length(v)), v, saturation);
    final_color += v * 0.01;

    // --- 2D Star (overlay) ---
    float anim_star = sin(time_w * 6.0) * 0.1 + 1.0;
    final_color += happy_star(uv, anim_star) * palette(length(uv)*0.5 + time_w*0.1, iAudio.y) * 0.15;

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;