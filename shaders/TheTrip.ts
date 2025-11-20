const source = `
mat2 rot2(float a) {
	float c = cos(a);
	float s = sin(a);
	return mat2(c, s,-s, c);
}
vec3 rotate(vec3 p, vec3 a){
    vec3 q=p;
    q.yz=rot2(a.y)*q.yz;
    q.xy=rot2(a.z)*q.xy;
    q.xz=rot2(a.x)*q.xz;
	return q;
}
vec3 hsv2rgb(vec3 c){
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float smax( in float a, in float b, in float s ){
    float h = clamp( 0.5 + 0.5*(a-b)/s, 0.0, 1.0 );
    return mix(b, a, h) + h*(1.0-h)*s;
}
vec2 path(float z){
    return vec2(.01*sin(z*40.)+.03*sin(z*13.),.03*cos(z*21.)+.08*cos(z*3.)+1.*z);
}
float de(vec3 p){
    vec2 pth=path(p.z);
    float t = max(abs(p.x+pth.x),abs(p.y+pth.y));
    p = fract(p)-0.5;
    float d = 9e9;
    float s = 1.;
    for (int i = 1 ; i <= 10; i++) {
        float m = dot(p,p)*(.7 + pow(iAudio.x, 2.0) * 0.15);
        p/=(m + 1e-5);
        p.xy = fract(p.xy)-0.5;
        s *= m;
        p.xyz=p.yzx;
    }
    float f=1.0;
    d=min(d,(length(p)-f)*s);
    return smax(d,-t, 0.05);
}
float deSM(vec3 p){
    vec2 pth=path(p.z);
    float t = max(abs(p.x+pth.x),abs(p.y+pth.y));
    p = fract(p)-0.5;
    float d = 9e9;
    float s = 1.;
    for (int i = 1 ; i <= 5; i++) {
        float m = dot(p,p)*(.7 + pow(iAudio.x, 2.0) * 0.15);
        p/=(m + 1e-5);
        p.xy = fract(p.xy)-0.5;
        s *= m;
        p.xyz=p.yzx;
    }
    float f=1.0;
    d=min(d,(length(p)-f)*s);
    return smax(d,-t, 0.05);
}
float map(vec3 p){
    float d=de(p);
    p.xy+=path(p.z);
    d=max(d,.01-max(abs(p.x),abs(p.y)));
    p.y+=.01;
    d=min(d,max(abs(p.x)-.001,abs(p.y)-.001));
    return d;
}
const float FAR_DIST=50.0;
const float NEAR_DIST=.0001;
const int ITERATIONS=128;
vec3 trace(vec3 o, vec3 r){
    float t = 0.;
    vec3 p;
    float steps=0.;
    for (int i = 0; i < ITERATIONS; i++){
        p = o + r * t;
        float d = map(p);
        t += d*.5;
        if(d<NEAR_DIST){
        	break;
        }
        if(t>FAR_DIST){
    		return vec3(0.0);
    	}
        steps++;
    }
    vec2 eps = vec2(0.0, .0001);
    vec3 normal = normalize(vec3(
        map(p + eps.yxx) - map(p - eps.yxx),
        map(p + eps.xyx) - map(p - eps.xyx),
        map(p + eps.xxy) - map(p - eps.xxy)));
    float diffuse = max(0.0, dot(-normalize(r), normal)*.5+.4);
    //light in front of person
    //vec3 p2=vec3(-path((iTime+1.)/20.),(iTime+1.)/20.);
    //float diffuse = max(0.0, dot(-normalize(p-p2), normal));
    float specular = pow(diffuse, 32.0);
    //smooth color
    vec3 albedo = hsv2rgb(vec3(40.*deSM(p) + pow(iAudio.y, 2.0) * 0.8,1.,1.));
    //hard bands of color
    //vec3 albedo = hsv2rgb(vec3(.1*floor(de8xSM(p)*400.),1.,1.));
    return mix(albedo*(diffuse + specular),vec3(0.),steps/float(ITERATIONS));
}
mat3 setCamera( in vec3 ro, in vec3 ta, float cr ){
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv = normalize( cross(cu,cw) );
    return mat3( cu, cv, cw );
}
void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = 2.*(fragCoord/iResolution.xy)-1.;
    uv.x *= iResolution.x / iResolution.y;
    float time = iTime * (1.0 + pow(iAudio.w, 1.5) * 0.4);
    vec3 o = vec3(-path(time/20.),time/20.);
    vec3 ta = vec3(-path(.01+(time/20.)),.01+(time/20.));
    mat3 ca = setCamera( o, ta, 0.0 );
    //vec3 r = ca * normalize( vec3(uv.xy,1.5));
    vec2 nMouse = vec2(10.0*(iMouse.x/iResolution.x)-5.,3.0*((iMouse.y/iResolution.y)-.5));
    vec3 r;
    if(iMouse.x==0.&&iMouse.y==0.){
    	r = ca *  normalize( vec3(uv.xy,1.5));
    }else{
    	r = ca *  normalize( rotate(vec3(uv.xy,1.5),vec3(nMouse.x,nMouse.y,0.0)));
    }
    fragColor = vec4(trace(o, r),1.0);
}
void mainVR( out vec4 fragColor, in vec2 fragCoord, in vec3 fragRayOri, in vec3 fragRayDir ){
    float time = iTime * (1.0 + pow(iAudio.w, 1.5) * 0.4);
    vec3 o = (fragRayOri/160.)+vec3(-path(time/20.),time/20.);
    vec3 ta = (fragRayOri/160.)+vec3(-path(.01+(time/20.)),.01+(time/20.));
    mat3 ca = setCamera( o, ta, 0.0 );
    vec3 r = ca * fragRayDir;
    vec3 col=trace(o, r);
    fragColor = vec4(col,1.0);
}
`;
export default source;
