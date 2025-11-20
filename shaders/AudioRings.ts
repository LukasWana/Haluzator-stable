const source = `
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float time = iTime * (2. + pow(iAudio.w, 2.0) * 3.0);
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    float r = length(p);
    float a = atan(p.y, p.x);
    
    vec3 color = vec3(0.);
    
    // Audio efekty
    float bassEffect = 1.0 + pow(iAudio.x, 2.0) * 0.5;
    float midEffect = iAudio.y * 2.0;
    
    for (float i = 0.; i < 1.; i += 1./3.) {
        float layer = i * 3.0;
        
        // Koncentrické kruhy s audio reaktivitou
        float rings = r * (5.0 + midEffect) - time * (1.0 + iAudio.w);
        rings += sin(a * (6.0 + iAudio.x * 4.0) + time) * 0.1;
        
        float pattern = sin(rings) * 0.5 + 0.5;
        pattern = pow(pattern, 2.0 + iAudio.z * 2.0);
        
        // Barevné vrstvy
        vec3 c = sin(vec3(0.4, 0.6, 0.8) + layer + time * 0.3) * 0.4 + 0.6;
        c *= pattern;
        
        // Fade efekt od středu
        float fade = 1.0 - smoothstep(0.0, 1.5, r);
        fade *= bassEffect;
        
        color += c * fade;
    }
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;
