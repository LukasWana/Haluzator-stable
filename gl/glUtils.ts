// New function to adapt shader code from common online sources
export const adaptShaderCode = (shaderCode) => {
    // FIX: Add a check to handle invalid (e.g., undefined) shaderCode to prevent crashes.
    if (typeof shaderCode !== 'string' || !shaderCode) {
        console.warn("adaptShaderCode received invalid shader code.");
        return ''; // Return empty string to prevent crash
    }

    // A more robust regex to find main functions with any arguments inside the parentheses.
    const mainFunctionRegex = /void\s+main\s*\(([^)]*)\)/;
    
    // Check if it's a Shadertoy/GLSL Sandbox-style shader by looking for main()
    const isStandalone = mainFunctionRegex.test(shaderCode);
    
    if (!isStandalone) {
        // Assume it's already in the app's format (with mainImage)
        return shaderCode;
    }

    let adaptedCode = shaderCode;
    
    // 1. Rename main() to mainImage() and adapt signature
    adaptedCode = adaptedCode.replace(
        mainFunctionRegex,
        "void mainImage(out vec4 fragColor, in vec2 fragCoord)"
    );

    // 2. Remove uniform declarations that are provided by the app's wrapper
    adaptedCode = adaptedCode.replace(/uniform\s+vec2\s+resolution\s*;/g, '');
    adaptedCode = adaptedCode.replace(/uniform\s+vec2\s+mouse\s*;/g, '');
    adaptedCode = adaptedCode.replace(/uniform\s+float\s+time\s*;/g, '');

    // 3. Replace uniform and built-in variable names. Use word boundaries (\b) to be safe.
    adaptedCode = adaptedCode.replace(/\bresolution\b/g, 'iResolution.xy');
    adaptedCode = adaptedCode.replace(/\bRENDERSIZE\b/g, 'iResolution.xy');
    adaptedCode = adaptedCode.replace(/\bmouse\b/g, 'iMouse.xy');
    adaptedCode = adaptedCode.replace(/\btime\b/g, 'iTime');
    adaptedCode = adaptedCode.replace(/\bTIME\b/g, 'iTime');
    adaptedCode = adaptedCode.replace(/\bgl_FragColor\b/g, 'fragColor');
    // The wrapper passes gl_FragCoord.xy as the `fragCoord` parameter to mainImage.
    adaptedCode = adaptedCode.replace(/\bgl_FragCoord\b/g, 'fragCoord');


    // 4. Remove common standalone directives that are handled by the main template
    // Use [\s\S] to match across newlines
    adaptedCode = adaptedCode.replace(/#ifdef GL_ES[\s\S]*?#endif/g, '');
    adaptedCode = adaptedCode.replace(/precision\s+(highp|mediump|lowp)\s+float;/g, '');
    adaptedCode = adaptedCode.replace(/#extension GL_OES_standard_derivatives\s*:\s*enable/g, '');

    return adaptedCode;
};


export const getFragmentShaderSrc = (shaderCode) => {
  const adaptedCode = adaptShaderCode(shaderCode);
  return `
  precision highp float;
  uniform vec3 iResolution;
  uniform float iTime_app;
  uniform vec4 iMouse;
  uniform vec4 iAudio;
  uniform float u_speed;
  uniform float u_zoom;

  #define iTime (iTime_app * u_speed)
  #define u_quality 1.0
  
  ${adaptedCode}
  
  void main() {
    vec2 center = 0.5 * iResolution.xy;
    vec2 zoomed_fragCoord = (gl_FragCoord.xy - center) / u_zoom + center;
    
    // Convert to UV space to handle tiling logic
    vec2 tile_uv = zoomed_fragCoord / iResolution.xy;
    
    // Get tile index and fractional part
    vec2 i_tile = floor(tile_uv);
    vec2 f_tile = fract(tile_uv);
    
    // Mirror every other tile for seamless wrapping (ping-pong)
    vec2 mirrored_uv = mix(f_tile, vec2(1.0) - f_tile, mod(i_tile, 2.0));
    
    // Convert back to fragment coordinates
    vec2 seamless_fragCoord = mirrored_uv * iResolution.xy;
    
    mainImage(gl_FragColor, seamless_fragCoord);
  }
`;
};

export const getEffectFragmentShaderSrc = (shaderCode) => {
    const adaptedCode = adaptShaderCode(shaderCode);
    return `
  precision highp float;
  uniform vec3 iResolution;
  uniform float iTime_app;
  uniform vec4 iMouse;
  uniform vec4 iAudio;
  uniform sampler2D iChannel0;
  uniform vec2 iChannel0Resolution;
  uniform float u_speed;
  uniform float u_zoom;
  
  #define iTime (iTime_app * u_speed)
  #define u_quality 1.0

  // --- HSL <-> RGB Conversion Functions ---
  // These are necessary for the "Color" blend mode.
  vec3 rgb2hsl(vec3 color) {
      vec3 hsl;
      float minVal = min(min(color.r, color.g), color.b);
      float maxVal = max(max(color.r, color.g), color.b);
      float delta = maxVal - minVal;

      hsl.z = (maxVal + minVal) / 2.0; // Lightness

      if (delta == 0.0) {
          hsl.x = 0.0; // Hue
          hsl.y = 0.0; // Saturation
      } else {
          hsl.y = (hsl.z < 0.5) ? (delta / (maxVal + minVal)) : (delta / (2.0 - maxVal - minVal));
          
          vec3 deltaRGB = (((maxVal - color) / 6.0) + (delta / 2.0)) / delta;

          if (color.r == maxVal) {
              hsl.x = deltaRGB.b - deltaRGB.g;
          } else if (color.g == maxVal) {
              hsl.x = (1.0 / 3.0) + deltaRGB.r - deltaRGB.b;
          } else {
              hsl.x = (2.0 / 3.0) + deltaRGB.g - deltaRGB.r;
          }

          if (hsl.x < 0.0) hsl.x += 1.0;
          if (hsl.x > 1.0) hsl.x -= 1.0;
      }
      return hsl;
  }

  float hue2rgb(float f1, float f2, float hue) {
      if (hue < 0.0) hue += 1.0;
      if (hue > 1.0) hue -= 1.0;
      
      if ((6.0 * hue) < 1.0) return f1 + (f2 - f1) * 6.0 * hue;
      if ((2.0 * hue) < 1.0) return f2;
      if ((3.0 * hue) < 2.0) return f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
      
      return f1;
  }

  vec3 hsl2rgb(vec3 hsl) {
      if (hsl.y == 0.0) {
          return vec3(hsl.z); // Achromatic
      } else {
          float f2 = (hsl.z < 0.5) ? hsl.z * (1.0 + hsl.y) : (hsl.z + hsl.y) - (hsl.y * hsl.z);
          float f1 = 2.0 * hsl.z - f2;
          return vec3(
              hue2rgb(f1, f2, hsl.x + (1.0/3.0)),
              hue2rgb(f1, f2, hsl.x),
              hue2rgb(f1, f2, hsl.x - (1.0/3.0))
          );
      }
  }

  ${adaptedCode}

  void main() {
    vec2 center = 0.5 * iResolution.xy;
    vec2 zoomed_fragCoord = (gl_FragCoord.xy - center) / u_zoom + center;

    // Convert to UV space to handle tiling logic
    vec2 tile_uv = zoomed_fragCoord / iResolution.xy;
    
    // Get tile index and fractional part
    vec2 i_tile = floor(tile_uv);
    vec2 f_tile = fract(tile_uv);
    
    // Mirror every other tile for seamless wrapping (ping-pong)
    vec2 mirrored_uv = mix(f_tile, vec2(1.0) - f_tile, mod(i_tile, 2.0));
    
    // Convert back to fragment coordinates for mainImage and UV for texture lookup
    vec2 seamless_fragCoord = mirrored_uv * iResolution.xy;
    vec2 seamless_uv = mirrored_uv;
    
    // baseColor is from the Shape Source shader
    vec4 baseColor = texture2D(iChannel0, seamless_uv); 
    
    // effectColor is from the Color Source shader (this fragment shader)
    vec4 effectColor = vec4(0.0);
    mainImage(effectColor, seamless_fragCoord);
    
    // --- "Color" Blend Mode Logic ---
    // 1. Convert both source colors to HSL
    vec3 baseHSL = rgb2hsl(baseColor.rgb);
    vec3 effectHSL = rgb2hsl(effectColor.rgb);
    
    // 2. Create the new color by taking:
    //    - Hue and Saturation from the Color Source
    //    - Lightness (the shape/form) from the Shape Source
    vec3 finalHSL = vec3(effectHSL.x, effectHSL.y, baseHSL.z);
    
    // 3. Convert the result back to RGB
    vec3 finalColor = hsl2rgb(finalHSL);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
};