
const source = `
// Original shader by k-mouse
// https://www.shadertoy.com/view/flcyDj
// Adapted for Shader Sequencer with audio reactivity

vec3 colorPalette( float t, float mid_audio )
{
    // Audio-reactive color palette shifts
    vec3 a = vec3(1.468, .248, .108);
    vec3 b = vec3(-1.312, 1.500, 0.448);
    vec3 c = vec3(-0.732, 1.328, -.328) + mid_audio * 0.2;
    vec3 d = vec3(-0.542, 0.118, -1.48);
    
    return a + b*cos( 6.28318*(c*t+d) );
}

mat2 getRotationMatrix(float theta) {
    float s = sin(theta);
    float c = cos(theta);
    
    return mat2(c,-s,s,c);
}

mat2 getScaleMatrix(float scale) {
    return mat2(scale,0,0,scale);
}

// Function to draw a regular polygon, simplified for triangles
float triangle(vec2 point, float size)
{
    const float sides = 3.0;
    float k = sqrt(sides);
    point.x = abs(point.x) - size;
    point.y = point.y + size / k;
    
    if (point.x + k * point.y > 0.0) 
    {
        point = vec2(point.x - k * point.y, -k * point.x - point.y) / 2.0;
    }
    
    return abs(point.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec3 finalColor = vec3(0.0);
    
    // Audio-reactive parameters
    float speedColor = -0.3 + iAudio.y * 0.5;
    float radius = 0.12 + iAudio.w * 0.2;
    float count = 20.0 + iAudio.x * 40.0;
    float angleOffset = 45.0 + iAudio.y * 20.0;
    float glow = 0.005 + iAudio.z * 0.01;
    float angleMultiplier = 8.0 + iAudio.x * 4.0;
    float triangleSize = 0.01 + iAudio.w * 0.02;
    vec2 offsetStep = vec2(0.02, 0.02);

    // Initial values for the loop
    float angle = 0.0;
    vec2 offset = vec2(0.0);
    
    // FIX: WebGL 1 requires constant loop conditions.
    // We loop to a fixed maximum and break out based on the dynamic 'count' variable.
    const int MAX_ITERATIONS = 60;
    for (int i = 0; i < MAX_ITERATIONS; i++) 
    {
        if (float(i) >= count) break;
        
        float fi = float(i);

        mat2 rotateMat = getRotationMatrix(angle * angleMultiplier);    
        mat2 scaleMat = getScaleMatrix((sin(iTime) + 1.0) / 3.0 + 0.5);
        vec2 newPos = (rotateMat * uv + radius);
        newPos += offset;
        
        float base_triangle = triangle(uv, triangleSize);
        // Add epsilon to avoid division by zero
        float exp_val = exp(base_triangle) + 1e-6;
        float newTriangle = triangle(newPos * scaleMat, triangleSize) / exp_val;
        
        vec3 color = colorPalette(base_triangle + fi/count + iTime * speedColor, iAudio.y);
        
        // Add epsilon to sin denominator to avoid division by zero.
        // Since newTriangle is always >= 0, sin(newTriangle/2.0) is also >= 0.
        float glow_triangle = pow(abs(glow / (sin(newTriangle / 2.0) + 1e-6)), 2.1);
        
        finalColor += glow_triangle * color;
      
        angle += angleOffset;
        offset += offsetStep;
    }
    
    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;