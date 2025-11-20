const source = `
float circle(vec2 p, float r) {
    return length(p) - r;
}

mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
    
    float t = iTime * (.2 + pow(iAudio.w, 1.5) * 0.25);
    
    vec3 col = vec3(0);

    for (float i=0.; i<8.; i++) {
        uv *= rotate(t * (1. + i*.1));
        
        vec2 p = uv;
        p.x += .8 * sin(t + i);
        
        float d = circle(p, .2 + .1 * sin(t*2. + i) + pow(iAudio.x, 2.0) * 0.08);
        
        vec3 c = sin(vec3(.2,.3,.4) * i + t) * .5 + .5;
        
        col += c * .005 / abs(d) * (1.0 + pow(iAudio.y, 1.5) * 1.5);
    }

    fragColor = vec4(col,1.0);
}
`;
export default source;