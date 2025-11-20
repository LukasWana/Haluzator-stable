const source = `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Vytvoření radiálních paprsků s audio reaktivitou
    float rays = 12.0 + iAudio.y * 8.0;
    float rayAngle = angle * rays;
    
    // Organické deformace s časem a audio
    float time = iTime * (0.5 + iAudio.w);
    float warp1 = sin(rayAngle + time) * 0.3;
    float warp2 = sin(rayAngle * 2.0 - time * 1.5) * 0.2;
    float warp3 = sin(rayAngle * 3.0 + time * 0.8) * 0.15;
    
    // Kombinace deformací
    float totalWarp = warp1 + warp2 + warp3;
    totalWarp += sin(radius * 8.0 + time) * 0.1;
    totalWarp += iAudio.x * sin(rayAngle * 4.0) * 0.4;
    
    // Vytvoření koncentrických kruhů
    float rings = radius * (6.0 + iAudio.z * 4.0) + totalWarp;
    float pattern = sin(rings);
    
    // Přidání komplexnějších detailů
    float detail1 = sin(rayAngle * 2.0 + radius * 15.0 - time * 2.0);
    float detail2 = sin(rayAngle * 3.0 - radius * 10.0 + time);
    pattern += detail1 * 0.3 + detail2 * 0.2;
    
    // Audio reaktivní modulace
    pattern += iAudio.y * sin(rayAngle * 5.0) * 0.3;
    pattern += iAudio.z * sin(radius * 20.0) * 0.2;
    
    // Vytvoření ostrých přechodů jako na obrázku
    float smoothPattern = smoothstep(-0.2, 0.2, pattern);
    
    // Přidání menších bublin/teček
    float bubbles = 0.0;
    for(int i = 0; i < 8; i++) {
        float fi = float(i);
        vec2 bubblePos = vec2(
            sin(fi * 2.0 + time * 0.3) * (0.5 + sin(fi) * 0.3),
            cos(fi * 2.5 - time * 0.2) * (0.4 + cos(fi * 1.5) * 0.2)
        );
        float bubbleDist = length(uv - bubblePos);
        float bubbleSize = 0.08 + iAudio.x * 0.04 + sin(fi * 3.0 + time) * 0.02;
        bubbles += smoothstep(bubbleSize, bubbleSize - 0.02, bubbleDist);
    }
    
    // Kombinace hlavního vzoru a bublin
    float finalPattern = max(smoothPattern, bubbles);
    
    // Barevné schéma - černobílé jako na obrázku
    vec3 color = vec3(finalPattern);
    
    // Jemné zabarvení ovlivněné audio
    vec3 tint = 0.05 * vec3(iAudio.x, iAudio.y * 0.5, iAudio.z * 0.3);
    color += tint;
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;