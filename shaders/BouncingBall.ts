const source = `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize fragCoord to UV space, centered at (0,0) and maintaining aspect ratio
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // --- Audio-reactive parameters for movement and size ---
    // Low frequencies (iAudio.x) affect horizontal speed
    float speed_mod_x = 0.6 + iAudio.x * 0.5;
    // Mid frequencies (iAudio.y) affect vertical speed
    float speed_mod_y = 0.8 + iAudio.y * 0.5;
    // High frequencies (iAudio.z) affect bounce amplitude (making it 'bounce' closer to the center)
    float amplitude_mod = 0.8 - iAudio.z * 0.2;
    // Overall audio (iAudio.w) affects the base radius of the ball
    float base_radius = 0.15;
    float audio_radius_mod = iAudio.w * 0.1;
    float radius = clamp(base_radius + audio_radius_mod, 0.08, 0.3); // Ensure radius stays within reasonable bounds

    // --- Ball Position Calculation ---
    // Use sine and cosine to create a smooth, oscillating movement
    // A slight time offset on Y makes the bounce path less perfectly symmetric
    vec2 ball_center = vec2(
        sin(iTime * speed_mod_x) * amplitude_mod,
        cos(iTime * speed_mod_y + iTime * 0.1) * amplitude_mod
    );

    // --- Distance from current pixel to ball center ---
    float dist = length(uv - ball_center);

    // --- Background Color ---
    // A subtle, time and UV-based background gradient, modulated by low audio
    vec3 bg_color = 0.5 + 0.5 * cos(iTime * 0.1 + uv.xyx * 3.0 + vec3(0.0, 1.0, 2.0));
    bg_color *= (0.3 + iAudio.x * 0.3); // Low audio makes background brighter

    // --- Ball Appearance ---
    // Base color for the ball, cycling through hues over time
    vec3 ball_base_color = 0.5 + 0.5 * cos(iTime * 0.3 + vec3(0.0, 2.0, 4.0));
    // Highlight color, mixed with base color, gets more yellow/bright with high audio
    vec3 ball_highlight_color = mix(ball_base_color, vec3(1.0, 0.8, 0.0), iAudio.z * 0.8);

    // Use smoothstep for the main body of the ball, creating a sharp but soft-edged circle
    float alpha_edge = smoothstep(radius, radius - 0.015, dist); // 1 inside the ball, 0 outside

    // Create an outer glow effect
    float glow_falloff = 0.08 + iAudio.w * 0.05; // Glow size expands with overall audio
    float glow_amount = smoothstep(radius + glow_falloff, radius, dist); // 1 at radius, fades to 0 further out
    glow_amount *= (0.5 + iAudio.w * 0.5); // Overall audio makes glow more intense

    // --- Final Color Composition ---
    vec3 final_frag_color = bg_color;

    // Mix in the main ball body over the background
    final_frag_color = mix(final_frag_color, ball_highlight_color, alpha_edge);

    // Add the glow effect on top of the ball and background
    // Glow intensity is boosted by mid-range audio
    final_frag_color += ball_highlight_color * glow_amount * (0.8 + iAudio.y * 0.5);

    // Apply subtle overall color tints based on audio frequencies
    final_frag_color = mix(final_frag_color, vec3(1.0, 0.5, 0.8), iAudio.z * 0.15); // High audio adds a pink tint
    final_frag_color = mix(final_frag_color, vec3(0.5, 1.0, 0.5), iAudio.y * 0.08); // Mid audio adds a green tint

    fragColor = vec4(final_frag_color, 1.0);
}
`;
export default source;