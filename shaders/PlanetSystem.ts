
const source = `
const float MAX_DEPTH = 3.0;
const float START_PLANET = 18.0;

vec2 Rotate(vec2 pos, float angle) {
	return vec2(
        pos.x * cos(angle) - pos.y * sin(angle),
        pos.x * sin(angle) + pos.y * cos(angle)
    );
}

float Cubic(float a, float b, float t) {
    float blendFactor = t * t * (3.0 - 2.0 * t);
    return mix(a, b, blendFactor);
}

vec3 HueToRgb(float h) {
    vec3 rgb = 2.0 - abs(6.0 * h - vec3(3, 2, 4));
    rgb.r = 1.0 - rgb.r;
    return clamp(rgb, 0.0, 1.0);
}

vec3 HsvToRgb(vec3 hsv) {
    vec3 rgb = HueToRgb(hsv.x);
    return ((rgb - 1.0) * hsv.y + 1.0) * hsv.z;
}

// Gradient noise functions courtesy Inigo Q
vec3 hash( vec3 p )
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise( in vec3 p )
{
    vec3 i = floor( p );
    vec3 f = fract( p );
	
	vec3 u = f*f*(3.0-2.0*f);

    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}

float Rand(vec2 pos) {
    return fract(sin(dot(pos.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float Rand(float pos) {
    return Rand(vec2(pos));
}

float SphereDistance(vec3 localPos, float radius) {
	return length(localPos) - radius;
}

float SceneDistance(vec3 pos, out float layer) {
    if (pos.x < 0.0) {
        return 1.0;
    }
    
    float planetNumber = floor((pos.x) / 2.0) + START_PLANET;
    
    vec3 planetPos = pos;
    planetPos.x = mod(planetPos.x, 2.0) - 1.0;
    float rotationSpeed = mix(-1.0, 1.0, fract(planetNumber / 2.3));
    planetPos.xz = Rotate(planetPos.xz, rotationSpeed * iTime * (1.0 + iAudio.x * 2.0));
    
    float terrainDetail = mix(0.1, 5.5, Rand(planetNumber + 0.16));
    terrainDetail *= (1.0 + iAudio.z * 1.5);
    float layerHeight = mix(0.005, 0.05, Rand(planetNumber + 0.55));
    float layerCount = floor(mix(3.5, 20.5, Rand(planetNumber + 0.36)));
    float noiseValue = 0.5 * noise((normalize(planetPos) + planetNumber) * terrainDetail) + 0.5;
    layer = floor(noiseValue * layerCount);
	
	float baseSize = mix(0.2, 0.4, Rand(planetNumber + 0.28));
    float d1 = SphereDistance(planetPos, baseSize + (layer - 1.0) * layerHeight);
    float d2 = SphereDistance(planetPos, baseSize + layer * layerHeight);
    
    float layerTransition = smoothstep(0.0, 0.3, fract(noiseValue * layerCount) + 0.06);
    return mix(d1, d2, layerTransition);
}

float SceneDistance(vec3 pos) {
    float dummy;
    return SceneDistance(pos, dummy);
}

float RayMarch(vec3 startPos, vec3 dir) {
	float depth = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 pos = startPos + dir * depth;
        float dist = SceneDistance(pos);
        if (dist < 0.0001) {
        	return depth;
        }
        depth += 0.6 * dist;
        if (depth >= MAX_DEPTH) {
            return MAX_DEPTH;
        }
    }
    return MAX_DEPTH;
}

vec3 SceneNormal(vec3 pos) {
	const float DX = 0.004;
	const vec3 dx = vec3(DX, 0.0, 0.0);
    const vec3 dy = vec3(0.0, DX, 0.0);
    const vec3 dz = vec3(0.0, 0.0, DX);
    return normalize(vec3(
        SceneDistance(pos + dx) - SceneDistance(pos - dx),
        SceneDistance(pos + dy) - SceneDistance(pos - dy),
        SceneDistance(pos + dz) - SceneDistance(pos - dz)
    ));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	const float FOV = radians(45.0);
    float time = iTime * (1.0 + iAudio.w * 1.5);
    vec3 eyePos = vec3(0.5 * time - 1.0, 0.0, -2.0);
    vec2 xy = (2.0 * fragCoord - iResolution.xy) * 0.5;
    vec3 rayDir = normalize(vec3(xy, 1.0 / tan(0.5 * FOV) * 0.5 * iResolution.y));
    vec3 lightDir = normalize(vec3(0.5, 0.8, -1.0));
   
    float depth = RayMarch(eyePos, rayDir);
    if (depth < MAX_DEPTH) {
        
        vec3 pos = eyePos + rayDir * depth;
        float layer;
        vec3 normal = SceneNormal(pos);
        SceneDistance(pos, layer);
        
        float planetNumber = floor((pos.x) / 2.0) + START_PLANET;
        
        float baseHue = Rand(planetNumber + 1.72);
        baseHue = fract(baseHue + iAudio.y * 0.5);
        float hueStep = mix(0.02, 0.15, pow(Rand(planetNumber + 0.492), 2.0));
        
        float baseSat = pow(Rand(planetNumber + 0.195), 0.2);
        float satStep = mix(-0.2, 0.2, Rand(planetNumber + 0.777));
        
        float baseVal = mix(0.5, 1.0, pow(Rand(planetNumber + 0.888), 0.3));
        float valStep = mix(0.0, 0.2, Rand(planetNumber + 0.992));
        
        vec3 color = HsvToRgb(
            vec3(fract(baseHue + layer * hueStep), 
	             clamp(baseSat + layer * satStep, 0.0, 1.0), 
                 0.3 + 0.7 * fract(baseVal + layer * valStep)));
        float diffuse = 2.0 * clamp(dot(lightDir, normal), 0.0, 1.0);
    	fragColor = vec4(diffuse * color, 1.0);
    }
    else {
        float gradient = abs(2.0 * (fragCoord.y / iResolution.y) - 1.0);
        float skyTime = iTime * (1.0 + iAudio.w);
        vec3 skyColor = HsvToRgb(vec3(fract(0.015 * skyTime + iAudio.y * 0.2) + 0.5, 1.0, 0.1 * gradient));
        fragColor = vec4(skyColor, 1.0);
    }
}
`;
export default source;