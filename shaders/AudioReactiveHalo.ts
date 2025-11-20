// credit: https://www.shadertoy.com/view/4tGXzt
// Adapted for VJ App with iAudio uniform.

const source = `
const float PI = 3.1415;
const float BRIGHTNESS = 0.2;
const float SPEED = 0.5;

//convert HSV to RGB
vec3 hsv2rgb(vec3 c){
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

// Re-implementation of getfrequency to use the iAudio uniform (vec4)
// instead of the iChannel0 texture from Shadertoy.
float getfrequency(float x) {
    // The input 'x' is a value derived from an angle or position, typically in [0, 1].
    // We smoothly interpolate between low, mid, and high frequency bands.
	float normalized_x = clamp(x, 0.0, 1.0);
	
	float low_f = iAudio.x;
	float mid_f = iAudio.y;
	float high_f = iAudio.z;
	
	float val;
	if (normalized_x < 0.5) {
		// Mix between low and mid frequencies for the first half of the range.
		val = mix(low_f, mid_f, normalized_x * 2.0);
	} else {
		// Mix between mid and high frequencies for the second half.
		val = mix(mid_f, high_f, (normalized_x - 0.5) * 2.0);
	}
	
	// The original shader added a small base value. We'll do the same.
	return val + 0.08;
}

// Since our new getfrequency is already smooth, these functions can just call it directly.
float getfrequency_smooth(float x) {
	return getfrequency(x);
}

float getfrequency_blend(float x) {
    return getfrequency(x);
}

vec3 doHalo(vec2 fragment, float radius) {
	float dist = length(fragment);
	float ring = 1.0 / abs(dist - radius);
	
	float b = dist < radius ? BRIGHTNESS * 0.3 : BRIGHTNESS;
	
	vec3 col = vec3(0.0);
	
	float angle = atan(fragment.x, fragment.y);
	col += hsv2rgb( vec3( ( angle + iTime * 0.25 ) / (PI * 2.0), 1.0, 1.0 ) ) * ring * b;
	
    // abs(angle / PI) creates a value in the [0, 1] range, perfect for our new getfrequency function.
	float frequency = max(getfrequency_blend(abs(angle / PI)) - 0.02, 0.0);
	col *= frequency;
	
	// Black halo
	col *= smoothstep(radius * 0.5, radius, dist);
	
	return col;
}

vec3 doLine(vec2 fragment, float radius, float x) {
	vec3 col = hsv2rgb(vec3(x * 0.23 + iTime * 0.12, 1.0, 1.0));
	
	float freq = abs(fragment.x * 0.5);
	
	col *= (1.0 / (abs(fragment.y) + 1e-6)) * BRIGHTNESS * getfrequency(freq);	
	col = col * smoothstep(radius, radius * 1.8, abs(fragment.x));
	
	return col;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Correct aspect ratio by normalizing with the largest screen dimension.
    // This ensures length(fragPos) corresponds to a circle.
    vec2 fragPos = (fragCoord.xy - 0.5 * iResolution.xy) / max(iResolution.x, iResolution.y);
	
	vec3 color = vec3(0.0134, 0.052, 0.1);

    // Previous display radius was visually ~0.45. A 70% reduction gives a new radius of 0.135.
    float displayRadius = 0.135;
	color += doHalo(fragPos, displayRadius);

    float c = cos(iTime * SPEED);
    float s = sin(iTime * SPEED);
    mat2 rot = mat2(c,s,-s,c);
    vec2 rotatedPos = rot * fragPos;
	color += doLine(rotatedPos, displayRadius, rotatedPos.x);
	
	color += max(luma(color) - 1.0, 0.0);
    
	fragColor = vec4(color, 1.0);
}
`;
export default source;