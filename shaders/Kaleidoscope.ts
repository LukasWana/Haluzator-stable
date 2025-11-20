const source = `
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    
    // set position
    vec2 v = iResolution.xy;
    vec2 p = (fragCoord-v*.5)*.4 / v.y;
    // breathing effect
    p += p * (sin(dot(p, p)*20.-iTime) * .04 + pow(iAudio.x, 2.0) * 0.08);
    
    // accumulate color
    fragColor = vec4(0.0);
    for (float i = .5 ; i < 8. ; i++) {
        // fractal formula and rotation
        vec4 angles = cos(.01*(iTime*(1.0 + pow(iAudio.w, 1.5) * 0.8)+iMouse.x*.1)*i*i + .78*vec4(1,7,3,1));
        p = abs(2.*fract(p-.5)-1.) * mat2(angles.x, angles.y, angles.z, angles.w);
        
        // coloration
        fragColor += exp(-abs(p.y)*5.) * (cos(vec4(2,3,1,0)*i)*.5+.5);
    }
        
    // palette
    fragColor.gb *= .5 + pow(iAudio.y, 2.0) * 0.4;
    fragColor.a = 1.0;
}
`;
export default source;