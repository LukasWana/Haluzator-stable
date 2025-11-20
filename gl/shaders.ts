export const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const TEXTURE_VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = a_position * 0.5 + 0.5;
  }
`;

export const TEXTURE_FRAGMENT_SHADER_SRC = `
  precision highp float;
  uniform sampler2D u_texture;
  varying vec2 v_uv;
  void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
  }
`;

export const MODEL_VERTEX_SHADER_SRC = `
  attribute vec3 a_position;
  attribute vec3 a_normal;

  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  uniform mat4 u_projectionMatrix;
  uniform float u_vertexNoiseAmount;
  uniform float iTime_app;

  varying vec3 v_normal;
  varying vec3 v_worldPosition;

  // Simple hash-based noise
  float hash(vec3 p) {
    p = fract(p * vec3(123.34, 345.45, 234.67));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y * p.z);
  }

  void main() {
    vec3 displacedPosition = a_position;
    if (u_vertexNoiseAmount > 0.0) {
        // Use iTime_app so it's not affected by the speed slider
        float noiseVal = hash(a_position * 5.0 + iTime_app * 2.0) - 0.5; // range [-0.5, 0.5]
        displacedPosition += a_normal * noiseVal * u_vertexNoiseAmount * 0.2;
    }

    mat4 modelViewMatrix = u_viewMatrix * u_modelMatrix;
    gl_Position = u_projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    
    v_normal = mat3(u_modelMatrix) * a_normal;
    v_worldPosition = (u_modelMatrix * vec4(displacedPosition, 1.0)).xyz;
  }
`;

export const MODEL_FRAGMENT_SHADER_SRC = `
  precision highp float;
  varying vec3 v_normal;
  varying vec3 v_worldPosition;

  uniform vec3 u_lightDirection;
  uniform vec3 u_color;
  uniform vec3 u_cameraPosition;
  uniform float u_alpha;
  
  uniform sampler2D u_shaderTexture;
  uniform bool u_useShaderTexture;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);

    vec3 albedo;
    if (u_useShaderTexture) {
      // Simple spherical mapping using the world-space normal.
      // This effectively samples the 2D shader output as if it were
      // an environment map wrapped around the model.
      vec2 texUV = normal.xy * 0.5 + 0.5;
      albedo = texture2D(u_shaderTexture, texUV).rgb;
    } else {
      albedo = u_color;
    }

    // --- Lighting ---
    // Ambient Light
    float ambientStrength = 0.4;
    vec3 ambient = ambientStrength * albedo;
    
    // Key Light (main directional)
    float diff = max(dot(normal, u_lightDirection), 0.0);
    vec3 diffuse = diff * albedo;

    // Specular Highlight (additive, white)
    float specularStrength = 0.6;
    vec3 reflectDir = reflect(-u_lightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * vec3(1.0);

    // Rim Light (additive, to separate from background)
    float rimPower = 3.0;
    float rimAmount = pow(1.0 - max(dot(viewDir, normal), 0.0), rimPower);
    vec3 rim = rimAmount * vec3(1.0, 1.0, 1.2) * 0.5;

    // Combine lighting components
    vec3 result = ambient + diffuse + specular + rim;

    gl_FragColor = vec4(result, u_alpha);
  }
`;

export const WIREFRAME_VERTEX_SHADER_SRC = `
  attribute vec3 a_position;
  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  uniform mat4 u_projectionMatrix;
  void main() {
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
  }
`;

export const WIREFRAME_FRAGMENT_SHADER_SRC = `
  precision highp float;
  uniform float u_alpha;
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, u_alpha);
  }
`;

export const BLACK_SHADER_KEY = '__BLACK__';
export const BLACK_SHADER_SRC = `
  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;

export const ERROR_SHADER_SRC = `
  precision highp float;
  uniform vec3 iResolution;
  uniform float iTime;

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv *= 10.0;
    
    uv.x += iTime * 0.5;
    uv.y += iTime * 0.25;

    vec2 floor_uv = floor(uv);
    float checker = mod(floor_uv.x + floor_uv.y, 2.0);
    
    vec3 color = mix(vec3(0.5, 0.0, 0.0), vec3(0.1), checker);
    
    color *= 0.8 + 0.2 * sin(iTime * 5.0);
    
    fragColor = vec4(color, 1.0);
  }
`;

export const TRANSITION_SHADER_SRC = `
  precision highp float;
  uniform sampler2D u_fromTexture;
  uniform sampler2D u_toTexture;
  uniform float u_progress;
  uniform vec3 iResolution;
  uniform vec4 iMouse;
  uniform vec4 iAudio;

  vec4 zoomBlur(sampler2D tex, vec2 uv, vec2 center, float strength) {
      vec4 color = vec4(0.0);
      const int SAMPLES = 12;
      for (int i = 0; i < SAMPLES; i++) {
          float percent = float(i) / float(SAMPLES - 1);
          color += texture2D(tex, uv + (center - uv) * percent * strength);
      }
      return color / float(SAMPLES);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 blurCenter = iMouse.wz == vec2(0.0, 0.0) ? vec2(0.5) : iMouse.xy / iResolution.xy;
    float blurAmount = 4.0 * u_progress * (1.0 - u_progress);
    float strength = pow(blurAmount, 2.0) * (0.1 + pow(iAudio.w, 1.5) * 0.15);
    vec4 fromColor = zoomBlur(u_fromTexture, uv, blurCenter, strength);
    vec4 toColor = zoomBlur(u_toTexture, uv, blurCenter, -strength);
    gl_FragColor = mix(fromColor, toColor, u_progress);
  }
`;

export const COMPOSITING_SHADER_SRC = `
  precision highp float;
  uniform sampler2D u_baseTexture;
  uniform sampler2D u_overlayTexture;
  uniform vec2 u_overlayTextureResolution;
  uniform bool u_hasOverlay;
  uniform float u_overlayOpacity;
  uniform float u_overlayZoom;
  uniform vec3 iResolution;

  vec4 getOverlayColor(sampler2D tex, vec2 texRes, vec2 uv_in) {
    if (texRes.x <= 0.0 || texRes.y <= 0.0) return vec4(0.0);
    
    vec2 uv = (uv_in - 0.5) / u_overlayZoom + 0.5;
    float canvasAspect = iResolution.x / iResolution.y;
    float mediaAspect = texRes.x / texRes.y;
    vec2 scale = vec2(1.0);
    if (canvasAspect > mediaAspect) {
        scale.x = mediaAspect / canvasAspect;
    } else {
        scale.y = canvasAspect / mediaAspect;
    }
    vec2 mediaUv = (uv - 0.5) / scale + 0.5;
    return texture2D(tex, mediaUv);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec4 baseColor = texture2D(u_baseTexture, uv);
    
    if (!u_hasOverlay) {
        gl_FragColor = baseColor;
        return;
    }

    vec4 overlayColor = getOverlayColor(u_overlayTexture, u_overlayTextureResolution, uv);
    
    if (overlayColor.a == 0.0) {
        gl_FragColor = baseColor;
        return;
    }

    vec3 composite = mix(baseColor.rgb, overlayColor.rgb, overlayColor.a);
    vec3 mixed_rgb = mix(baseColor.rgb, composite, u_overlayOpacity);

    gl_FragColor = vec4(mixed_rgb, baseColor.a);
  }
`;


export const POST_PROCESSING_SHADER_SRC = `
  precision highp float;
  uniform sampler2D iChannel0;
  uniform vec3 iResolution;
  uniform float u_blurAmount;
  uniform float u_glowAmount;
  uniform float u_chromaAmount;
  uniform float u_hueShift;
  uniform float u_mandalaSegments;
  uniform float u_levelShadows;
  uniform float u_levelMidtones;
  uniform float u_levelHighlights;
  uniform float u_saturation;

  const float TAU = 6.28318530718;

  vec3 rgb2hsl(vec3 color) {
      float minVal = min(min(color.r, color.g), color.b);
      float maxVal = max(max(color.r, color.g), color.b);
      float delta = maxVal - minVal;
      vec3 hsl = vec3(0.0, 0.0, (maxVal + minVal) / 2.0);
      if (delta != 0.0) {
          hsl.y = (hsl.z < 0.5) ? (delta / (maxVal + minVal)) : (delta / (2.0 - maxVal - minVal));
          if (color.r == maxVal) hsl.x = (color.g - color.b) / delta;
          else if (color.g == maxVal) hsl.x = 2.0 + (color.b - color.r) / delta;
          else hsl.x = 4.0 + (color.r - color.g) / delta;
          hsl.x /= 6.0;
          if (hsl.x < 0.0) hsl.x += 1.0;
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
      if (hsl.y == 0.0) return vec3(hsl.z);
      float f2 = (hsl.z < 0.5) ? hsl.z * (1.0 + hsl.y) : (hsl.z + hsl.y) - (hsl.y * hsl.z);
      float f1 = 2.0 * hsl.z - f2;
      return vec3(hue2rgb(f1, f2, hsl.x + 1.0/3.0), hue2rgb(f1, f2, hsl.x), hue2rgb(f1, f2, hsl.x - 1.0/3.0));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 texelSize = 1.0 / iResolution.xy;
    
    if (u_mandalaSegments >= 1.5) {
        float segs = floor(u_mandalaSegments);
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float slice_angle = TAU / segs;
        a = mod(a, slice_angle);
        a = min(a, slice_angle - a);
        uv = r * vec2(cos(a), sin(a)) + 0.5;
    }

    vec3 baseColor = texture2D(iChannel0, uv).rgb;

    if (u_blurAmount > 0.0) {
        vec4 sum = vec4(0.0);
        float blurSize = u_blurAmount * 20.0;
        for (float i = -1.0; i <= 1.0; i++) {
            for (float j = -1.0; j <= 1.0; j++) {
                sum += texture2D(iChannel0, uv + vec2(i, j) * blurSize * texelSize);
            }
        }
        baseColor = (sum / 9.0).rgb;
    }

    if (u_glowAmount > 0.0) {
        vec3 glowColor = vec3(0.0);
        float glowRadius = u_glowAmount * 100.0;
        const int samples = 16;
        for (int i = 0; i < samples; i++) {
            float angle = float(i) * TAU / float(samples);
            vec2 offset = vec2(cos(angle), sin(angle)) * texelSize * glowRadius;
            vec3 sampleColor = texture2D(iChannel0, uv + offset).rgb;
            glowColor += sampleColor * max(0.0, dot(sampleColor, vec3(0.299, 0.587, 0.114)) - 0.2);
        }
        baseColor += (glowColor / float(samples)) * u_glowAmount * 12.0;
    }
    
    vec3 finalColor = baseColor;
    if (u_chromaAmount > 0.0) {
        vec2 dir = uv - 0.5;
        float shift = u_chromaAmount * 0.1 * length(dir);
        finalColor.r = texture2D(iChannel0, uv + dir * shift).r;
        finalColor.b = texture2D(iChannel0, uv - dir * shift).b;
    }

    if (u_hueShift > 0.0) {
        vec3 hsl = rgb2hsl(finalColor);
        hsl.x = fract(hsl.x + u_hueShift);
        finalColor = hsl2rgb(hsl);
    }
    
    if (u_saturation != 0.5) {
        vec3 hsl = rgb2hsl(finalColor);
        hsl.y *= u_saturation * 2.0;
        finalColor = hsl2rgb(hsl);
    }
    
    if (u_levelShadows > 0.001 || u_levelMidtones != 0.5 || u_levelHighlights < 0.999) {
        float shadows = u_levelShadows, highlights = u_levelHighlights;
        if (shadows >= highlights) highlights = shadows + 0.001;
        finalColor = clamp((finalColor - shadows) / (highlights - shadows), 0.0, 1.0);
        finalColor = pow(finalColor, vec3(pow(2.0, (0.5 - u_levelMidtones) * 2.0)));
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const PARTICLE_OVERLAY_SHADER_SRC = `
  precision highp float;
  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec4 iAudio;
  uniform float u_particleAmount;

  float hash(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
  }

  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  void main() {
      vec2 uv = gl_FragCoord.xy / iResolution.xy;
      vec3 col = vec3(0.0);
      float total_alpha = 0.0;

      if (u_particleAmount <= 0.0) {
          gl_FragColor = vec4(0.0);
          return;
      }

      float particleDensity = 20.0 + u_particleAmount * u_particleAmount * 80.0;
      vec2 grid_uv = uv * particleDensity;
      vec2 grid_id = floor(grid_uv);

      for(int y = -1; y <= 1; y++) {
          for(int x = -1; x <= 1; x++) {
              vec2 cell_id = grid_id + vec2(float(x), float(y));

              float cell_hash = hash(cell_id);
              if(cell_hash > 1.0 - u_particleAmount * 0.5) { // Spawn more particles
                  
                  vec2 particle_offset = vec2(hash(cell_id + 0.1), hash(cell_id + 0.2)) - 0.5;
                  float particle_phase = hash(cell_id + 0.3) * 100.0;
                  float particle_speed = 0.2 + hash(cell_id + 0.4) * 0.4; // Base speed

                  vec2 particle_pos = cell_id + 0.5 + particle_offset;
                  
                  float time_speed = 1.5 + iAudio.w * 5.0; // iAudio.w is overall volume
                  float time = (iTime * time_speed) * particle_speed + particle_phase;
                  
                  vec2 flow_dir = vec2(0.3, 0.8); // Base flow direction
                  
                  float turbulence = iAudio.y * 1.5; // Mids
                  flow_dir.x += (noise(cell_id * 0.1 + iTime * 0.1 * time_speed) - 0.5) * turbulence;
                  flow_dir.y += (noise(cell_id * 0.1 - iTime * 0.1 * time_speed) - 0.5) * turbulence;

                  particle_pos += fract(time) * flow_dir * (3.0 + iAudio.w * 4.0);
                  
                  particle_pos = fract(particle_pos / particleDensity) * particleDensity;

                  float dist = length(grid_uv - particle_pos);

                  float size = 0.05 + pow(iAudio.x, 2.0) * 0.2; // Bigger bass pulse
                  float particle = smoothstep(size, 0.0, dist);

                  float lifecycle = sin(fract(time) * 3.14159);
                  
                  vec3 particle_color = 0.5 + 0.5 * cos(cell_hash * 6.28 + vec3(0.0, 1.0, 2.0));
                  particle_color += iAudio.z * 0.5; // Treble sparkle

                  col += particle * lifecycle * particle_color * 3.0; // Brighter particles
                  total_alpha += particle * lifecycle * 2.0; // Accumulate alpha separately
              }
          }
      }
      
      total_alpha *= u_particleAmount;
      gl_FragColor = vec4(col, min(1.0, total_alpha));
  }
`;