// 'Fractal Journey' by polygoniq, originally for Blender.
// Adapted for WebGL, made audio-reactive, and fixed by the AI assistant.

const source = `
// Shader 'Fractal Journey' by polygoniq, originally for Blender.
// Adapted for WebGL and made audio-reactive.

#define PI 3.14159265359

mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Renamed from invalid original to be GLSL compliant
float sdf_helper(vec3 p) {
    p = abs(p);
    return max(p.x, p.y);
}

float mandelbox(vec3 p, float scale) {
    float offset = length(p);
    p = vec3(p.x, p.z, p.y);
    vec4 p4 = vec4(p, 1.0);

    for (int i = 0; i < 5; i++) {
        p.xy = rotate(p.z * 0.2) * p.xy;
        p.yz = rotate(p.x * 0.1) * p.yz;
        
        p = clamp(p, -1.0, 1.0) * 2.0 - p;
        p *= scale;
        p += p4.xyz;
    }
    return (length(p) - offset) / p4.w;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    // Audio reactive parameters
    float speed = 1.0 + iAudio.w * 2.0;
    float audio_bass = iAudio.x;
    float audio_mid = iAudio.y;
    float audio_high = iAudio.z;

    // Ray setup
    vec3 ro = vec3(0.0, 0.0, -iTime * speed);
    vec3 rd = normalize(vec3(uv, 1.0));

    // Camera rotation
    rd.xy *= rotate(iTime * 0.1 + audio_mid * 0.2);
    rd.yz *= rotate(iTime * 0.05);

    // Raymarching
    float t = 0.0;
    vec3 col = vec3(0.0);
    vec3 p = ro;

    for (int i = 0; i < 64; i++) {
        float d = mandelbox(p, 1.5 + audio_bass * 0.5);
        if (d < 0.001) break;
        t += d * 0.5;
        p = ro + rd * t;
        if (t > 20.0) break;
    }

    // Shading
    if (t < 20.0) {
        float fog = 1.0 - t / 20.0;
        vec3 color_base = 0.5 + 0.5 * cos(vec3(0.0, 0.3, 0.6) + p.z * 0.1);
        col = color_base * fog;
        col += vec3(1.0, 0.8, 0.5) * pow(fog, 10.0) * (1.0 + audio_high * 1.5);
    }

    fragColor = vec4(col, 1.0);
}
`;
export default source;
