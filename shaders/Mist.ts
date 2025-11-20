
const source = `
// Original by lsdlive, part of "Mist" by Ohno
// Adapted for Shader Sequencer: timeline removed, made continuous and audio-reactive.

float g = 0.; // glow

float random(vec2 uv) {
	return fract(sin(dot(uv, vec2(12.2544, 35.1571))) * 5418.548416);
}

mat2 r2d(float a) {
	float c = cos(a), s = sin(a);
	return mat2(c, s, -s, c);
}

vec3 re(vec3 p, float d) {
	return mod(p - d * .5, d) - d * .5;
}

void amod2(inout vec2 p, float d) {
	float a = re(vec3(atan(p.x, p.y)), d).x; 
	p = vec2(cos(a), sin(a)) * length(p);
}

void mo(inout vec2 p, vec2 d) {
	p = abs(p) - d;
	if (p.y > p.x)p = p.yx;
}

vec3 get_cam(vec3 ro, vec3 ta, vec2 uv) {
	vec3 fwd = normalize(ta - ro);
	vec3 right = normalize(cross(fwd, vec3(0, 1, 0)));
	return normalize(fwd + right * uv.x + cross(right, fwd) * uv.y);
}

float cube(vec3 p, vec3 b) {
	b = abs(p) - b;
	return min(max(b.x, max(b.y, b.z)), 0.) + length(max(b, 0.));
}

float sc(vec3 p, float d) {
	p = abs(p);
	p = max(p, p.yzx);
	return min(p.x, min(p.y, p.z)) - d;
}

float prim(vec3 p) {
	p.xy *= r2d(3.14 * .5 + p.z * .1);
	amod2(p.xy, 6.28 / 3.);
	p.x = abs(p.x) - 9.;
	p.xy *= r2d(p.z * (0.2 + iAudio.y * 0.3)); // Mids affect rotation
	amod2(p.xy, 6.28 / 3.);
	mo(p.xy, vec2(2.));
	p.x = abs(p.x) - .6;
    // Bass affects cylinder thickness
	return length(p.xy) - (0.2 + iAudio.x * 0.1);
}

float de(vec3 p) {
	p.xy *= r2d(iTime * (0.05 + iAudio.y * 0.1)); // Mids affect main rotation
	p.xy *= r2d(p.z * .05);
	amod2(p.xy, 6.28 / 5.);
	p.x -= 21.;

	vec3 q = p;

	p.xy *= r2d(p.z * .1);
	amod2(p.xy, 6.28 / 3.);
	p.x = abs(p.x) - 5.0;
	p.xy *= r2d(p.z * .2);
	p.z = re(p.zzz, 3.).x;
	p.x = abs(p.x);
	amod2(p.xy, 6.28 / 3.);
	float sc1 = sc(p, 1.);

	amod2(p.xz, 6.28 / 8.);
	mo(p.xz, vec2(.1));
	p.x = abs(p.x) - 1.;

	float d = cube(p, vec3(.2, 10, 1));
	d = max(d, -sc1) - 2.;

	g += .006 / (.01 + d * d);
	d = min(d, prim(q));
	g += .004 / (.013 + d * d);

	return d;
}


vec3 raymarch_lsdlive(vec3 ro, vec3 rd, vec2 uv) {
	vec3 p;
	float t = 0., ri = 0.0;
	float dither = random(uv);
    g = 0.0; // Reset glow per pixel

    // FIX: Replaced non-constant float loop with a standard integer loop for WebGL compatibility.
    const int MAX_STEPS = 50;
	for (int i = 0; i < MAX_STEPS; i++) {
		ri = float(i) / float(MAX_STEPS);
		p = ro + rd * t;
		float d = de(p);
		d *= 1. + dither * .05;
		d = max(abs(d), .002);
		t += d * .5;
	}

	vec3 c = mix(vec3(.9, .8, .6), vec3(.1, .1, .2), length(uv) + ri);
	c.r += sin(p.z * .1) * .2;
    // Treble affects glow
	c += g * (0.035 + iAudio.z * 0.05);

	return c;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
	vec2 q = fragCoord.xy / iResolution.xy;
    vec2 uv = (q - .5) * iResolution.xx / iResolution.yx;
    
    // Overall volume affects travel speed
    float travel_speed = 8.0 * (0.5 + iAudio.w * 1.5);
    float z_pos = iTime * travel_speed;

	vec3 lsd_ro = vec3(0, 0, -4. + z_pos);
	vec3 lsd_target = vec3(0., 0., z_pos);
	vec3 lsd_cam = get_cam(lsd_ro, lsd_target, uv);

	vec3 col = raymarch_lsdlive(lsd_ro, lsd_cam, uv);

	// vignetting
	col *= 0.5 + 0.5*pow(16.0*q.x*q.y*(1.0 - q.x)*(1.0 - q.y), 0.25);

	fragColor = vec4(col, 1.);
}
`;
export default source;