const source = `
// Copyright Inigo Quilez, 2013 - https://iquilezles.org/
// I am the sole copyright owner of this Work.
// You cannot host, display, distribute or share this Work neither
// as it is or altered, here on Shadertoy or anywhere else, in any
// form including physical and digital. You cannot use this Work in any
// commercial or non-commercial product, website or project. You cannot
// sell this Work and you cannot mint an NFTs of it or train a neural
// network with it without permission. I share this Work for educational
// purposes, and you can link to it, through an URL, proper attribution
// and unmodified screenshot, as part of your educational material. If
// these conditions are too restrictive please contact me and we'll
// definitely work it out.

vec2 hash( vec2 p )
{
    // procedural white noise	
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    
    // animate
    uv *= 2.0 + 1.0*sin(iTime*0.25) + pow(iAudio.x, 2.0) * 1.5;

    float time = iTime * (1.0 + pow(iAudio.w, 1.5) * 1.5);
    vec2 p = 0.5 - 0.5*sin( time*0.1 + uv*1.2 );
    vec2 i = floor(p);
    vec2 f = fract(p);

    float min_dist = 1.0;
    
    for( int y=-1; y<=1; y++ )
    for( int x=-1; x<=1; x++ )
    {
        vec2 n = vec2( float(x), float(y) );
        vec2 g = i + n;
        
        vec2 o = hash( g );

        o = 0.5 + 0.5*sin( time*0.5 + 6.2831*o );

        float d = length( n + o - f );

        min_dist = min( min_dist, d );
    }

    vec3 col = vec3(min_dist);

    // move and color
    col = 0.5 + 0.5*cos( time*0.2 + col*6.2831*3.0 + vec3(0.0, 0.6 + pow(iAudio.y, 2.0)*0.3, 1.0) );

    fragColor = vec4( col, 1.0 );
}
`;
export default source;