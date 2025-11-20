const source = `
// GLKITTY 2016 - Adapted for Shader Sequencer

// --- Noise Functions (from Star Nursery) ---
mat3 m = mat3( 0.30,  0.90,  0.60,
              -0.90,  0.36, -0.48,
              -0.60, -0.48,  0.34 );

float hash( float n ) {
    return fract(sin(n)*43758.5453123);
}

float noise( in vec3 x ) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+0.0), hash(n+1.0),f.x),
                   mix( hash(n+57.0), hash(n+58.0),f.x),f.y),
               mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                   mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
}

float fbm( vec3 p ) {
    float f;
    f  = 1.600*noise( p ); p = m*p*2.02;
    f += 0.3500*noise( p ); p = m*p*2.33;
    f += 0.2250*noise( p ); p = m*p*2.03;
    f += 0.0825*noise( p ); p = m*p*2.01;
    return f;
}
// --- End Noise Functions ---


vec3 rotateY(vec3 v, float t){
    float cost = cos(t); float sint = sin(t);
    return vec3(v.x * cost + v.z * sint, v.y, -v.x * sint + v.z * cost);
}

float smin( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float map(vec3 p){
    // spheres
    float noise_val = fbm(p * 2.0); // Use FBM instead of original noise
    float d = (-1.0 * length(p) + 3.0) + 1.5 * noise_val;    
    d = min(d, (length(p) - 1.5) + 1.5 * noise_val );  
    
    // links
    float m = 1.5; float s = 0.03;    
    d = smin(d, max( abs(p.x)-s, abs(p.y+p.z*0.2)-0.07 ) , m);          
    d = smin(d, max( abs(p.z)-s, abs(p.x+p.y/2.0)-0.07 ), m );    
    d = smin(d, max( abs(p.z-p.y*0.4)-s, abs(p.x-p.y*0.2)-0.07 ), m );    
    d = smin(d, max( abs(p.z*0.2-p.y)-s, abs(p.x+p.z)-0.07 ), m );    
    d = smin(d, max( abs(p.z*-0.2+p.y)-s, abs(-p.x+p.z)-0.07 ), m );
    
    return d;
}

// --- New Normal Calculation Function ---
vec3 normal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(
        vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        )
    );
}

// --- New Tonemapping Function ---
vec3 reinhardTonemap(vec3 color) {
    return color / (color + vec3(1.0));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{    
    // Ray from UV
	vec2 uv = fragCoord.xy * 2.0 / iResolution.xy - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    vec3 ray = normalize(vec3(1.0*uv.x, 1.0*uv.y, 1.0));
    
    // Final color accumulator
    vec3 color = vec3(0.0);    
    
    const int MAX_RAYS = 96;
    int rayCount = int(mix(32.0, 96.0, u_quality));
    
    // Raymarching
    float t = 0.0;
    for (int r = 1; r <= MAX_RAYS; r++)
    {
        if (r > rayCount) break;

        // --- Original Position and Deformation Logic for Ray Marching ---
        vec3 p = vec3(0,0,-3.0) + ray * t;        
        float time = iTime * (0.33 + iAudio.w * 0.5);
       	p = rotateY(p, time);
        
    	float mask = max(0.0,(1.0-length(p/3.0)));
        float deform_time = iTime * (0.5 + iAudio.y * 1.0);
    	p = rotateY(p, mask * sin(deform_time) * (1.2 + iAudio.x * 1.5));        
        p.y += sin(deform_time + p.x) * mask * (0.5 + iAudio.x * 0.5);
        p *= 1.1 + (sin(deform_time) * mask * 0.3);

        // --- Raymarching step ---
        float d = map(p);   
        
        // --- Shading on hit ---
        if(d < 0.01 || r == rayCount)
        {                 
            vec3 p_hit_base = vec3(0,0,-3.0) + ray * t;
            
            // --- Re-apply transformations to get accurate hit position for shading ---
            vec3 p_hit = rotateY(p_hit_base, time);
            float mask_hit = max(0.0,(1.0-length(p_hit/3.0)));
            p_hit = rotateY(p_hit, mask_hit * sin(deform_time) * (1.2 + iAudio.x * 1.5));
            p_hit.y += sin(deform_time + p_hit.x) * mask_hit * (0.5 + iAudio.x * 0.5);
            p_hit *= 1.1 + (sin(deform_time) * mask_hit * 0.3);

            // --- New Lighting Model ---
            vec3 n = normal(p_hit);
            
            // Define Albedo (base color) using original coloring logic for texture
            float color_mask = max(0.0,(1.0-length(p_hit/2.0)));
            color_mask *= abs(sin(iTime * -1.5 + length(p_hit) + p_hit.x) - (0.2 + iAudio.z * 0.3));
            float color_noise = fbm(p_hit * 4.0);
            
            vec3 base_color = vec3(0.1, 0.5, 0.6); // Base organic color
            vec3 highlight_color = vec3(0.1 + iAudio.y * 0.4, 1.0, 0.8); // Highlight color
            vec3 albedo = mix(base_color, highlight_color, max(0.0, color_noise * 2.0 - 1.0) * color_mask);

            // Ambient Light + Ambient Occlusion (approximated)
            float iter_ao = float(r) / float(rayCount);
            float ao = 1.0 - (1.0 - iter_ao) * (1.0 - iter_ao);
            vec3 ambient = vec3(0.05, 0.1, 0.15) * ao;

            // Diffuse & Specular Lighting
            vec3 lightDir = normalize(vec3(0.5, 0.5, -1.0));
            float diff = max(dot(n, lightDir), 0.0);
            
            vec3 viewDir = -ray;
            vec3 reflectDir = reflect(-lightDir, n);
            float spec_power = 32.0;
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), spec_power);

            // Combine lighting components
            color = ambient + albedo * diff * 1.2 + vec3(0.8) * spec;
            
            // Add a subtle fresnel effect for a bio-luminescent feel
            float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
            color += fresnel * highlight_color * 0.5 * (1.0 + iAudio.z);

            break; // Exit loop on hit
        }
        
        // march along ray
        t += d * 0.5;        
    }
    
    // --- Post-Processing ---
    // Tonemapping to prevent blown out highlights
    color = reinhardTonemap(color);
    
    // Vignetting effect
    vec2 v_uv = fragCoord.xy / iResolution.xy;
    v_uv *=  1.0 - v_uv.yx; 
    float vig = v_uv.x * v_uv.y * 20.0;    
    vig = pow(vig, 0.25);        
    color *= vig;
    
    // Final color adjustment (subtle)
    color.y *= 0.95;
    color.x *= 1.1 + iAudio.x * 0.2;
    
	fragColor = vec4(color, 1.0);
}
`;
export default source;