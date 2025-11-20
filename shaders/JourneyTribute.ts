
const source = `
float hash( float n ) { return fract(sin(n)*43758.5453123); }
float hash( vec2 p ) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h)*43758.5453123);
}

float interpolate(float a, float b, float x) {
    float f = x*x*(3.0-2.0*x);
    return a * (1.0 - f) + b * f;
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    float x1 = interpolate(a, b, f.x);
    float x2 = interpolate(c, d, f.x);

    return interpolate(x1, x2, f.y);
}

float fbm(vec2 p, float time, float audioInfluence) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 4; i++) {
        vec2 warpedP = p * frequency + time * vec2(0.1, 0.05) * audioInfluence;
        float n = valueNoise(warpedP);
        total += n * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
        p += vec2(sin(time * 0.03), cos(time * 0.04)) * 0.5;
    }
    return total;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // The uniforms iTime, iResolution, iAudio are provided by the wrapper.
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    float time = iTime * (0.5 + iAudio.w * 0.5);

    vec3 skyColorTop = mix(vec3(0.1, 0.2, 0.4), vec3(0.4, 0.5, 0.7), 0.5 + sin(iTime * 0.1) * 0.5);
    vec3 skyColorBottom = mix(vec3(0.4, 0.6, 0.8), vec3(0.8, 0.9, 1.0), 0.5 + cos(iTime * 0.15) * 0.5);

    vec3 skyGradient = mix(skyColorBottom, skyColorTop, (uv.y + 1.0) * 0.5);

    float audioInfluence = 1.0 + iAudio.w * 1.5 + iAudio.y * 1.0;

    vec2 p = uv * 2.0;
    p += vec2(sin(time * 0.3) * 0.2, cos(time * 0.2) * 0.2);
    float cloudDensity = fbm(p * 2.0, time, audioInfluence);

    float cloudThreshold = 0.5 - iAudio.x * 0.2;
    cloudThreshold = clamp(cloudThreshold, 0.2, 0.6);
    cloudDensity = smoothstep(cloudThreshold, cloudThreshold + 0.3, cloudDensity);

    vec3 cloudColor = vec3(1.0);
    cloudColor = mix(cloudColor, vec3(0.8, 0.9, 1.0), sin(iTime * 0.2) * 0.5 + 0.5);
    cloudColor = mix(cloudColor, vec3(1.0, 0.9, 0.8), iAudio.z * 0.5);

    float finalCloudAlpha = cloudDensity * (0.7 + iAudio.z * 0.5);
    vec3 finalColor = mix(skyGradient, cloudColor, finalCloudAlpha);

    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;