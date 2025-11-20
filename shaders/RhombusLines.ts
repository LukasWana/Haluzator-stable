
const source = `
// Fork of "Just something" by FFFFFFear1. https://shadertoy.com/view/X3XGDj
// Adapted for Shader Sequencer with audio reactivity and GLSL compatibility fixes.

#define float2x2 mat2

vec3 hsb2rgb( in vec3 c )
{
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                             6.0)-3.0)-1.0,
                     0.0,
                     1.0 );
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return (c.z * mix( vec3(1.0), rgb, c.y));
}

float2x2 getRotationMatrix(float theta) {
    float s = sin(theta);
    float c = cos(theta);
    return float2x2(c,-s,s,c);
}

vec3 colorPalette(float t, float time, float audio_w)
{
    // Make color shifting reactive to overall volume
    return hsb2rgb(vec3(((t)*1.1343 + time * (0.0001 + audio_w * 0.001)), 0.9, 0.9));
}

// Draws a line segment. The logic is highly specific to the original author's intent.
float drawLine(vec2 uv, vec2 startPoint, vec2 endPoint, float widthLine, float distanceLine, vec2 anchor) {
    float halfWidthLine = widthLine * 0.5;
    
    vec2 pos = uv;
    vec2 vector = endPoint - startPoint;
    float angle = 0.0;
    
    // COMPATIBILITY FIX: The original angle calculation could lead to division by zero.
    // This has been patched to handle those cases safely.
    float denom = vector.x + vector.y;
    if (vector.x > 0.0 && vector.y == 0.0) {
        angle = 90.0;
    }
    else if (vector.x == 0.0 && vector.y > 0.0) {
        angle = 0.0;
    }
    else if (abs(denom) > 1e-5) {
        angle = (90.0 / denom);
    }
    
    pos *= getRotationMatrix(angle * 0.0174);
    
    float A = step(-halfWidthLine, pos.x + anchor.x) - (step(distanceLine, pos.y + anchor.y) + step(distanceLine, -pos.y - anchor.y));
    float B = step(-halfWidthLine, -pos.x - anchor.x) - (step(distanceLine, pos.y + anchor.y) + step(distanceLine, -pos.y - anchor.y));
    
    return A * B;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord*2. - iResolution.xy)/iResolution.y;
    vec2 uvColor = uv;
    
    vec2 pos = uv;
    vec3 finalColor = vec3(0.0);    
    
    // Angle rotation is driven by time and mid-frequencies
    float angle = 1.0 - sin(iTime * (0.8 + iAudio.y * 1.5) + cos(uvColor.x));
    
    if(angle * 0.0174 >= 45.0) {
        angle = 180.0 / 0.0174;
    }
    
    float2x2 rotateMat = getRotationMatrix(angle);
    
    // COMPATIBILITY FIX: Initialize loop variables to zero to prevent undefined behavior.
    float lines = 0.0;
    vec3 color;    
    
    for(float i = 0.0; i < 7.0; i++)
    { 
        // Line width pulses with high-frequencies
        float current_width = (0.05 + iAudio.z * 0.03) - (i / 100.0);
        if (current_width <= 0.0) continue;

        // The original shader draws four separate line segments to form a pattern.
        float line1 = drawLine((pos - vec2(-(i / 10.0),  (i / 10.0))) * rotateMat, vec2(-0.5, -0.5), vec2(-0.5, 0.5), current_width, 1.0, vec2(0.0, 6.0));
        float line2 = drawLine((pos - vec2( (i / 10.0), -(i / 10.0))) * rotateMat, vec2(0.0, -0.5), vec2(-0.5, -0.5), current_width, 1.0, vec2(0.0, 5.0));
        float line3 = drawLine((pos - vec2( (i / 10.0),  (i / 10.0))) * rotateMat, vec2(-0.5, 0.5), vec2(0.5, 0.5), current_width, 1.0, vec2(0.0, 5.0));
        float line4 = drawLine((pos - vec2(-(i / 10.0), -(i / 10.0))) * rotateMat, vec2(0.0, 0.0), vec2(-0.5, -0.5), current_width, 1.0, vec2(0.0, 5.0));
        
        lines += line1 + line2 + line3 + line4;
        lines = sin(lines * 2.0 + iTime) / 1.5;
        
        // Bass (x) influences the color lookup pattern
        float audio_color_mod = 0.5 + iAudio.x * 2.0;
        color = colorPalette(lines + length(uv)*i/2.0 * audio_color_mod, iTime, iAudio.w);
        
        finalColor += color;
    }
 
    // The final color is the average of the colors generated in the loop.
    finalColor /= 7.0;
    
    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;