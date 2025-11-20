// PulsatingStar by user, adapted for Shader Sequencer by AI

const source = `
// PulsatingStar by user, adapted and made audio-reactive for Shader Sequencer.

float sdStar5(vec2 p, float r, float rf) {
    const vec2 k1 = vec2(0.809016994375, -0.587785252292);
    const vec2 k2 = vec2(-k1.x,k1.y);
    p.x = abs(p.x);
    p -= 2.0*max(dot(k1,p),0.0)*k1;
    p -= 2.0*max(dot(k2,p),0.0)*k2;
    p.x = abs(p.x);
    p.y -= r;
    vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0,1);
    float h = clamp( dot(p,ba)/dot(ba,ba), 0.0, r );
    return length(p-ba*h) * sign(p.y*ba.x-p.x*ba.y);
}

// Audio-reactive color palette
vec3 palette(float t, float audio_mids) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557) + audio_mids * 0.2; // Mids shift color phase
    return a + b*cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // Audio-reactive parameters
    float time = iTime * (0.5 + iAudio.w * 0.5); // Overall volume controls speed
    float bass_pulse = iAudio.x * 0.5; // Bass makes the star pulse in size
    float high_flash = iAudio.z * 1.5; // Highs create flashes on the edges

    // Star SDF
    // The star's radius and inner ratio pulse with bass
    float star_radius = 0.5 + bass_pulse * 0.2;
    float star_ratio = 0.5 + sin(time * 2.0 + bass_pulse) * 0.1;
    float d = sdStar5(uv, star_radius, star_ratio);

    vec3 col = vec3(0.0);
    
    // Glow effect - more intense with bass
    float glow = exp(-(2.0 + bass_pulse) * abs(d));
    vec3 starColor = palette(d + time, iAudio.y);
    
    col += starColor * glow;
    
    // Background color
    col += vec3(0.1, 0.2, 0.3) * (1.0 - glow);
    
    // Edge highlighting - flashes with treble
    col = mix(col, col * (1.2 + high_flash), smoothstep(0.05, 0.0, abs(d)));
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;
