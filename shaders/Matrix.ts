const source = `
// InnerDimensionalMatrix  by mojovideotech
// based on : The Universe Within - by Martijn Steinrucken
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0

// Adapted for Shader Sequencer

// Hardcoded values from original shader's parameters
const float seed1 = 155.0;
const float seed2 = 649.0;
const float scale = 1.0;
const bool mirror = false;
const bool color = true;
const float cycle = 1.0;


#define S(a, b, t) smoothstep(a, b, t)

float N1(float n) {
	return fract(sin(n) * 43758.5453123);
}

float N11(float p) {
	float fl = floor(p);
	float fc = fract(p);
	return mix(N1(fl), N1(fl + 1.0), fc);
}

float N21(vec2 p) { return fract(sin(p.x * floor(seed1) + p.y * floor(seed2)) * floor(seed2+seed1)); }

vec2 N22(vec2 p) { return vec2(N21(p), N21(p + floor(seed2))); }

float L(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p-a, ba = b-a;
	float t = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
	float d = length(pa - ba * t);
	float m = S(0.02, 0.0, d);
	d = length(a-b);
	float f = S(1.0, 0.8, d);
	m *= f;
	m += m*S(0.05, 0.06, abs(d - 0.5)) * 2.0;
	return m;
}

vec2 GetPos(vec2 p, vec2 o, float rate, float line, float time) {
	p += o;
	vec2 n = N22(p)*time*rate;
	p = sin(n) * line;
	return o+p;
}

float G(vec2 uv, float rate, float line, float flash, float time) {
	vec2 id = floor(uv);
	uv = fract(uv) - 0.5;
	vec2 g = GetPos(id, vec2(0), rate, line, time);
	float m = 0.0;
	for(float y=-1.0; y<=1.0; y++) {
		for(float x=-1.0; x<=1.0; x++) {
			vec2 offs = vec2(x, y);
			vec2 p = GetPos(id, offs, rate, line, time);
			m+=L(uv, g, p);
			vec2 a = p-uv;
			float f = 0.003/dot(a, a);
			f *= pow( sin(N21(id+offs) * 6.2831 + (flash*time)) * 0.4 + 0.6, flash);
			m += f;
		}
	}
	m += L(uv, GetPos(id, vec2(-1, 0), rate, line, time), GetPos(id, vec2(0, -1), rate, line, time));
	m += L(uv, GetPos(id, vec2(0, -1), rate, line, time), GetPos(id, vec2(1, 0), rate, line, time));
	m += L(uv, GetPos(id, vec2(1, 0), rate, line, time), GetPos(id, vec2(0, 1), rate, line, time));
	m += L(uv, GetPos(id, vec2(0, 1), rate, line, time), GetPos(id, vec2(-1, 0), rate, line, time));
	return m;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Connect parameters to app uniforms
    float rate = 1.0 + pow(iAudio.w, 1.5) * 2.0;
    float zoom = 0.175 + iAudio.w * 0.5;
    float line = 0.367 + pow(iAudio.x, 2.0) * 0.1;
    float flash = 7.5 + iAudio.y * 2.5;

	vec2 uv = (2.25 - scale) * ( fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
	if (mirror) { if(uv.x<0.0) uv.x = abs(uv.x); }
	float m = 0.0;
	vec3 col;
	for(float i=0.0; i<1.0; i+=0.2) {
		float z = fract(i+iTime*zoom);
		float s = mix(10.0, 0.5, z);
		float f = S(0.0, 0.4, z) * S(1.0, 0.8, z);
		m += G(uv * s + (N11(i)*100.0) * i, rate, line, flash, iTime) * f;
	}
	if (color) { col = 0.5 + sin(vec3(1.0, 0.5, 0.75)*iTime*cycle) * 0.5; }
	else col = vec3(1.0);
	col *= m;
	fragColor = vec4( col, 1.0 );
}
`;
export default source;