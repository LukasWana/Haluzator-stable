const source = `
// NeuronWeb by AI
// A network of pulsating neurons and synapses.

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.2;
    
    // Audio-reactive parameters
    float pulse_speed = 1.0 + iAudio.y * 4.0; // Mids control pulse speed
    float fire_threshold = 0.8 - iAudio.x * 0.3; // Bass makes neurons fire more easily
    float brightness = 0.5 + iAudio.z * 1.5; // Highs make flashes brighter

    vec2 p = uv * 5.0;
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    
    vec3 final_color = vec3(0.0);

    // Iterate over neighboring cells to draw connections
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 neighbor_ip = ip + vec2(float(i), float(j));
            
            // Neuron position with random offset
            vec2 neuron_pos = neighbor_ip + 0.5 + 0.4 * vec2(hash(neighbor_ip), hash(neighbor_ip + 12.34)) - 0.2;
            
            // Draw connections (synapses)
            float dist_to_neuron = length(p - neuron_pos);
            if (dist_to_neuron < 0.8) {
                vec2 center_neuron_pos = ip + 0.5 + 0.4 * vec2(hash(ip), hash(ip + 12.34)) - 0.2;
                vec2 diff = neuron_pos - center_neuron_pos;
                float dist_on_line = dot(p - center_neuron_pos, normalize(diff));
                if (dist_on_line > 0.0 && dist_on_line < length(diff)) {
                    float line_dist = length(p - (center_neuron_pos + normalize(diff) * dist_on_line));
                    float synapse_glow = smoothstep(0.05, 0.0, line_dist);
                    final_color += vec3(0.1, 0.3, 0.8) * synapse_glow * 0.5;
                }
            }
        }
    }
    
    // Draw central neuron body and firing pulse
    vec2 center_neuron_pos = ip + 0.5 + 0.4 * vec2(hash(ip), hash(ip + 12.34)) - 0.2;
    float dist_to_center = length(p - center_neuron_pos);
    
    // Neuron body
    float neuron_body = smoothstep(0.1, 0.05, dist_to_center);
    final_color += vec3(0.3, 0.5, 1.0) * neuron_body;

    // Firing pulse
    float fire_anim = fract(time * pulse_speed + hash(ip));
    if (fire_anim > fire_threshold) {
        float pulse_radius = (fire_anim - fire_threshold) / (1.0 - fire_threshold);
        float pulse = smoothstep(pulse_radius * 0.3, pulse_radius * 0.3 - 0.1, dist_to_center);
        final_color += vec3(0.8, 1.0, 1.0) * pulse * brightness;
    }

    // Background
    vec3 bg_color = vec3(0.0, 0.01, 0.05);
    final_color = mix(bg_color, final_color, smoothstep(0.0, 0.2, length(final_color)));

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;