const source = `
// GlitchMatrix by AI
// A digital, glitchy version of the Matrix code effect.

float hash(float n) { return fract(sin(n) * 43758.5453); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    
    // Audio-reactive parameters
    float speed = 0.5 + iAudio.w * 1.5;
    float glitch_intensity = iAudio.x; // Bass controls glitch intensity
    float color_aberration = iAudio.y * 0.01; // Mids control chromatic aberration (unused in this version)
    float character_density = 10.0 + iAudio.z * 20.0; // Highs control character density

    float time = iTime * speed;
    
    // Create columns
    float column_id = floor(uv.x * character_density);
    
    // Glitch effect: horizontal shift
    float glitch_x = (hash(column_id) - 0.5) * 2.0 * glitch_intensity * sin(time * 5.0 + column_id);
    uv.x += smoothstep(0.8, 1.0, hash(column_id + 10.0)) * glitch_x;
    
    // Matrix rain effect
    float rain_pos = uv.y * 2.0 + time * (0.5 + hash(column_id));
    float trail = fract(rain_pos);
    float character_id = floor(rain_pos);
    
    // Generate "character" brightness
    float character = hash(column_id + character_id * 1.234);
    character = pow(character, 10.0);
    
    // Create trail fade
    character *= pow(1.0 - trail, 2.0);
    
    // Leader of the trail is brighter
    character += pow(1.0 - trail, 20.0) * 0.5;
    
    // Glitch effect: blocky artifacts
    if(hash(character_id + column_id) > 0.95 && glitch_intensity > 0.1) {
        character = 1.0;
    }
    
    // Coloring with chromatic aberration
    vec3 final_color;
    // FIX: Cannot multiply float by bool. Cast bool to float.
    final_color.r = character * float(hash(column_id + character_id) > 0.3);
    // FIX: iChannel0 and texture() are not available in shape shaders.
    // Setting to 0.0 based on original author's intent ("this will be black").
    final_color.g = 0.0; 
    final_color.b = 0.0;
    
    // Base green color
    final_color.g += character;
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;