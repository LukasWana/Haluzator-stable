const source = `
/*
https://www.shadertoy.com/view/wcdGDX  dray playing with
https://www.shadertoy.com/view/Wf33Df  rzemyslawZaworski unpacking of
https://www.shadertoy.com/view/tfc3W2  diatribes playing with
https://www.shadertoy.com/view/wXjSRt  xor
*/ 

void mainImage(out vec4 fragColor, in vec2 fragCoord) 
{
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Audio-reactive time for overall speed
    float time = iTime * (0.5 + iAudio.w * 1.5);

    float depth = 0.0;
    fragColor = vec4(0.0);
    
    // Volumetric rendering loop
    for (int stepCount = 0; stepCount < 80; stepCount += 1) 
    {
        vec3 position = vec3(uv * depth, depth + time);
        
        float octave = 0.05;
        for (int i = 0; i < 5; i++)
        {
            position += 0.1 * cos(position.z + position.yzx * 0.02);
            
            float time_mult = (uv.y > 0.0 ? 0.02 : 2.0);
            float pos_mult = (uv.y > 0.0 ? 0.3 : 1.0);

            float noise_val = dot(sin(time * time_mult + position.z + position * octave * 16.0 * pos_mult), vec3(0.01));
            position += abs(noise_val) / octave;
            octave += octave;
        }

        float val = 0.03 + abs(2.0 - abs(position.y)) * 0.2;
        depth += val;
        
        // FIX: The previous accumulation factor was far too high, causing the output to saturate to pure white.
        // This has been scaled down dramatically to produce a visible image with proper brightness levels.
        fragColor += vec4(0.0002 / (val*val + 1e-6)); 
    }
    
    // Define softer, gradient-based color palettes
    // Sky: a gradient from a soft orange/pink horizon to a deep violet/blue zenith
    vec3 sky_horizon = vec3(1.0, 0.6, 0.4) + iAudio.y * vec3(-0.1, 0.1, 0.2); // Mids make horizon cooler
    vec3 sky_zenith = vec3(0.1, 0.0, 0.3);
    vec4 skycolor = vec4(mix(sky_horizon, sky_zenith, smoothstep(0.0, 0.8, uv.y)), 1.0);

    // Water: a darker, bluer reflection of the sky
    vec3 water_horizon = vec3(0.3, 0.2, 0.4);
    vec3 water_deep = vec3(0.0, 0.05, 0.15) + iAudio.x * vec3(0.1, 0.05, 0.0); // Bass adds a reddish tint to deep water
    vec4 watercolor = vec4(mix(water_horizon, water_deep, smoothstep(0.0, -0.8, uv.y)), 1.0);
    
    // Smoother transition between sky and water
    float blendFactor = smoothstep(0.1, -0.1, uv.y);
    fragColor *= mix(skycolor, watercolor, blendFactor);
    
    // Sun logic remains the same as it's already soft
    float t_sun = time / 5.0;
    vec2 sun_pos = vec2(-cos(t_sun), max(0.0, sin(t_sun) / 2.0));
    float sun_dist = length(uv - sun_pos);

    float sun_softness = 25.0 - iAudio.x * 15.0; 
    float sun_flicker = 1.0 + iAudio.z * 0.2;
    float sun_brightness = 1.5 + iAudio.w * 2.0;
    float intensity = exp(-sun_dist * sun_dist * sun_softness) * sun_brightness * sun_flicker;

    vec3 color_center = vec3(1.0, 1.0, 0.95);
    vec3 color_edge = vec3(1.0, 0.75, 0.2);
    float color_mix_factor = smoothstep(0.0, 0.1, sun_dist); 
    vec3 final_sun_color = mix(color_center, color_edge, color_mix_factor);

    fragColor.rgb += final_sun_color * intensity;

    // Softer Tonemapping
    fragColor.rgb *= (0.5 + iAudio.w); // Final brightness control
    fragColor.rgb = pow(fragColor.rgb, vec3(0.75)); // Gentle curve to soften highlights
    fragColor.rgb = clamp(fragColor.rgb, 0.0, 1.0);

    // Stars logic remains the same
    bool stars_bool = abs(1.0 - 2.0 * fract( 23.2346 * fract( dot(uv+uv*uv,vec2(312.1315,4982.35))) ) )  > 0.999;
    float stars = float(stars_bool) * (0.5 + iAudio.z * 1.5);
    
    float sun_mask_radius = 0.12;
    float sun_mask_for_stars = 1.0 - smoothstep(sun_mask_radius + 0.05, sun_mask_radius, sun_dist);
    stars *= sun_mask_for_stars;

    // Only show stars in the sky area
    if (uv.y > 0.0) {
        fragColor.rgb += stars;
    }
}
`;
export default source;