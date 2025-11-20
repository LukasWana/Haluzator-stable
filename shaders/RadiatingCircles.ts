const source = `
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Based on GLSL Sandbox shader e#36696.0
    // Parameters are made audio-reactive.
    float v1 = 0.5 + iAudio.x * 0.4;         // Affects radius/position of circles
    float v2 = 0.5 + iAudio.y * 0.5;         // Affects sin amplitude of circle centers
    float v3 = 0.5 + iAudio.z * 0.5;         // Affects cos amplitude of circle centers
    float v4 = 0.628318 + iAudio.w * 0.2;     // Affects angle step for circle placement
    float v5 = 0.6 + iAudio.w * 0.3;         // Affects base color brightness
    float v6 = 0.005 + iAudio.w * 0.045; // Affects line thickness/brightness

	vec2 p = (fragCoord.xy*2.0-iResolution.xy)/min(iResolution.x,iResolution.y);
	vec3 destColor = vec3(v5);
	float f = 0.1;
	for(int i_int = 0; i_int < 10; i_int++){
        float i = float(i_int);
        float s = sin(i * v4) * v2 * sin(iTime);
        float c = cos(i * v4) * v3 * sin(iTime);
		f += v6 / abs(length(p + vec2(c, s)) - v1);
	}
	fragColor = vec4(destColor*f, 1.0);
}
`;
export default source;