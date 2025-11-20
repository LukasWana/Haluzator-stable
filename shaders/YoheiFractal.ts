
const source = `
// Original shader by Yohei Nishitsuji (https://x.com/YoheiNishitsuji/status/1946193239486431531)
// Adapted for Shader Sequencer with audio reactivity and GLSL compatibility fixes.

// HSV to RGB color space conversion
vec3 hsv(float h, float s, float v) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(h + K.xyz) * 6.0 - K.www);
    return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
}

// 3D rotation matrix around arbitrary axis
mat3 rotate3D(float angle, vec3 axis) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
    );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Normalize coordinates
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    uv.x *= 0.8;
    
    // Audio-reactive time for overall speed
    float t = iTime * (0.5 + iAudio.w * 1.5);
    vec3 o = vec3(0.0);
    
    // Ray marching variables
    float g = 0.0;
    float e = 0.0;
    float s = 0.0;
    
    // Audio-reactive parameters
    float rotation_wobble = 2.0 + iAudio.x * 2.0;
    float fractal_offset = 0.03 + iAudio.z * 0.02;
    float color_shift = iAudio.y * 0.5;
    
    // Ray marching loop - use integer for compatibility
    // The original loop used a float, which is not standard.
    for(int i = 0; i < 99; i++) {
        e = 2.0;
        
        // Calculate 3D ray position
        vec3 p = vec3(uv * g * 3.0, g) * rotate3D(t * 0.5 - 8.0, vec3(2.0 + sin(t * 0.5) * rotation_wobble, 1.0, 1.0));
        
        // Z-axis modulation for layered fractal structure
        p.z = mod(t * 0.5 / 1.047 + p.z, e) - e;
        p.x += 0.6;
        
        // Distance field evaluation - Mandelbox-style fractal folding
        for(int j = 0; j < 21; j++) {
            p = abs(p.zyx) - 1.0;
            s = dot(p, p);
            e /= s;
            p /= s + fractal_offset;
        }
        
        // Ray marching step
        g -= p.z / e * 0.5 + 0.002;
        
        // Color accumulation
        // Added epsilon to denominators to prevent division by zero, which can cause artifacts.
        o.rgb += (1e-5 + hsv(p.y + color_shift, p.y * 5.0 + s, 3.0) * 9e-6 * e / (s * s + 1e-6));
    }
    
    fragColor = vec4(o, 1.0);
}
`;
export default source;