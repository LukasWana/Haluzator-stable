const source = `
const float tau = 6.28318530717958647692;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float time = iTime * (2. + pow(iAudio.w, 2.0) * 3.0);
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    float r = length(p);
    float a = atan(p.y, p.x);
    
    float z = 1. / r;
    
    vec3 color = vec3(0.);
    
    float ss = .5 + .5 * sin(time * 0.5);
    
    for (int i_int = 0; i_int < 3; i_int++) {
        float i = float(i_int) / 3.0;
        float ii = i + ss;
        float fi = floor(ii);
        
        float z2 = z + time + sin(a * (3. + pow(iAudio.x, 2.0) * 4.0) + time) * .2;

        float h = fract(z2 * .2 + ii);
        
        float w = (1. - h);
        
        float fade = w * w;
        fade *= pow(z / 4., .5);
        
        vec3 c = sin(vec3(.4, .5, .7) * fi) * .4 + .6;
        
        float a2 = a * 6. + (time + z * 1.)*.0;
        float sa = sin(a2) * .5 + .5;
        
        float g = smoothstep(.1, .101, fract(z2 * 2. + sa));
        g *= smoothstep(.1, .101, fract(z2 + sa));
        g = 1. - g;
        
        c *= g * (1.0 + pow(iAudio.y, 1.5) * 1.0);
        
        color += c * fade;
    }
    
    fragColor = vec4(color,1.0);
}
`;
export default source;