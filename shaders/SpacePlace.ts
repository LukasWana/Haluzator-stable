const source = `
// SpaceIsThePlace by mojovideotech
// based on: shadertoy.com/XlfGRj by Kali
// Adapted for Shader Sequencer

#define iterations 7
#define volsteps 7
#define pi 3.141592653589793

float field(in vec3 p, float time) {
	float strength = 7. + .03 * log(1.e-6 + fract(sin(time) * 4373.11));
	float accum = 0.;
	float prev = 0.;
	float tw = 0.;
	for (int i = 0; i < 7; ++i) {
		float mag = dot(p, p);
		p = abs(p) / mag + vec3(-.5, -.4, -1.5);
		float w = exp(-float(i) / 7.);
		accum += w * exp(-strength * pow(abs(mag - prev), 2.3));
		tw += w;
		prev = mag;
	}
	return max(0., 5. * accum / tw - .7);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Audio-reactive parameters
    bool nebula = true;
    float brightness = 0.25 + pow(iAudio.y, 2.0) * 0.25;
    float zoom = 2.5 + iAudio.w * 10.0;
    float saturation = 0.5 + iAudio.y * 0.5;
    float distfading = 0.25 + iAudio.y * 0.2;
    float depth = 0.25 + iAudio.w * 0.25;
    float density = 0.75 + pow(iAudio.x, 2.0) * 0.5;
    float morph = 0.89 - pow(iAudio.x, 1.5) * 0.3;
    float rate = 0.005 + iAudio.w * 0.04;

	vec2 uv = fragCoord.xy/iResolution.xy - 0.5;
  	uv.y *= iResolution.y/iResolution.x;
	
    // Background nebula field
	vec3 p_nebula = vec3(uv / 4., 0) + vec3(1., -1.3, 0.);
	p_nebula.x += 0.25 * 5.0 * cos(0.01 * iTime) + 0.001 * iTime;
	p_nebula.y += 0.25 * 5.0 * sin(0.01 * iTime) + 0.001 * iTime;
	p_nebula.z += 0.003 * iTime;
    float a1_nebula = iTime * 0.03;
    mat2 rot1_nebula = mat2(cos(a1_nebula),sin(a1_nebula),-sin(a1_nebula),cos(a1_nebula));
    float a2_nebula = iTime * 0.02;
	mat2 rot2_nebula = mat2(cos(a2_nebula),sin(a2_nebula),-sin(a2_nebula),cos(a2_nebula));
	p_nebula.xz *= rot1_nebula;
	p_nebula.xy *= rot1_nebula;
	p_nebula.yz *= -rot2_nebula;
	p_nebula = abs(vec3(density) - mod(p_nebula, vec3(density*2.)));
	float t_nebula = field(p_nebula, iTime);

	vec3 dir = vec3(uv*zoom,1.);
	vec3 from = vec3(0.0, 0.0,0.0);
	
    // Camera rotation
	float a1 = iTime * 0.1;
	mat2 rot1 = mat2(cos(a1),sin(a1),-sin(a1),cos(a1));
	float a2 = iTime * 0.05;
	mat2 rot2 = mat2(cos(a2),sin(a2),-sin(a2),cos(a2));
	dir.xz *= rot1;
	dir.xy *= rot2;
	from.xz *= rot1;
	from.xy *= rot2;

    // Camera movement
	float speed = rate * cos(iTime*0.02 + pi/4.0);
	float zooom = iTime * speed * 200.0;
	from += normalize(dir) * zooom;
	
	float sampleShift = mod( zooom, depth );
	float zoffset = -sampleShift;
	sampleShift /= depth; 
	
	float s = 0.1;
	vec3 v = vec3(0.);
	for (int r = 0; r < volsteps; r++) {
		vec3 p = from + (s + zoffset) * dir;
		p = abs(vec3(density) - mod(p,vec3(density*2.))); 
		float pa, a = pa = 0.;
		for (int i = 0; i < iterations; i++) {
			p = abs(p) / dot(p,p) - morph; 
			float D = abs(length(p)-pa); 
			a += i > 7 ? min( 12., D) : D;
			pa = length(p);
		}
		a *= a * a;
		float s1 = s + zoffset;
		float fade = pow(distfading, max(0.,float(r)-sampleShift));
		float dm = max(0.,2.0 - a*a*.001);
		if (r > 3) fade *= 1. - dm; 
		if (r == 0) fade *= 1. - sampleShift;
		if (r == volsteps - 1) fade *= sampleShift;
		v += vec3(s1,s1*s1,s1*s1*s1*s1) * a * brightness * fade;
		s += depth;
	}
	
	v = mix(vec3(length(v)), v, saturation); 
	
	if (nebula) {	
        float v2 = (1. - exp((abs(uv.x) - 1.) * 6.)) * (1. - exp((abs(uv.y) - 1.) * 6.));
		vec4 forCol = vec4(v * .01, 1.);
		vec4 backCol = mix(.4, 1., v2) * vec4(1.8 * t_nebula * t_nebula * t_nebula, 1.4 * t_nebula * t_nebula, t_nebula, 1.0);
		backCol *= (0.2 + pow(iAudio.z, 2.0) * 0.3);
		backCol.b *= 1.0;
		backCol.r = mix(backCol.r, backCol.b, 0.2);
		forCol.g *= max((backCol.r * 4.0), 1.0);
		forCol.r += backCol.r * 0.05;
		forCol.b += 0.5*mix(backCol.g, backCol.b, 0.8);
		fragColor = forCol;
	}
	else {	
		fragColor = vec4(vec3(v*.01), 1.);
	}
}
`;
export default source;