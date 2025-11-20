const source = `
// "NeoFlow" - Adapted from user submission
// Enhanced with audio reactivity for Shader Sequencer.

float fneon(float shade, float amount)
{
    // Add a small epsilon to shade to prevent division by zero, which causes bright artifacts.
    return amount / (shade + 1e-6);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalize coordinates and correct aspect ratio
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // --- Audio-Reactive Parameters ---
    float time = iTime * (0.8 + iAudio.w * 1.2); // Overall volume controls animation speed
    float bass_mod = iAudio.x * 0.4;        // Bass affects radius and distortion
    float mid_mod = iAudio.y * 1.2;         // Mids affect distortion wave patterns
    float high_mod = iAudio.z * 0.06;       // Highs affect glow sharpness/thickness

    vec3 rgb_channels = vec3(0.0);
    
    // Use a constant integer for the loop for WebGL 1 compatibility.
    const int iterations = 31;
  
    for (int i_int = 0; i_int < iterations; ++i_int)
    {
        float i = float(i_int);
   
        // Complex UV distortion. Bass adds to the denominator to change the wave shape.
        // Added an epsilon to prevent division by zero.
        float divisor = length(vec2(uv.x - 1.0, 0.75 + sin(time) / 4.0 + bass_mod)) + 1e-6;
        uv.x = sin(length(uv.xy) / divisor) * 1.0;
          
        // --- Red Channel ---
        float radxr_ic = 0.5;
        float radxr = abs(sin(time + i * radxr_ic) * 2.0) * (1.0 + bass_mod);
        float radyr_ic = 0.35;
        float radyr = abs(sin(time + 2.0 + i * radyr_ic) * 3.0);
        float uvdr_ca = 1.2;
        float uvdr_cb = 1.5;
        vec2 uvdr = vec2(cos(uv.x + time + 2.0 * i * uvdr_ca) * radxr, sin(uv.y + time + uvdr_cb * i) * radyr);
        
        // --- Green Channel ---
        float radxg_ic = 0.25;
        float radxg = abs(sin(time + i * radxg_ic) * 2.0);
        float radyg_ic = 0.35;
        float radyg = abs(sin(time + 2.0 + i * radyg_ic) * 3.0);
        float uvdg_ca = 2.2;
        float uvdg_cb = 0.5;
        vec2 uvdg = vec2(cos(uv.x + time + 2.0 * i * uvdg_ca) * radxg, sin(uv.y + time + uvdg_cb * i) * radyg);

        // --- Blue Channel ---
        float radxb_ic = 0.75;
        float radxb = abs(sin(time + i * radxb_ic) * 2.0);
        float radyb_ic = 0.88;
        float radyb = abs(sin(time + 2.0 + i * radyb_ic) * 3.0);
        float uvdb_ca = 1.0 + sin(time / 5.0 + mid_mod); // Mids distort blue channel waves
        float uvdb_cb = 1.0 + cos(time / 13.0);
        vec2 uvdb = vec2(cos(uv.x + time + 2.0 * i * uvdb_ca) * radxb, sin(uv.y + time + uvdb_cb * i) * radyb);

        // Calculate glow for each channel. Highs make the glow sharper (thinner).
        float fneon_amount = 0.095 - high_mod;
        rgb_channels.r += pow(fneon(distance(uv, uvdr), fneon_amount), 3.0);
        rgb_channels.g += pow(fneon(distance(uv, uvdg), fneon_amount), 3.0);
        rgb_channels.b += pow(fneon(distance(uv, uvdb), fneon_amount), 3.0);
    }
    
    // Normalize and scale the final color for better appearance
    rgb_channels /= float(iterations) * 1.5;

    fragColor = vec4(rgb_channels, 1.0);
}
`;
export default source;