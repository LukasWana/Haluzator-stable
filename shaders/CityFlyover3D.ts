// v souboru /shaders/shape/CityFlyover3D.ts

const source = `
// Hash funkce pro procedurální generování
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Noise funkce
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Výška budovy na dané pozici
float getBuildingHeight(vec2 cell) {
    float h = hash(cell);
    float building_type = hash(cell + vec2(123.45, 67.89));
    
    if (building_type < 0.4) {
        return 0.3 + h * 1.5; // Nízké budovy
    } else if (building_type < 0.8) {
        return 1.5 + h * 3.0; // Střední budovy
    } else {
        return 4.0 + h * 6.0; // Vyšší budovy
    }
}

// SDF pro celé město
float citySDF(vec3 p) {
    float ground = p.y; // Země na y=0
    
    vec2 city_pos = p.xz;
    vec2 cell = floor(city_pos);
    
    float min_dist = 1000.0;
    
    // Kontrola okolních buněk (3x3 grid)
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            vec2 check_cell = cell + vec2(float(i), float(j));
            
            float height = getBuildingHeight(check_cell);
            // Audio reaktivita
            float audio_height_mult = 1.0 + iAudio.x * (0.5 * hash(check_cell + 99.9));
            height *= audio_height_mult;

            float audio_y_pulsate = sin(hash(check_cell) * 6.28 + iTime * (2.0 + hash(check_cell)*2.0) ) * iAudio.y * 0.3;

            float building_size = 0.3 + hash(check_cell + vec2(456.78)) * 0.15;
            
            // Vytvoření SDF pro budovu (box) v buňce
            vec3 box_center = vec3(check_cell.x + 0.5, height / 2.0 + audio_y_pulsate, check_cell.y + 0.5);
            vec3 half_extents = vec3(building_size, height / 2.0, building_size);
            
            vec3 p_local = p - box_center;
            vec3 d_vec = abs(p_local) - half_extents;
            float dist = length(max(d_vec, vec3(0.0))) + min(max(d_vec.x, max(d_vec.y, d_vec.z)), 0.0);
            
            min_dist = min(min_dist, dist);
        }
    }
    
    return min(ground, min_dist);
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    int steps = int(mix(50.0, 150.0, u_quality));
    
    for (int i = 0; i < 200; i++) {
        if (i >= steps) break;
        
        vec3 p = ro + t * rd;
        float d = citySDF(p);
        
        if (d < 0.01) break;
        if (t > 200.0) break;
        
        t += d * 0.8;
    }
    
    return t;
}

// Normála pro lighting
vec3 getNormal(vec3 p) {
    float eps = 0.01;
    return normalize(vec3(
        citySDF(p + vec3(eps, 0, 0)) - citySDF(p - vec3(eps, 0, 0)),
        citySDF(p + vec3(0, eps, 0)) - citySDF(p - vec3(0, eps, 0)),
        citySDF(p + vec3(0, 0, eps)) - citySDF(p - vec3(0, 0, eps))
    ));
}

// Získání barvy budovy
vec3 getBuildingColor(vec3 pos) {
    vec2 cell = floor(pos.xz);
    float building_hash = hash(cell);
    
    if (building_hash < 0.2) {
        return vec3(0.3, 0.5, 0.8) + vec3(0.2) * noise(pos.xz * 10.0);
    } else if (building_hash < 0.5) {
        return vec3(0.4, 0.45, 0.5) + vec3(0.1) * noise(pos.xz * 15.0);
    } else if (building_hash < 0.8) {
        return vec3(0.6, 0.3, 0.2) + vec3(0.15) * noise(pos.xz * 8.0);
    } else {
        vec3 base = vec3(0.2, 0.2, 0.25);
        float neon = sin(pos.y * 2.0 + iTime * 2.0) * 0.5 + 0.5;
        return base + vec3(0.0, 0.3, 0.6) * neon * iAudio.z;
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    float flight_speed = 5.0 + iAudio.w * 3.0;
    vec3 camera_pos = vec3(
        sin(iTime * 0.2) * 10.0,
        12.0 + sin(iTime * 0.3) * 3.0 + iAudio.x * 5.0,
        iTime * flight_speed
    );
    
    vec3 target = camera_pos + vec3(
        sin(iTime * 0.15) * 5.0,
        -8.0,
        10.0
    );
    
    vec3 forward = normalize(target - camera_pos);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = cross(right, forward);
    
    vec3 ray_dir = normalize(forward + uv.x * right + uv.y * up);
    
    camera_pos += vec3(
        sin(iTime * 5.0) * iAudio.y * 0.5,
        sin(iTime * 7.0) * iAudio.z * 0.3,
        0.0
    );
    
    float t = raymarch(camera_pos, ray_dir);
    
    vec3 color = vec3(0.0);
    
    if (t < 200.0) {
        vec3 hit_pos = camera_pos + t * ray_dir;
        vec3 normal = getNormal(hit_pos);
        
        if (hit_pos.y < 0.1) {
            float road_pattern = step(0.48, fract(hit_pos.x * 0.1)) * step(0.48, fract(hit_pos.z * 0.1));
            color = mix(vec3(0.3, 0.3, 0.35), vec3(0.8, 0.8, 0.2), road_pattern);
            
            float street_lights = sin(hit_pos.x * 0.5) * sin(hit_pos.z * 0.5);
            color += vec3(1.0, 0.7, 0.3) * max(0.0, street_lights) * iAudio.w * 0.5;
        } else {
            color = getBuildingColor(hit_pos);
            
            // Vylepšená okna, která se zobrazují na stěnách
            vec2 window_uv;
            if (abs(normal.x) > abs(normal.y) && abs(normal.x) > abs(normal.z)) {
                window_uv = hit_pos.yz; // stěna X
            } else if (abs(normal.y) > abs(normal.z)) {
                window_uv = hit_pos.xz; // střecha Y
            } else {
                window_uv = hit_pos.xy; // stěna Z
            }

            vec2 window_coord = fract(window_uv * 5.0);
            float window_on_x = step(0.2, window_coord.x) * (1.0 - step(0.8, window_coord.x));
            float window_on_y = step(0.2, window_coord.y) * (1.0 - step(0.8, window_coord.y));
            float window = window_on_x * window_on_y;
            
            float window_light = window * (0.3 + sin(hash(floor(window_uv * 5.0)) * 6.28 + iTime) * 0.7);
            window_light *= (0.5 + iAudio.z * 1.5);
            
            color += vec3(1.0, 0.9, 0.6) * window_light;
        }
        
        vec3 light_dir = normalize(vec3(0.5, 1.0, 0.3));
        float diff = max(0.2, dot(normal, light_dir));
        color *= diff;
        
        float fog = exp(-t * 0.01);
        vec3 fog_color = vec3(0.6, 0.7, 0.9) + vec3(0.3, 0.2, 0.1) * (sin(iTime * 0.5) * 0.5 + 0.5);
        color = mix(fog_color, color, fog);
    } else {
        float sky_gradient = 1.0 - uv.y * 0.5;
        color = vec3(0.4, 0.6, 0.9) * sky_gradient;
        
        float clouds = noise(uv * 3.0 + iTime * 0.1) * noise(uv * 6.0 + iTime * 0.05);
        clouds = smoothstep(0.4, 0.8, clouds);
        color = mix(color, vec3(0.9, 0.95, 1.0), clouds * 0.7);
    }
    
    color += sin(iTime * 20.0) * iAudio.x * vec3(0.1, 0.05, 0.0);
    color = pow(color, vec3(0.8 + iAudio.y * 0.2));
    
    fragColor = vec4(color, 1.0);
}
`;

export default source;
