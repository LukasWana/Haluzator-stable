// Original Mandelbulb shader, adapted and made audio-reactive.
// FIX: Wrap raw GLSL in a const and export it to make this file a module.
const source = `
#define MAX_DIST 100.0
#define SRF 0.001

mat2 rotate(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// Mandelbulb distance function with audio-reactive power
float mandelbulb(vec3 pos, float power) {
    // Periodic repetition of space to create a wrapping effect
    vec3 C = vec3(4.0); // Size of the repeating cell
    pos = mod(pos + 0.5*C, C) - 0.5*C;

    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    // Low iteration count for performance
    for (int i = 0; i < 7; i++) {
        r = length(z);
        if (r > 4.0) break; // Increased bailout radius for higher powers

        // Convert to spherical coordinates
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        // Scale and rotate
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;

        // Convert back to Cartesian and add original position
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += pos;
    }
    return 0.5 * log(r) * r / dr;
}

// Raymarching function
float raymarch(vec3 ro, vec3 rd, float power) {
    float dO = 0.0;
    const int MAX_STEPS_QUALITY = 120;
    for (int i = 0; i < MAX_STEPS_QUALITY; i++) {
        vec3 p = ro + rd * dO;
        float dS = mandelbulb(p, power);
        dO += dS;
        if (dO > MAX_DIST || abs(dS) < SRF) break;
    }
    return dO;
}

// Normal calculation
vec3 getNormal(vec3 p, float power) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        mandelbulb(p + e.xyy, power) - mandelbulb(p - e.xyy, power),
        mandelbulb(p + e.yxy, power) - mandelbulb(p - e.yxy, power),
        mandelbulb(p + e.yyx, power) - mandelbulb(p - e.yyx, power)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // --- Audio-reactive parameters ---
    float power = 8.0 + iAudio.x * 6.0; // Bass warps the fractal shape
    float cam_speed = 0.8 + iAudio.w * 0.5; // Overall volume controls speed
    vec3 light_color = vec3(1.0, 0.8, 0.6);
    vec3 color_a = vec3(0.8, 0.1, 0.1) + iAudio.y * vec3(-0.2, 0.3, 0.3); // Mids shift color
    vec3 color_b = vec3(0.1, 0.1, 0.8);
    float glow_intensity = pow(iAudio.z, 2.0) * 1.5; // Highs create glow
    
    // --- Background Color ---
    vec3 bg_color = vec3(0.05, 0.05, 0.15);

    // --- Camera setup ---
    float camTime = iTime * cam_speed;
    vec3 ro = vec3(0.0, 0.0, -2.8 + sin(camTime * 0.1) * 0.5);
    vec3 rd = normalize(vec3(uv, 1.5));

    rd.xz *= rotate(camTime * 0.08);
    rd.xy *= rotate(sin(camTime * 0.1) * 0.1);

    // --- Raymarching ---
    float d = raymarch(ro, rd, power);

    // --- Shading ---
    vec3 col;
    if (d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 normal = getNormal(p, power);

        // Lighting
        vec3 light_pos = vec3(2.0 * sin(camTime * 0.5), 2.0, -3.0);
        vec3 light_dir = normalize(light_pos - p);
        float diffuse = max(dot(normal, light_dir), 0.0);
        
        vec3 reflected = reflect(rd, normal);
        float specular = pow(max(dot(reflected, light_dir), 0.0), 32.0);

        // Coloring based on position and normals
        float color_mix = 0.5 + 0.5 * sin(p.y * 3.0 + camTime);
        vec3 material_color = mix(color_a, color_b, color_mix);

        // Increased ambient light component for better visibility in shadows
        col = material_color * (diffuse * 0.8 + 0.2) + light_color * specular * 0.8;

        // Add glow based on high frequencies
        col += material_color * glow_intensity * pow(max(0.0, dot(-rd, normal)), 3.0);

        // Fog fades to the background color and starts further away
        col = mix(col, bg_color, smoothstep(5.0, MAX_DIST * 0.7, d));

    } else {
        // If the raymarch misses, draw the background color
        col = bg_color;
    }

    // --- Post-processing ---
    col = pow(col, vec3(0.4545)); // Gamma correction
    col *= 1.0 - dot(uv, uv) * 0.3; // Vignette

    fragColor = vec4(col, 1.0);
}
`;
export default source;