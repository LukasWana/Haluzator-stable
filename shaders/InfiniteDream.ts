const source = `
vec2 position(float z) {
	return vec2(
		0.0 + sin(z * 0.1) * 1.0 + sin(cos(z * 0.031) * 4.0) * 1.0 + sin(sin(z * 0.0091) * 3.0) * 3.0,
		0.0 + cos(z * 0.1) * 1.0 + cos(cos(z * 0.031) * 4.0) * 1.0 + cos(sin(z * 0.0091) * 3.0) * 3.0
	) * 1.0;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 p = (fragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
    
    // Audio-reactive time for speed control
    float time = iTime * (0.5 + iAudio.w * 1.5);

	float camZ = 25.0 * time;
	vec2 cam = position(camZ);

	float dt = 0.5;
	float camZ2 = 25.0 * (time + dt);
 	vec2 cam2 = position(camZ2);
	vec2 dcamdt = (cam2 - cam) / dt;
	
	vec3 f = vec3(0.0);
    // OPTIMIZATION: Reduced loop count from 300 to 150 for better performance.
 	for(int j = 1; j < 150; j++) {
		float i = float(j);
		float realZ = floor(camZ) + i;
		float screenZ = realZ - camZ;
        // Add epsilon to prevent division by zero if screenZ is 0
        if (abs(screenZ) < 1e-5) continue;

		float r = 1.0 / screenZ;
 		vec2 c = (position(realZ) - cam) * 10.0 / screenZ - dcamdt * 0.4;
	 	
        // Audio-reactive color palette (mids)
        vec3 color = (vec3(sin(realZ * 0.07), sin(realZ * 0.1 + iAudio.y * 1.5), sin(realZ * 0.08)) + vec3(1.0)) / 2.0;
 		
        // Audio-reactive brightness (bass) and sharpness (highs)
        float brightness = 0.06 + iAudio.x * 0.08;
        float sharpness = 0.01 + iAudio.z * 0.01;

        // Add epsilon to denominator to prevent division by zero
        f += color * brightness / screenZ / (abs(length(p - c) - r) + sharpness + 1e-6);
	}

	fragColor = vec4(f, 1.0);
}
`;
export default source;
