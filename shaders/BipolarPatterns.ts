
const source = `
// Created by David Crooks
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// Adapted for Shader Sequencer with audio reactivity.

#define TWO_PI 6.283185
#define PI 3.14159265359


struct Ray {
   vec3 origin;
   vec3 direction;
};

struct LightColor {
	vec3 diffuse;
	vec3 specular;
};
    
    
struct Material {
    LightColor  color;
    float shininess;
};
    
struct MapValue {
    float 	  signedDistance;
    Material  material;
};

struct Trace {
    float    dist;
    vec3     p;
    Ray 	 ray;
    Material material;
};
    

struct PointLight {
    vec3 position;
    LightColor color;
};
    
struct DirectionalLight {
    vec3 direction;
    LightColor color;
};
    
PointLight  light1,light2,light3;
DirectionalLight dirLight;

Material blackMat,whiteMat,bluishMat,yellowMat,oscMat,tableMat,tableDarkMat;


    
vec3 rayPoint(Ray r,float t) {
 	return r.origin +  t*r.direction;
}

float bipolarPattern(vec2 p){
    
    float time = iTime;
    
    float scale = ( 40.0+20.0*sin(0.3*time));
    
    //rotate
    float rotationrate = 0.1 * (1.0 + iAudio.w * 2.0); // Audio-reactive speed
    float s = sin(rotationrate*time);
    float c = cos(rotationrate*time);
    p = mat2(c,s,-s,c)*p;
       
    //bipolar coordinates (sigma, tau)
    float a = min(10.0,2.0*time);
    float alpha = a*a - dot(p,p);
    float beta = a*a + dot(p,p);
    float sigma = atan( 2.0*a*p.y ,alpha);
    float tau = 0.5*log((beta + 2.0*a*p.x)/(beta - 2.0*a*p.x));

    //do something funky in bipolar coordinates
    // Audio-reactive frequency
    float freq = 20.0 + iAudio.y * 20.0;
    float rate = 3.0;
    vec2 osc = 0.5*(1.0 + cos(freq*vec2(sigma,tau) + rate*time)) ;
    
    //the factor of cosh suppreses the oscilations near the poles where they would otherwise go a bit crazy.
    float cosh = exp(-tau) + exp(tau);
    float bipolarOscillations  = (osc.x + osc.y)/cosh;
    
    return bipolarOscillations;
}

   	

float smoothmin(float a, float b, float k)
{
    float x = exp(-k * a);
    float y = exp(-k * b);
    return (a * x + b * y) / (x + y);
}

float smoothmax(float a, float b, float k)
{
    return smoothmin( a,  b, -k);
}


MapValue intersectObjects( MapValue d1, MapValue d2 )
{
    float sd = smoothmax(d1.signedDistance,d2.signedDistance,3.0);
    MapValue mv;
  	mv.material = d1.material;
  	mv.signedDistance = sd;
    return mv;  
}

MapValue subtractObjects( MapValue d1, MapValue d2 )
{
    d1.signedDistance = -d1.signedDistance;
    return intersectObjects(  d1, d2 );
}


void setMaterials() {
    float t  = iTime;
    float s = 0.4*(1.0+sin(t));
    vec3 specular = vec3(0.3); 
    float shininess = 16.0;
    blackMat = Material(LightColor(vec3(0.0,0.0,0.01),vec3(0.1,0.1,0.1)) ,35.0);
    whiteMat = Material(LightColor(0.75*vec3(1.0,1.0,0.9),0.3*vec3(1.0,1.0,0.9)) ,shininess );

}

/////////////////////////   SDFs   ///////////////////////////////////

MapValue plane(vec3 p, vec3 origin, vec3 normal , Material m ){
  vec3 a = p - origin;
  MapValue mv;
  mv.material = m;
  mv.signedDistance = dot(a,normal);
  return mv;
}

MapValue vortex( vec3 p ,vec3 c, Material m)
{
  MapValue mv;
  mv.material = m;
  mv.signedDistance = length( p.xz - c.xz )  - exp(p.y + c.y);
  return mv;
}

vec2 orbit( float r, float t){
    return r*vec2(sin(t),cos(t));
}


//////////////////////////////////////////////////////////////////////
/////////////////////// Map The Scene ////////////////////////////////

MapValue map(vec3 p){
    
   	float t  = iTime;
    
    // Mids affect surface waviness
    float h = (0.13 + iAudio.y * 0.15) * bipolarPattern(10.0*p.xz);
    
	p = vec3(p.x,p.y + h,p.z);
    
    vec2 o = orbit(0.5,1.34*iTime);
   
    // Bass affects vortex depth and wobble
    MapValue vtx  = vortex(p  ,vec3(o.x,-0.2 + (0.2 + iAudio.x * 0.3) * sin(0.45*iTime), o.y), whiteMat);
    
    MapValue pl = plane(p,vec3(0.0,-0.0,0.0),vec3(0.0,1.0,0.0) ,whiteMat);
        
	return subtractObjects( vtx,pl);
    
}


//////////////////////////////////////////////////////////////////////
/////////////////////// Raymarching ///////////////////////////////////

vec3 calculateNormal(vec3 p) {
    float epsilon = 0.001;
    
    vec3 normal = vec3(
                       map(p +vec3(epsilon,0,0)).signedDistance - map(p - vec3(epsilon,0,0)).signedDistance,
                       map(p +vec3(0,epsilon,0)).signedDistance - map(p - vec3(0,epsilon,0)).signedDistance,
                       map(p +vec3(0,0,epsilon)).signedDistance - map(p - vec3(0,0,epsilon)).signedDistance
                       );
    
    return normalize(normal);
}

Trace traceRay(in Ray ray, float maxDistance) {
    float dist = 0.01;
    float presicion = 0.002;
	vec3 p;
    MapValue mv;
    
    // Use integer loop for compatibility
    for(int i=0; i<64; i++){
    	p = rayPoint(ray,dist);
       	mv = map(p);
        dist += 0.5*mv.signedDistance;
        if(abs(mv.signedDistance) < presicion || dist>maxDistance) break;
       
    }
    
    return Trace(dist,p,ray,mv.material);
}

float castShadow(in Ray ray, float dist){
    Trace trace = traceRay(ray,dist);
    float maxDist = min(1.0,dist);
    float result = trace.dist/maxDist;
   
    return clamp(result,0.0,1.0);
}

Ray cameraRay(vec3 viewPoint, vec3 lookAtCenter, vec2 p , float d){ 
	vec3 v = normalize(lookAtCenter -viewPoint);
    
    vec3 n1 = cross(v,vec3(0.0,1.0,0.0));
    vec3 n2 = cross(n1,v);  
        
    vec3 lookAtPoint = lookAtCenter + d*(p.y*n2 + p.x*n1);
                                    
    Ray ray;
                    
    ray.origin = viewPoint;
   	ray.direction =  normalize(lookAtPoint - viewPoint);
    
    return ray;
}

/////////////////////// Lighting ////////////////////////////////

vec3 diffuseLighting(in Trace trace, vec3 normal, vec3 lightColor,vec3 lightDir){
    float lambertian = max(dot(lightDir,normal), 0.0);
  	return  lambertian * trace.material.color.diffuse * lightColor; 
}

vec3 specularLighting(in Trace trace, vec3 normal, vec3 lightColor,vec3 lightDir){
    //blinn-phong
    //https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_shading_model
    vec3 viewDir = -trace.ray.direction;

    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(halfDir, normal), 0.0);
    float specular = pow(specAngle, trace.material.shininess);
    
    return specular * trace.material.color.specular * lightColor;
}


vec3 pointLighting(in Trace trace, vec3 normal, PointLight light){
    vec3 lightDir = light.position - trace.p;
	float d = length(lightDir);
  	lightDir = normalize(lightDir);
   
  	vec3 color =  diffuseLighting(trace, normal, light.color.diffuse, lightDir);
    
    color += specularLighting(trace, normal, light.color.specular, lightDir);

    float  attenuation = 1.0 / (1.0 +  0.1 * d * d);
    float shadow = castShadow(Ray(trace.p,lightDir),d);
    color *= attenuation*shadow;
    return  color;
}

vec3 directionalLighting(Trace trace, vec3 normal, DirectionalLight light){

    vec3 color =  diffuseLighting(trace, normal, light.color.diffuse, light.direction);
    
    color += specularLighting(trace, normal, light.color.specular, light.direction);
    
    float shadow = castShadow(Ray(trace.p,light.direction),3.0);
    color *= shadow;
    return  color;
}


void setLights(){
  	float  time = iTime;
    vec3 specular = vec3(1.0);
    vec3 yellowish = vec3(1.0,1.0,0.7);
    vec3 blueish = vec3(0.7,0.7,1.0);
    
  	light1 = PointLight(vec3(cos(1.3*time),1.0,sin(1.3*time)),LightColor( yellowish,specular));
  	light2 = PointLight(vec3(0.7*cos(1.6*time),1.1+ 0.35*sin(0.8*time),0.7*sin(1.6*time)),LightColor(0.6*yellowish,specular)); 
    // Treble makes blue light pulse
    light3 = PointLight(vec3(1.5*cos(1.6*time),0.15+ 0.15*sin(2.9*time),1.5*sin(1.6*time)),LightColor(0.5*blueish * (1.0 + iAudio.z * 2.0),specular));
    dirLight = DirectionalLight(normalize(vec3(0.0,1.0,0.0)),LightColor(vec3(0.1),vec3(0.5)));
} 


vec3 lighting(in Trace trace, vec3 normal){
    vec3 color = vec3(0.0,0.0,0.2);//ambient color, dark blue
        
	color += pointLighting(trace, normal,light1);
	color += pointLighting(trace, normal,light2) ;
    color += pointLighting(trace, normal,light3) ;
	color += directionalLighting(trace, normal,dirLight);
    
    return color;
}

vec3 render(vec2 p){
    vec3 viewpoint = vec3(-1.0,1.3,-1.3);
    
    vec3 lookAt = vec3(0.0,-0.1,0.0);
    
  	Ray ray = cameraRay(viewpoint,lookAt,p,2.3);
   	Trace trace = traceRay(ray,6.0);
    
	vec3 normal = calculateNormal(trace.p);
    vec3 color = lighting(trace,normal);
    
   	return color;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 p = (fragCoord - 0.5*iResolution.xy) / iResolution.y;
    
  	setLights();
    setMaterials();
    
   	vec3 colorLinear =  render(p);
    float screenGamma = 2.2;
    vec3 colorGammaCorrected = pow(colorLinear, vec3(1.0/screenGamma));
	fragColor = vec4(colorGammaCorrected,1.0);
}
`;
export default source;