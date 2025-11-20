
const source = `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // Perspective transformation for infinite path
    vec2 p = uv;
    p.y += 0.3;
    
    // Create perspective effect
    float depth = 1.0 / (p.y + 0.1 + 1e-5);
    vec2 pathUV = vec2(p.x * depth, -iTime * 0.5 + depth * 0.5);
    
    vec3 col = vec3(0.02, 0.01, 0.05);
    
    // Fractal background
    vec2 fractalUV = uv * 3.0;
    for(int i = 0; i < 4; i++) {
        fractalUV = abs(fractalUV) / (dot(fractalUV, fractalUV) + 1e-5) - vec2(0.5 + sin(iTime * 0.3) * 0.1, 0.7);
        fractalUV *= 1.3 + iAudio.y * 0.5;
    }
    float fractal = length(fractalUV);
    col += vec3(0.1, 0.05, 0.2) * (1.0 - smoothstep(0.0, 2.0, fractal));
    
    // Path glow
    float pathGlow = exp(-abs(pathUV.x) * 4.0) * 0.5;
    col += vec3(0.3, 0.1, 0.6) * pathGlow;
    
    // Small mushrooms along the path
    vec2 mushroomGrid = pathUV * vec2(4.0, 8.0);
    vec2 mushroomID = floor(mushroomGrid);
    vec2 mushroomUV = fract(mushroomGrid) - 0.5;
    
    // Random offset for mushrooms
    float randOffset = sin(mushroomID.x * 12.34 + mushroomID.y * 56.78) * 0.5 + 0.5;
    mushroomUV.x += (randOffset - 0.5) * 0.3;
    
    // Only grow mushrooms near the path
    if(abs(pathUV.x) < 0.8) {
        float mushroomSize = 0.1 + randOffset * 0.1 + iAudio.x * 0.05;
        
        // Mushroom stem
        float stem = 1.0 - smoothstep(0.0, 0.02, abs(mushroomUV.x));
        stem *= 1.0 - smoothstep(0.0, mushroomSize * 2.0, mushroomUV.y + mushroomSize);
        stem *= smoothstep(-mushroomSize * 2.0, -mushroomSize, mushroomUV.y + mushroomSize);
        
        // Mushroom cap
        float capY = mushroomUV.y - mushroomSize * 0.3;
        float cap = length(vec2(mushroomUV.x, capY * 2.0));
        cap = 1.0 - smoothstep(mushroomSize * 0.7, mushroomSize * 0.9, cap);
        cap *= smoothstep(-mushroomSize * 0.5, 0.0, capY);
        
        // Mushroom colors
        vec3 stemColor = vec3(0.8, 0.7, 0.6);
        vec3 capColor = mix(vec3(0.8, 0.2, 0.1), vec3(0.9, 0.4, 0.2), randOffset);
        
        // Audio reactivity - mushrooms pulse with bass
        float pulse = 1.0 + pow(iAudio.x, 2.0) * 0.5;
        stemColor *= pulse;
        capColor *= pulse;
        
        col = mix(col, stemColor, stem);
        col = mix(col, capColor, cap);
    }
    
    // Main central mushroom growing towards infinity
    vec2 centerUV = uv;
    centerUV.y += sin(iTime * 0.5) * 0.1;
    
    // Large mushroom in center
    float mainMushroomScale = 2.0 + iAudio.w * 0.5;
    vec2 mainUV = centerUV / mainMushroomScale;
    
    // Main stem
    float mainStem = 1.0 - smoothstep(0.0, 0.05, abs(mainUV.x));
    mainStem *= 1.0 - smoothstep(0.0, 0.6, mainUV.y + 0.3);
    mainStem *= smoothstep(-0.6, -0.2, mainUV.y + 0.3);
    
    // Main cap
    float mainCapY = mainUV.y - 0.1;
    float mainCap = length(vec2(mainUV.x, mainCapY * 1.5));
    mainCap = 1.0 - smoothstep(0.15, 0.2, mainCap);
    mainCap *= smoothstep(-0.15, 0.0, mainCapY);
    
    // Spots on main cap
    vec2 spotUV = mainUV * 8.0;
    float spots = sin(spotUV.x) * sin(spotUV.y);
    spots = smoothstep(0.5, 0.8, spots);
    
    // Main mushroom colors with audio reactivity
    vec3 mainStemColor = vec3(0.9, 0.8, 0.7) * (1.0 + iAudio.z * 0.3);
    vec3 mainCapColor = mix(vec3(0.9, 0.2, 0.1), vec3(1.0, 0.6, 0.2), sin(iTime * 0.2) * 0.5 + 0.5);
    vec3 spotColor = vec3(1.0, 0.9, 0.8);
    
    // Apply main mushroom
    col = mix(col, mainStemColor, mainStem);
    col = mix(col, mainCapColor, mainCap);
    col = mix(col, spotColor, mainCap * spots * 0.8);
    
    // Atmospheric glow
    float centerGlow = 1.0 - length(uv * 0.5);
    centerGlow = pow(centerGlow, 3.0);
    col += vec3(0.2, 0.1, 0.4) * centerGlow * (0.5 + iAudio.w * 0.5);
    
    // Vignette
    float vignette = 1.0 - length(uv * 0.6);
    col *= vignette;
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;
