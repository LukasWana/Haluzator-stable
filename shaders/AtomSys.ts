const source = `
/*
I learned shader coding from the below links:
The Art of Code [YouTube: https://www.youtube.com/@TheArtofCodeIsCool]
NuSan FX [YouTube: https://www.youtube.com/@NuSan_fx]
Evvvvil [Twitch: https://www.twitch.tv/evvvvil_]

I teach a shader course on YouTube: https://www.youtube.com/@cool3dcode

Visuals for AtomSys shader improved for better detail and contrast.
*/

#define DST 90.0
#define SRF 0.001
#define e   vec2(0.0001, -0.0001)
#define PI 3.14159265359
#define RT(X) mat2(cos(X), sin(X), -sin(X), cos(X))

float t = 0.0;
float g = 0.0;

// --- SDF Primitives ---
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Smooth union to blend spheres together organically
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// --- Noise function for background ---
float noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0;
    return mix(mix( fract(sin(n+0.0)*43758.5453), fract(sin(n+1.0)*43758.5453),f.x),
               mix( fract(sin(n+57.0)*43758.5453), fract(sin(n+58.0)*43758.5453),f.x),f.y);
}

// The main distance function - creates a system of spheres
vec2 map(vec3 p) {
    // Animate scene rotation
    p.xz *= RT(t * 0.1);
    p.yz *= RT(t * 0.07);

    float final_dist = DST;
    
    // 1. Main central sphere, pulsating with overall volume
    float core_radius = 1.5 + iAudio.w * 0.8;
    float core_sphere = sdSphere(p, core_radius);
    final_dist = core_sphere;

    // 2. A web of smaller spheres orbiting the center
    float orbit_radius = 4.0 + sin(t) * 0.5;
    const float num_orbiters = 8.0;

    for (float i = 0.0; i < num_orbiters; i++) {
        float angle = (i / num_orbiters) * 2.0 * PI + t * 0.3;
        
        // Orbiter position spirals around the core
        vec3 orbiter_pos = vec3(cos(angle) * orbit_radius, sin(i * 1.3 + t) * 2.0, sin(angle) * orbit_radius);
        
        // Orbiter size pulses with bass
        float orbiter_radius = 0.5 + sin(i * 2.0 + t * 2.0) * 0.2 + iAudio.x * 0.3;
        float orbiter_sphere = sdSphere(p - orbiter_pos, orbiter_radius);
        
        // Blend the spheres together smoothly
        final_dist = smin(final_dist, orbiter_sphere, 0.8);
    }

    // 3. Add a fractal layer of tiny bubbles for detail
    vec3 p_fractal = p;
    float scale = 1.0;
    for(int j=0; j<3; j++) {
        p_fractal = abs(p_fractal) - 1.0;
        p_fractal *= 1.8;
        scale *= 1.8;
        p_fractal.yz *= RT(t * 0.2);
    }
    
    // Bubble size pulses with treble
    float bubble_radius = 0.15 + iAudio.z * 0.1;
    float fractal_bubbles = (sdSphere(p_fractal, bubble_radius)) / scale;
    final_dist = smin(final_dist, fractal_bubbles, 0.5);

    // Reworked glow calculation for a more controlled effect
    g += 0.1 * smoothstep(0.1, 0.0, abs(fractal_bubbles));
    g += 0.05 * smoothstep(0.2, 0.0, abs(final_dist));


    // Using a single material ID for simplicity
    return vec2(final_dist, 0.0);
}


// --- Raymarching and Shading ---

vec3 nml(vec3 sp) {
	return normalize(e.xyy * map(sp + e.xyy).x + 
		             e.yyx * map(sp + e.yyx).x + 
		             e.yxy * map(sp + e.yxy).x + 
		             e.xxx * map(sp + e.xxx).x); 
}

vec2 mrch(vec3 ro, vec3 rd) {
	float d0 = 0.0;
	float id = 0.0;
    const int MAX_ITR = 100;
    int ITR = int(mix(30.0, 100.0, u_quality));
	for (int i = 0; i < MAX_ITR; i++) {
        if (i >= ITR) break;
		vec3 sp = ro + rd * d0;
		vec2 ds = map(sp);
		if (abs(ds.x) < SRF || d0 > DST) break;
		d0 += ds.x;
		id = ds.y;
	}
	if (d0 > DST) d0 = 0.0;
	return vec2(d0, id);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    // Audio: Overall volume affects time
	t = iTime * (0.8 + iAudio.w * 0.5);
	
	vec3 ro = vec3(0, 0, -15); // Closer camera for a more immersive view
	vec3 w  = normalize(vec3(0) - ro);
	vec3 u  = normalize(cross(w, vec3(0, 1, 0)));
	vec3 v  = normalize(cross(u, w));
	vec3 rd = mat3(u, v, w) * normalize(vec3(uv, 1.2));
	
    // Light is positioned more to the side to create more defined shadows
	vec3 lp = vec3(10.0, 8.0, -10.0); 
	
	vec2 ds = mrch(ro, rd);
	float d0 = ds.x;
	
    // Darker, more saturated base color for better contrast.
    vec3 alb = vec3(0.1, 0.2, 0.5); 
    // Mids (y) shift the base color towards purple/cyan
    alb.r += iAudio.y * 0.2; 
    alb.b += iAudio.y * 0.2;

    // Dark ambient light for shadows that aren't pure black
	vec3 amb = vec3(0.01, 0.02, 0.03); 
    // Faint nebula-like background
	vec3 bgc = vec3(0.005, 0.01, 0.02) * (0.5 + 0.5 * noise(uv * 3.0 + t * 0.1));
	
	vec3 clr = vec3(0);
	
	if (d0 > 0.0) {
		vec3 sp = ro + rd * d0;
		vec3 n = nml(sp);
		vec3 ld = normalize(lp - sp);
		float dif = max(0.0, dot(n, ld));
		float fre = pow(clamp(1.0 + dot(rd, n), 0.0, 1.0), 3.0);
		float ao = clamp(map(sp + 0.5 * n).x / 0.5, 0.0, 1.0);
        // Tighter and less intense specular highlights
		float spc = pow(max(dot(reflect(-ld, n), -rd), 0.0), 60.0);
		
        // Full lighting calculation
        vec3 diffuse_color = dif * alb * ao;
        vec3 specular_color = spc * vec3(1.0, 1.0, 1.2) * 1.5; // Cooler highlight color
        vec3 fresnel_color = fre * vec3(0.3, 0.5, 0.8) * (1.0 + iAudio.y); // Rim light
        
		clr = amb + diffuse_color + specular_color + fresnel_color;
		
        // Mix with background using fog
		clr = mix(clr, bgc, 1.0 - exp(-0.0002 * pow(d0, 2.5)));
	
    } else {
		clr = bgc;
	}
    
    // Controlled glow, boosted by bass, in a vibrant cyan color
	clr += g * vec3(0.1, 0.7, 0.8) * (0.5 + iAudio.x * 1.5);
    
    // Reinhard tonemapping to prevent blown-out highlights
    clr = clr / (clr + vec3(1.0));

    // Final gamma correction
	fragColor = vec4(pow(clr, vec3(0.4545)), 1.0);
}
`;
export default source;