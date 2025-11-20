const source = `
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float flower(vec2 uv, float petals, float size, float sharpness) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float petal = sin(angle * petals);
    float shape = smoothstep(size + petal * 0.1, size - sharpness, radius);
    return shape;
}

float mandalaLayer(vec2 uv, float petals, float size, float time_offset, float audio_influence) {
    float angle = atan(uv.y, uv.x) + iTime * 0.1 + time_offset;
    float radius = length(uv);
    
    float petal_shape = sin(angle * petals + iTime * 0.5) * 0.3;
    petal_shape += sin(angle * petals * 2.0 + iTime * 0.8) * 0.1;
    
    float audio_mod = 1.0 + iAudio.x * audio_influence;
    float adjusted_size = size * audio_mod;
    
    float layer = smoothstep(adjusted_size + petal_shape * 0.15, adjusted_size - 0.02, radius);
    layer *= smoothstep(adjusted_size - 0.25, adjusted_size - 0.02, radius);
    
    return layer;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    float radius = length(uv);
    float angle = atan(uv.y, uv.x);
    
    vec3 background = vec3(0.05, 0.02, 0.1);
    
    float stars = smoothstep(0.99, 1.0, sin(uv.x * 50.0 + iTime) * sin(uv.y * 50.0 + iTime * 0.7));
    stars += smoothstep(0.98, 1.0, sin(uv.x * 80.0 - iTime * 0.5) * sin(uv.y * 60.0 + iTime * 1.2));
    background += stars * vec3(0.3, 0.5, 0.8) * (0.5 + iAudio.z);
    
    vec3 color = background;
    
    float layer1 = mandalaLayer(uv, 8.0, 0.8, 0.0, 0.3);
    float hue1 = fract(angle / 6.283185 + iTime * 0.1 + iAudio.y * 0.5);
    vec3 color1 = hsv2rgb(vec3(hue1, 0.8, 0.9));
    
    float layer2 = mandalaLayer(uv, 16.0, 0.6, 1.57, 0.2);
    float hue2 = fract(angle / 6.283185 + 0.3 + iTime * 0.15 + iAudio.y * 0.3);
    vec3 color2 = hsv2rgb(vec3(hue2, 0.9, 1.0));
    
    float layer3 = mandalaLayer(uv, 24.0, 0.4, 3.14, 0.4);
    float hue3 = fract(angle / 6.283185 + 0.6 + iTime * 0.2 + iAudio.y * 0.7);
    vec3 color3 = hsv2rgb(vec3(hue3, 1.0, 1.0));
    
    float layer4 = mandalaLayer(uv, 32.0, 0.25, 4.71, 0.5);
    float hue4 = fract(angle / 6.283185 + 0.8 + iTime * 0.05 + iAudio.y * 0.4);
    vec3 color4 = hsv2rgb(vec3(hue4, 0.7, 1.0));
    
    float center_detail = smoothstep(0.12, 0.08, radius);
    center_detail *= 1.0 + sin(angle * 12.0 + iTime * 2.0) * 0.3;
    center_detail *= 1.0 + iAudio.w * 0.5;
    
    float center_ring = smoothstep(0.06, 0.04, abs(radius - 0.08));
    center_ring *= 1.0 + iAudio.z * 2.0;
    
    vec3 center_color = hsv2rgb(vec3(iTime * 0.1 + iAudio.y, 1.0, 1.0));
    
    color = mix(color, color1, layer1);
    color = mix(color, color2, layer2);
    color = mix(color, color3, layer3);
    color = mix(color, color4, layer4);
    color = mix(color, center_color, center_detail);
    color += center_color * center_ring;
    
    float overall_glow = smoothstep(1.2, 0.0, radius) * 0.3 * (1.0 + iAudio.w);
    color += overall_glow * hsv2rgb(vec3(iTime * 0.05, 0.5, 0.5));
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;
