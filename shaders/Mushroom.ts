
const source = `
float pi = 3.14159265359;
float sdSphere( vec3 p, float r, float shift) {
    return length(vec3(p.x, p.y-shift, p.z))-r;
}

float sdCircle(vec2 p, float r) {
    float angle = atan(p.y, p.x)+sin(length(p)*pi+0.5);
    // Mids (y) affect the ripple intensity on the cylinder base
    float ripple = 0.5 + 0.5 * sin(angle * (30.0 + iAudio.y * 15.0));
    return length(p) - r * ripple;
}
float sdCylinder(vec3 p, float r, float h) {
    // Bass (x) affects the sine wave deformation
    p.y+=sin(length(p.xz)* (3.0 + iAudio.x * 2.0))/(4.0 + iAudio.x * 2.0);
    p.y*=2.5;
    p.y-=0.7;
    p.y*=0.2;
    p.xz*=0.91+(p.y*3.0);
    float d2d = sdCircle(p.xz, r);
    float dz = abs(p.y) - h;
    float k = 0.1;
    return (length(max(vec2(d2d, dz), 0.0)) - k)/8.0;
}
float sdVerticalCapsule(vec3 p, float r, float h) {
  float A = 0.04; 
  // Highs (z) affect the jitter on the mushroom stem
  float time_z_mod = iTime * (1.0 + iAudio.z * 10.0);
  p.x+=sin(p.y*2.0+time_z_mod*2.0)*A;
  p.z+=cos(p.y*4.0+time_z_mod*2.0)*A-A;
  p.xz*=1.0+cos(p.y*8.0+0.0)*A;
  p.y+=2.5;
  p.y -= clamp( p.y, 0.0, h );
  return length( p ) - r;
}
float sdCutHollowSphere( vec3 p, float r, float h, float t )
{
  p.y=-p.y/1.125;
  p.xz*=1.0-cos(p.y*5.0-1.0)*0.2;
  float w = sqrt(r*r-h*h);
  vec2 q = vec2( length(p.xz), p.y );  
  return ((h*q.x<w*q.y) ? length(q-vec2(w,h)) : abs(length(q)-r) ) - t;
}
float opSmoothUnion( float d1, float d2, float k )
{
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

// Mushroom
float SDF(vec3 p, float time) {
  p.y-=1.0;
  float head = opSmoothUnion(sdCutHollowSphere(p,0.5,0.2,0.004), sdSphere(p,0.065, 0.55), 0.15); 
  float spore = sdCylinder(p, 0.3, 0.01);
  float body = sdVerticalCapsule(p, 0.04, 2.5);
  float fullhead = opSmoothUnion(head,spore,0.02);
  return opSmoothUnion(fullhead, body, 0.1);
}

vec3 calculateNormal(vec3 p, float time) {
    const float eps = 0.001;
    vec3 n = vec3(
        SDF(p + vec3(eps, 0, 0), time) - SDF(p - vec3(eps, 0, 0), time),
        SDF(p + vec3(0, eps, 0), time) - SDF(p - vec3(0, eps, 0), time),
        SDF(p + vec3(0, 0, eps), time) - SDF(p - vec3(0, 0, eps), time)
    );
    return normalize(n);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    
    vec3 col = vec3(0);
    // Overall volume (w) affects time speed
    float time = (iTime+pi/5.0) * (0.8 + iAudio.w * 1.2);
    
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // Camera setup
    vec3 ro = vec3(0, 0, -8.0);
    vec3 rd = normalize(vec3(uv*0.25, 1.0));

    // Rotation
    vec2 mouse = iMouse.xy/iResolution.xy+0.5;
    mouse.y=-mouse.y;
    if (mouse.y<0.0)mouse.x=-mouse.x;
    if (mouse.x<0.0)mouse.y=-mouse.y;
    float rotX = -(mouse.y - 0.5) * 3.14159;
    
    float rotY = (mouse.x - 0.5) * 6.28318;
    if (length(iMouse.xy)<50.0) {
        // Mids (y) affect auto-rotation speed
        rotY=(iTime+pi/5.0) * (1.0 + iAudio.y * 0.5);
        rotX=pi/6.0;
    }
    mat3 rx = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(rotX), -sin(rotX),
        0.0, sin(rotX), cos(rotX)
    );
    mat3 ry = mat3(
        cos(rotY), 0.0, sin(rotY),
        0.0, 1.0, 0.0,
        -sin(rotY), 0.0, cos(rotY)
    );
    mat3 rotation = rx * ry;
    ro = rotation * ro;
    rd = rotation * rd;
    
    // Raymarching
    float t = 0.0;
    vec3 p;
    bool hit = false;
    for(int i = 0; i < 256; i++) { // Reduced from 768 for performance
        p = ro + rd * t;
        float d = SDF(p, time);
        if(d < 0.001) {
            hit = true;
            break;
        }
        if(t > 20.0) break;
        t += d*0.5;
    }
    
    if(hit) {
        // Calculate normal for lighting
        vec3 normal = calculateNormal(p, time);
        
        // Lighting setup
        vec3 lightDir = normalize(vec3(0.5, 1.0, -0.5));
        float diff = max(dot(normal, lightDir), 0.0);
        float ambient = 0.3;
        float lighting = ambient + diff;
        
        // Calculate colors
        col.x *= 3.0*(1.5-length(p.y-2.5/10.0))*(1.75-length(p.xz));
        col.xz -= 1.0*abs(p.y*0.75);
        col = clamp((normal+1.0)/2.0, 0., 1.);
        
        // Apply lighting
        col *= lighting*0.5+0.5;
        
        // Add some specular highlights
        vec3 viewDir = normalize(ro - p);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        col += vec3(spec * 0.5);
        
        // Animation & audio-reactive color
        vec3 n=normal;
        p*=10.0; n*=10.0;
        float color_time = time * (3.0 + iAudio.y * 5.0);
        col*=vec3(
           (pow(sin(p.x),2.0) + pow(sin(n.z),2.0) + 1.0*pow(sin(n.y+color_time),2.0) )*0.5+0.5
        );
        col.rb += iAudio.x * 0.2; // Bass adds red/blue tint
        
        // Result
        col = clamp(col,0.,1.);
        fragColor = vec4(col, 1.0);
        
    } else {
        // Background color pulses with overall volume
        fragColor = vec4(vec3(0.02, 0.0, 0.05) * (0.5 + iAudio.w * 1.5),1.0);
    }
}
`;
export default source;