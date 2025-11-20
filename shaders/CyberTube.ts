const source = `
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord.xy-.5*iResolution.xy) / iResolution.y;
    
    float t = iTime * (0.5 + pow(iAudio.w, 2.0) * 1.0);

    float r = length(uv);
    float a = atan(uv.y, uv.x);
    
    // FIX: Normalize angle to a 0-1 range to remove the seam artifact caused by
    // the discontinuity in atan() at -PI/PI. The subsequent multiplication by 5.0
    // inside fract() will now wrap seamlessly because the angle's wrap-around jump becomes 
    // an integer (1.0), and fract(x + integer) == fract(x).
    a = a / 6.2831853 + 0.5;
    
    float z = -t;
    
    a += 1.0/r*0.5*sin(t+r*(2.0 + pow(iAudio.x, 1.5) * 3.0));
    z += 1.0/r*0.5;
    
    float c = fract(z);
    
    float s = 1.0-smoothstep(0.0, 0.5, abs(0.5-fract(a*5.0)));
    float s2 = 1.0-smoothstep(0.0, 0.5, abs(0.5-fract(z*10.0)));
    
    vec3 col = vec3(0.);
    col.b = s+s2;
    col.r = s*s2 + pow(iAudio.x, 2.0) * 0.4;
    col.g = s+s2*0.2 + pow(iAudio.y, 2.0) * 0.25;
    col /= (r*2.0 + 1e-5);

    fragColor = vec4(col, 1.0);
}
`;
export default source;
