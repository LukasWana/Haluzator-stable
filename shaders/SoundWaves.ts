const source = `
// Draws a single, complex, vibrating string.
// - Main wave shape is driven by 'audio_amp'.
// - A secondary, faster vibration is layered on top, driven by 'audio_vib'.
// - The entire string moves laterally over time.
// - The entire string also 'jumps' vertically based on 'audio_jump'.
float drawVibratingString(
    vec2 uv, 
    float thickness, 
    float y_pos, 
    // Main Wave
    float base_wave_freq, 
    float base_wave_amp,
    float audio_amp,
    // Secondary Vibration
    float vib_freq_mult,
    float vib_amp_mult,
    float audio_vib,
    // Lateral Motion
    float lateral_speed,
    // Vertical Jump
    float audio_jump
) {
    // 1. Lateral motion: The whole sine wave moves horizontally over time.
    float lateral_offset = iTime * lateral_speed;

    // 2. Main audio-reactive wave shape.
    float main_wave = sin(uv.x * base_wave_freq + lateral_offset) * base_wave_amp * audio_amp;

    // 3. Secondary, higher-frequency vibration on top of the main wave.
    float secondary_vibration = sin(uv.x * base_wave_freq * vib_freq_mult - lateral_offset * 1.7) * base_wave_amp * vib_amp_mult * audio_vib;

    // 4. Vertical "jump" of the whole string.
    float vertical_jump = audio_jump * 0.12;
    
    // Combine all motions
    float y = y_pos + main_wave + secondary_vibration + vertical_jump;
    
    // Use smoothstep to draw a soft, anti-aliased line.
    return smoothstep(thickness, 0.0, abs(uv.y - y));
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // --- UV Setup ---
    // Correct for aspect ratio to make waves look right on any screen.
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    
    // --- Audio-reactive parameters ---
    // Use pow() and multipliers for a more dramatic, responsive feel.
    float bass = pow(iAudio.x, 1.5) * 1.5;
    float mid = pow(iAudio.y, 1.2) * 1.2;
    float high = pow(iAudio.z, 2.0);
    float volume = pow(iAudio.w, 1.5);

    // --- Drawing the strings ---
    float final_intensity = 0.0;
    
    // drawVibratingString(uv, thickness, y_pos, base_freq, base_amp, audio_amp, vib_freq_mult, vib_amp_mult, audio_vib, lateral_speed, audio_jump)
    final_intensity += drawVibratingString(uv, 0.008,  0.5,  8.0, 0.10, bass,   5.0, 0.4, mid,    0.5 + volume, bass*0.5);
    final_intensity += drawVibratingString(uv, 0.010,  0.3, 10.0, 0.12, bass,   4.0, 0.5, mid,   -0.7 - volume, bass*0.7);
    final_intensity += drawVibratingString(uv, 0.012,  0.1, 12.0, 0.15, mid,    3.0, 0.6, bass,   0.9 + volume, mid);
    final_intensity += drawVibratingString(uv, 0.012, -0.1, 12.0, 0.15, mid,    3.0, 0.6, bass,  -0.9 - volume, mid);
    final_intensity += drawVibratingString(uv, 0.010, -0.3, 10.0, 0.12, bass,   4.0, 0.5, mid,    0.7 + volume, bass*0.7);
    final_intensity += drawVibratingString(uv, 0.008, -0.5,  8.0, 0.10, bass,   5.0, 0.4, mid,   -0.5 - volume, bass*0.5);
    
    // --- Coloring ---
    // Dynamic color that cycles over time and shifts its hue based on mid-range frequencies.
    vec3 base_color = 0.5 + 0.5 * cos(iTime * 0.4 + mid * 3.0 + vec3(0.0, 0.6, 1.0));
    vec3 hot_color = vec3(1.0, 0.9, 0.85); 
    
    // High frequencies make the string glow hotter.
    float hotness = clamp(final_intensity * (1.0 + high * 5.0), 0.0, 1.0);
    
    vec3 final_color = mix(base_color, hot_color, hotness) * final_intensity;

    // Add a subtle background glow based on volume and bass for atmosphere
    float bg_glow = pow(max(0.0, 1.0 - length(uv) * 1.1), 3.0) * (volume + bass) * 0.08;
    final_color += bg_glow * base_color;
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;