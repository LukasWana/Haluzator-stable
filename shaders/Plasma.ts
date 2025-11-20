const source = `
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	float x = fragCoord.x;
	float y = fragCoord.y;
    float time = iTime * (1.0 + pow(iAudio.w, 1.5) * 1.5);
	float mov0 = x+y+cos(sin(time)*2.0)*100.+sin(x/100.)*1000.;
	float mov1 = y / iResolution.y / 0.2 + time;
	float mov2 = x / iResolution.x / 0.2;
	float c1 = abs(sin(mov1+time)/2. + mov2/2. - mov1-mov2+time);
	float c2 = abs(sin(c1+sin(mov0/1000.+time) + sin(y/40.+time) + sin((x+y)/100.)*3.));
	float c3 = abs(sin(c2+cos(mov1+mov2+c2)+cos(mov2)+sin(x/1000.)));
	fragColor = vec4( c1 + pow(iAudio.x, 2.0) * 0.4, c2 + pow(iAudio.y, 2.0) * 0.4, c3 + pow(iAudio.z, 2.0) * 0.4, 1.0);
}
`;
export default source;