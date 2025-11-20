const source = `
// "Enchanted Forest"
// Adapted from a shader by an anonymous author.
// Enhanced with audio reactivity and GLSL compatibility fixes for Shader Sequencer.

const float pi = 3.14159265;


#define FAR 50.0

const float fov = 35.0;

const int FLOOR = 0;
const int TREES = 1;
const int LEAVES = 2;
const int MUSHROOMS = 3;
const int FLIES = 4;

float time;

// --- MISSING HELPER FUNCTIONS (ADDED FOR COMPATIBILITY) ---
float hash12(vec2 p) {
    float h = dot(p,vec2(127.1,311.7));
    return fract(sin(h)*43758.5453123);
}

vec2 hash22(vec2 p) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return fract(sin(p)*43758.5453);
}

vec3 hash32(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy + p3.yzz)*p3.zyx);
}

float noise12(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float noise12(vec2 p, float t) {
    return noise12(p + vec2(t*0.1, -t*0.1));
}
// --- END HELPER FUNCTIONS ---


/*** TREES ***/
// Closest tree coordinates in .xy channels, radius in .z channel
vec3 closestTree(vec2 p) {
    p.x = p.x > 0. ? max(p.x,2.5) : min(p.x,-2.5);
    p = 2.*floor(.5*p + 0.5);
    // Radius
    float r = .1+.3*hash12(p);
    p += hash22(p)-.5;
    return vec3(p,r);
}
// Branches
// Intersection of two gyroidish surfaces, thickened
float sdBranches(vec3 p) {
    p.y += .3;
    float d = length(vec2(
        abs(.1*dot(sin(4.*p),cos(4.*p.yzx))),
        abs(.1*dot(sin(4.8*p),cos(4.*p)))));
    d += .05*(2.-p.y)-.012;
    return d;
}

// Trunks
float sdTrees(vec3 p) {
    vec3 c = closestTree(p.xz);
    float r = c.z;
    r += .01*(sin(5.*p.y+c.x)+cos(7.8*p.y+c.y));
    r += .02*p.y*p.y*p.y;
    c.xy += .05*(sin(3.*p.y+c.y)+cos(4.7*p.y-c.x));
    // Bass (x) affects bark texture
    float bark_noise = .03 * noise12(vec2(60,20)*p.xy) * (1.0 + iAudio.x * 2.0);
    float t = .5*min(length(p.xz-c.xy)-r+bark_noise,.7);
    float b = sdBranches(p);
    return min(t,b);
}

/*** FIREFLIES ***/
// Grid of fireflies, rotated, translated and randomly perturbed
// j can take values 0 or 1, yielding two different grids
float sdFlies(vec3 p, float j) {
    vec3 c;
    const mat2 m = mat2(.8,.6,-.6,.8);
    vec2 shift = .3*mix(vec2(.5,-1.8),vec2(-.3,-.4),j)*time;
    vec2 id = floor(m*(p.xz-shift)); 
    c.xz = mat2(.8,-.6,.6,.8)*(id+.5)+shift;
    c.y = .5+hash12(id+123.4)+.2*noise12(id,time);
    return length(p-c)-.01;
}
float sdFlies(vec3 p) {
    // Two grids of fireflies moving in different directions
    return min(sdFlies(.5*p,0.),sdFlies(.45*p,1.));
}
// The same functions, also providing the closst firefly's color
float sdFlies(vec3 p, float j, out vec3 color) {
    vec3 c;
    const mat2 m = mat2(.8,.6,-.6,.8);
    vec2 shift = .3*mix(vec2(.5,-1.8),vec2(-.3,-.4),j)*time;
    vec2 id = floor(m*(p.xz-shift)); 
    // Treble (z) makes fireflies brighter and more red/orange
    color = vec3(1,.5,.2)+.4*hash32(id)-.2;
    color.r += iAudio.z * 0.5;
    color.g += iAudio.z * 0.2;
    c.xz = mat2(.8,-.6,.6,.8)*(id+.5)+shift;
    c.y = .5+hash12(id+123.4)+.2*noise12(id,time);
    return length(p-c)-.01;
}
float sdFlies(vec3 p, out vec3 color) {
    vec3 c1,c2;
    float d1 = sdFlies(.5*p,0.,c1);
    float d2 = sdFlies(.45*p,1.,c2);
    color = d1<d2 ? c1 : c2;
    return min(d1,d2);
}

/*** FLOOR ***/
float floorHeight(vec2 p) {
    vec3 c = closestTree(p);
    p -= c.xy;
    // Elevation at tree positions
    return .3*exp(-.1*dot(p,p)/(c.z*c.z));
}
float sdFloor(vec3 p) {
    return p.y-floorHeight(p.xz);
}


/*** MUSHROOMS ***/
vec3 closestMushroom(vec3 p) {
    vec3 c = p;
    float shift = c.x > 0. ? 1.5 : -1.5;
    c.x = c.x > 0. ? max(c.x-shift,0.) : min(c.x-shift,0.);
    c.xz = 2.*floor(.5*c.xz + 0.5);
    c.x += shift;
    c.xz += hash22(c.xz)-.5;
    c.y = floorHeight(p.xz);
    return c;
}
float sdMushrooms(vec3 p) {
    p -= closestMushroom(p);
    p.y *= .5;
    
    float head = max(length(p)-.2,.1-p.y);
    float r = .02+.02*sin(20.*p.y);
    float foot = max(length(p.xz)-r,p.y-.11);
    return min(foot,head);
}

// The same functions, also providing the closest mushroom's color
vec3 closestMushroom(vec3 p, out vec3 color) {
    vec3 c = p;
    float shift = c.x > 0. ? 1.5 : -1.5;
    c.x = c.x > 0. ? max(c.x-shift,0.) : min(c.x-shift,0.);
    c.xz = 2.*floor(.5*c.xz + 0.5);
    c.x += shift;
    // Mids (y) make mushrooms glow with a cyan tint
    color = vec3(.7,.8,.9)+vec3(.1,.2,.1)*(2.*hash32(c.xz)-1.) + iAudio.y * vec3(-0.1, 0.2, 0.4);
    c.xz += hash22(c.xz)-.5;
    c.y = floorHeight(p.xz);
    return c;
}
float sdMushrooms(vec3 p, out vec3 color) {
    p -= closestMushroom(p, color);
    p.y *= .5;
    
    float head = max(length(p)-.2,.1-p.y);
    float r = .02+.02*sin(20.*p.y);
    float foot = max(length(p.xz)-r,p.y-.11);
    return min(foot,head);
}



float sd(vec3 p, out int id) {
    float d, minD = 1e6;
    
    // Floor
    d = sdFloor(p);
    if(d<minD) {
        id = FLOOR;
        minD = d;
    }

    d = sdTrees(p);
    if(d<minD) {
        id = TREES;
        minD = d;
    }

    d = sdBranches(p);
    if(d<minD) {
        id = LEAVES;
        minD = d;
    }
    d = sdMushrooms(p);
    if(d<minD) {
        id = MUSHROOMS;
        minD = d;
    }
    d = sdFlies(p);
    if(d<minD) {
        id = FLIES;
        minD = d;
    }
    return minD;
}

float march(vec3 start, vec3 dir, out int id, out vec3 glow) {
	float total = 0., d;
    float epsilon = 0.2/iResolution.y;
    glow = vec3(0);
    vec3 color;
    const int MAX_STEPS = 100;
    int STEPS = int(mix(30.0, 100.0, u_quality));
    for(int i=0; i < MAX_STEPS; i++) {
        if (i >= STEPS) break;
        vec3 p = start + total*dir; 
        d = sd(p,id);
        if(d<epsilon*total || total>FAR) break;
        float dm = sdMushrooms(p,color);
        glow += color*exp(-10.*dm);
        dm = sdFlies(p,color);
        glow += color*exp(-18.*dm);
        total += d;
    }
    if(total>FAR) id = -100;
    return total;
}

vec3 rayColor(vec3 start, vec3 dir) {
    int id;
    vec3 glow;
    
    float d = march(start, dir, id, glow);
    vec3 color = .1*glow;
    
    vec3 p = start + d * dir;
    vec3 c;
    
    if(id==MUSHROOMS) {
        closestMushroom(p,c);
        color += c;
    } else if(id==FLIES) {
        sdFlies(p,c);
       color += c;
    }
    return mix(vec3(.01,.1,.3),color,exp(-.05*d));
}

mat3 setupCamera(vec3 forward, vec3 up) {
 	vec3 w = -normalize(forward);
    vec3 u = normalize(cross(up, w));
    vec3 v = cross(w, u);
    
    return mat3(u,v,w);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Overall volume (w) controls travel speed
    time = iTime * (0.5 + iAudio.w * 1.0);
    vec3 forward = vec3(0,0,-1);
    vec3 cam = vec3(0,1,-.5*time);
    cam.y += .02*pow(abs(cos(4.*time)),3.);

    if(iMouse.z>0.0) {
        float a = pi*(2.*iMouse.x/iResolution.x-1.);
        float b = .5*pi*(-.2+1.2*iMouse.y/iResolution.y);
        forward = vec3(sin(a)*cos(b),sin(b),-cos(a)*cos(b));
    }
    
    mat3 m = setupCamera(forward, vec3(0,1,0));
    
    vec3 color = vec3(0.0);

    vec2 uv = 2.0*(fragCoord - 0.5 * iResolution.xy)/iResolution.y;
    vec3 pix = vec3(tan(0.5*fov*0.01745)*uv,-1.0);
    vec3 dir = normalize(m*pix);

    // To avoid banding artifacts
    cam += .5*hash12(fragCoord)*dir;
    
    color = rayColor(cam, dir);
     
    // Gamma
    color = sqrt(color);
    
    // Vignette
    uv = fragCoord.xy / iResolution.xy;
    uv *=  1. - uv.yx;
    color *= pow(uv.x*uv.y * 15.0, 0.25);
        
    fragColor = vec4(color,1.0);
}
`;
export default source;