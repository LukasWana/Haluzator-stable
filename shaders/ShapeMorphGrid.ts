// Original GLSL by user, adapted for Shader Sequencer by AI

const source = `
float sdDiamond(vec2 p, float size) {
    // A diamond is a 45-degree rotated square. Using Manhattan distance is simpler.
    return (abs(p.x) + abs(p.y)) - size;
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // UV setup, centered at (0,0) and aspect-corrected
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    // Create a grid of 3x3
    vec2 gv = fract(uv * 1.5) * 2.0 - 1.0;
    vec2 id = floor(uv * 1.5);

    // Mouse influence on animation speed and size
    vec2 m = (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y;
    float mouseInfluence = clamp(1.0 - length(m - uv) * 0.5, 0.0, 1.0);

    // Audio-reactive parameters
    float time = iTime * (1.0 + iAudio.w * 1.0); // Overall volume affects speed
    float bass_mod = iAudio.x; // Bass affects size
    float mid_mod = iAudio.y; // Mids affect shape morphing
    float high_mod = iAudio.z; // Highs affect color

    // Base animation speed
    float speed = 0.5 + mouseInfluence * 0.3;

    // Create phase offset based on cell position
    float offset = sin(id.x * 0.5) * 0.5 + cos(id.y * 0.7) * 0.5;

    // Animate between circle and diamond, affected by mids
    float t = sin(time * speed + offset * 3.0 + mid_mod * 2.0) * 0.5 + 0.5;

    // Size animation, affected by bass
    float size = 0.2 + 0.3 * (sin(time * speed * 0.7 + offset * 2.0) * 0.5 + 0.5);
    size += bass_mod * 0.3;

    // Mouse influence on size
    size += mouseInfluence * 0.1;

    // Blend between circle and diamond
    float circle = sdCircle(gv, size * 0.5);
    float diamond = sdDiamond(gv, size * 0.35); // Adjust size for better visual match
    float shape = mix(circle, diamond, t);

    // Create sharp shapes
    float line_width = 0.02;
    float finalShape = smoothstep(line_width, 0.0, abs(shape) - 0.01);

    // Coloring, affected by highs
    vec3 color1 = vec3(0.9, 0.1, 0.3);
    vec3 color2 = vec3(0.1, 0.9, 0.8);
    vec3 bgColor = vec3(0.05);
    vec3 shapeColor = mix(color1, color2, high_mod);

    vec3 col = mix(bgColor, shapeColor, finalShape);

    fragColor = vec4(col, 1.0);
}
`;
export default source;
