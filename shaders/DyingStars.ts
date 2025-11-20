

const source = `
#define PI 3.14159265359
#define NUM_ORBS 60
#define NUM_REFLECTIONS 4

float hash(float n) { 
    return fract(sin(n) * 43758.5453123); 
}

// A 2D hash function.
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
}

// A standard 2D value noise function.
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float smoothPulse(float x, float sharpness) {
    return pow((cos(x + sin(x)) + 1.0) * 0.5, sharpness);
}

float energyBounce(float t, float decay) {
    float height = 1.0;
    float y = 1.0 - t * t;
    
    for(int i = 1; i < 5; i++) {
        height *= decay;
        t -= sqrt(height) * 2.0;
        y = max(y, height - t * t);
    }
    
    return clamp(y, 0.0, 1.0);
}

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Camera {
    vec3 position;
    vec3 forward;
    vec3 right;
    vec3 up;
    Ray ray;
};

void setupCamera(vec2 uv, vec3 pos, vec3 target, float zoom, out Camera cam) {
    cam.position = pos;
    cam.forward = normalize(target - pos);
    cam.right = normalize(cross(vec3(0.0, 1.0, 0.0), cam.forward));
    cam.up = cross(cam.forward, cam.right);
    
    vec3 center = cam.position + cam.forward * zoom;
    vec3 screenPoint = center + cam.right * uv.x + cam.up * uv.y;
    
    cam.ray.origin = cam.position;
    cam.ray.direction = normalize(screenPoint - cam.position);
}

vec3 closestPointOnRay(Ray r, vec3 point) {
    return r.origin + max(0.0, dot(point - r.origin, r.direction)) * r.direction;
}

vec3 intersectPlane(Ray r, vec3 planeNormal, float planeDistance) {
    vec3 planePoint = planeNormal * planeDistance;
    float t = dot(planePoint - r.origin, planeNormal) / (dot(r.direction, planeNormal) + 1e-6);
    return r.origin + max(0.0, t) * r.direction;
}

vec4 generateOrb(Ray r, int index) {
    float seed = float(index) * 0.1 + 1.0;
    
    // Audio-reactive parameters
    float timeScale = iTime * (0.3 + iAudio.w * 0.4);
    float bassResponse = pow(iAudio.x, 1.5) * 3.0;
    float midResponse = iAudio.y * 2.0;
    float trebleResponse = iAudio.z * 1.5;
    
    // Generate pseudo-random values
    vec4 randVec = vec4(
        hash(seed), 
        hash(seed + 1.0), 
        hash(seed + 2.0), 
        hash(seed + 3.0)
    ) * 2.0 - 1.0;
    
    // Orbital motion with audio influence
    float orbitalSpeed = 0.5 + randVec.w * 0.3 + midResponse * 0.2;
    float orbitalRadius = 8.0 + randVec.x * 4.0 + bassResponse;
    
    // Life cycle timing
    float lifeTime = fract(timeScale * orbitalSpeed + seed) * 3.0;
    float fadeCurve = smoothstep(3.0, 1.0, lifeTime);
    
    // Bouncing height motion
    float bounceHeight = energyBounce(lifeTime, 0.6 + seed * 0.2) * (6.0 + bassResponse * 2.0);
    bounceHeight += sin(timeScale * 3.0 + seed * 10.0) * (0.5 + trebleResponse * 0.3);
    
    // 3D position calculation
    float angle = timeScale * orbitalSpeed + seed * PI * 2.0;
    vec3 orbPosition = vec3(
        cos(angle) * orbitalRadius + randVec.y * 2.0,
        bounceHeight + 0.5,
        sin(angle) * orbitalRadius + randVec.z * 2.0
    );
    
    // Ray-to-point distance calculation
    vec3 closestPoint = closestPointOnRay(r, orbPosition);
    float distance = length(closestPoint - orbPosition);
    
    // Size and brightness
    float orbSize = 0.8 + seed * 0.4 + bassResponse * 0.3;
    orbSize *= fadeCurve;
    
    float brightness = orbSize * orbSize / (distance * distance + orbSize * orbSize * 0.01);
    
    // Dynamic color palette
    float colorPhase = timeScale * 0.2 + seed + midResponse * 0.5;
    vec3 coolTone = 0.5 + 0.5 * cos(colorPhase + vec3(0.0, 2.0, 4.0));
    vec3 hotTone = 0.5 + 0.5 * cos(colorPhase * 1.3 + vec3(1.0, 3.0, 5.0));
    
    vec3 finalColor = mix(coolTone, hotTone, fadeCurve + trebleResponse * 0.3);
    // Reduced overall brightness and audio response to prevent blowout.
    finalColor *= brightness * (0.4 + iAudio.w * 0.4);
    
    return vec4(finalColor, fadeCurve);
}

vec4 calculateOrbs(Ray r) {
    vec4 totalColor = vec4(0.0);
    
    for(int i = 0; i < NUM_ORBS; i++) {
        vec4 orb = generateOrb(r, i);
        totalColor.rgb += orb.rgb;
        totalColor.a = max(totalColor.a, orb.a);
    }
    
    return totalColor;
}

vec4 calculateGround(Ray r) {
    vec4 groundColor = vec4(0.0);
    
    // Smooth fade for reflections near the horizon to prevent instability
    float horizon_fade = smoothstep(0.0, 0.1, -r.direction.y);
    if(horizon_fade <= 0.0) return groundColor;
    
    vec3 intersectionPoint = intersectPlane(r, vec3(0.0, 1.0, 0.0), 0.0);
    
    // Ground texture
    float groundNoise = noise(intersectionPoint.xz * 0.5) * 0.1 + 0.05;
    groundColor.rgb = vec3(0.02, 0.01, 0.03) + groundNoise;
    
    // Lighting from orbs
    for(int i = 0; i < NUM_ORBS; i++) {
        vec4 orbData = generateOrb(Ray(vec3(0.0), vec3(0.0, 1.0, 0.0)), i);
        float seed = float(i) * 0.1 + 1.0;
        
        // Reconstruct orb position (simplified)
        float timeScale = iTime * (0.3 + iAudio.w * 0.4);
        float orbitalSpeed = 0.5 + hash(seed + 3.0) * 0.3 + iAudio.y * 0.2;
        float orbitalRadius = 8.0 + (hash(seed) * 2.0 - 1.0) * 4.0 + pow(iAudio.x, 1.5) * 3.0;

        float angle = timeScale * orbitalSpeed + seed * PI * 2.0;
        
        vec3 orbPos = vec3(
            cos(angle) * orbitalRadius,
            (energyBounce(fract(timeScale * orbitalSpeed + seed) * 3.0, 0.6 + seed * 0.2) * (6.0 + pow(iAudio.x, 1.5) * 3.0 * 2.0)) + 0.5,
            sin(angle) * orbitalRadius
        );
        
        vec3 lightDir = orbPos - intersectionPoint;
        float lightDist = length(lightDir);
        lightDir /= lightDist;
        
        float lambert = clamp(dot(lightDir, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        float attenuation = 1.0 / (lightDist * lightDist * 0.1 + 1.0);
        
        vec3 orbColor = 0.5 + 0.5 * cos(timeScale * 0.2 + seed + vec3(0.0, 2.0, 4.0));
        groundColor.rgb += orbColor * lambert * attenuation * orbData.a * 0.1;
        
        // Reflection
        vec3 reflectDir = reflect(r.direction, vec3(0.0, 1.0, 0.0));
        float specular = pow(clamp(dot(reflectDir, lightDir), 0.0, 1.0), 50.0);
        float fresnel = pow(1.0 - clamp(dot(-r.direction, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 3.0);
        
        // Reduced specular reflection intensity.
        groundColor.rgb += orbColor * specular * attenuation * orbData.a * fresnel * 0.15;
    }
    
    return groundColor * horizon_fade;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // Dynamic camera movement
    float cameraTime = iTime * 0.4;
    float cameraHeight = mix(4.0, 0.5, smoothPulse(cameraTime * 0.3, 2.0 + iAudio.x));
    
    float camAngle = cameraTime * 0.2 + iAudio.y * 0.5;
    vec3 cameraPos = vec3(
        cos(camAngle) * 12.0,
        cameraHeight + sin(iTime * 0.8) * 1.0,
        sin(camAngle) * 12.0
    );
    
    vec3 target = vec3(0.0, 1.0 + iAudio.w * 2.0, 0.0);
    
    Camera cam;
    setupCamera(uv, cameraPos, target, 0.8, cam);
    
    // Render scene
    vec4 finalColor = vec4(0.0);
    
    // Background gradient - made it darker
    float skyGradient = pow(clamp(uv.y + 0.3, 0.0, 1.0), 0.5);
    finalColor.rgb = mix(vec3(0.01, 0.01, 0.03), vec3(0.02, 0.01, 0.04), skyGradient);
    
    // Add ground
    finalColor.rgb += calculateGround(cam.ray).rgb;
    
    // Add orbs
    finalColor.rgb += calculateOrbs(cam.ray).rgb;
    
    // Atmospheric effects - reduced intensity
    float centerGlow = exp(-length(uv * 0.8)) * (0.2 + iAudio.w * 0.2);
    finalColor.rgb += vec3(0.1, 0.05, 0.2) * centerGlow;
    
    // Organic Mask
    float edge_dist = length(uv);
    // Use noise to create an irregular, animated edge
    float noise_val = noise(uv * 2.5 + iTime * 0.15);
    // The mask fades the image out towards the edges with a noisy boundary
    float mask = 1.0 - smoothstep(0.7, 1.2, edge_dist + noise_val * 0.4);
    finalColor.rgb *= mask;
    
    // Tone mapping to handle high brightness values and prevent blowout
    finalColor.rgb = finalColor.rgb / (finalColor.rgb + vec3(1.0));
    
    // Gamma correction for contrast
    finalColor.rgb = pow(finalColor.rgb, vec3(1.5));
    finalColor.rgb = clamp(finalColor.rgb, 0.0, 1.0);

    fragColor = vec4(finalColor.rgb, 1.0);
}
`;
export default source;