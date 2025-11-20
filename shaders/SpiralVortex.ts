
const source = `
/* "Vortex" by @kishimisu (2024) - https://www.shadertoy.com/view/MX33Dr
   Adapted for Shader Sequencer with audio reactivity and GLSL fixes.
*/

// COMPATIBILITY FIX: The original define had a syntax error (missing parenthesis).
#define R mat2(cos(vec4(0,11,33,0)))

// COMPATIBILITY FIX: WebGL 1 does not have a built-in round() function.
// We define a simple one here.
float round(float x) {
    return floor(x + 0.5);
}

void mainImage(out vec4 O, in vec2 F) {
    
    vec3    V             = iResolution, 
              o           ;
    
    // Audio-reactive parameters
    float r = iTime * (0.5 + iAudio.w * 2.0); // Speed controlled by overall volume
    float t = .1; 
    float x;
    
    float segment_angle = 0.314 - iAudio.x * 0.15; // Vortex segments react to bass
    float core_radius = 0.014 + iAudio.z * 0.008; // Tunnel core pulses with treble
    float color_shift = iAudio.y * 1.5; // Color palette shifts with mids

    // Initialize output color
    O = vec4(0.0);

    // Using a standard integer for-loop for maximum compatibility.
    for (int i = 0; i < 40; i++) {
        
        // 1. Calculate ray position for this step
        o = t * normalize(vec3( (F + F - V.xy) * R + r * 0.15, V.y) );
        
        // 2. Deform space
        o.y += t * t * 0.09;
        o.z = mod(o.z + r, 0.2) - 0.1;
        x = t * 0.06 - r * 0.2;
        
        // 3. Apply main vortex rotation with stability fixes
        float angle = 0.0;
        // STABILITY FIX: atan(0,0) is undefined. Use a length check to avoid this at the screen center.
        if (length(o.xy) > 1e-6) {
           angle = atan(o.y, o.x);
        }
        
        // STABILITY FIX: Map angle to [0, 2*PI] to remove the discontinuity at +/-PI, which causes a visual seam.
        if (angle < 0.0) {
            angle += 6.2831853;
        }

        // STABILITY FIX: Prevent segment_angle from becoming zero or negative, which would cause division by zero or inverted logic.
        float safe_segment_angle = max(segment_angle, 0.01);
        float quantized_rotation = round((angle - x) / safe_segment_angle) * safe_segment_angle;
        
        // Perform the rotation/deformation
        o.xy *= R + quantized_rotation + x;
        o.x = fract(o.x) - 0.8;
        
        // 4. Calculate distance to surface and step the ray
        x = length(o) * 0.5 - core_radius;
        t += x;
        
        // 5. Accumulate color
        // STABILITY FIX: The denominator can get very close to zero, causing extreme brightness (fireflies).
        // Clamping it to a small positive value prevents this artifact.
        float denominator = max(4.0 + x * 4e2, 0.001);
        O += (1. + cos(t * 0.5 + r + color_shift + vec4(0, 1, 2, 0)))
           * (0.5 + sin(3.0 * t + r * 5.0) / 4.0)
           / denominator;
    }
    
    // Boost overall brightness to make the effect stand out more.
    O *= 1.5;
}
`;
export default source;