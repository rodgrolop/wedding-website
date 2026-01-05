precision mediump float;

uniform float u_time;
uniform float u_frequency; // slow energy
uniform float u_pulse;     // fast energy / transients
uniform float u_explode;

varying float v_explode;

/* ---------- Smooth 3D noise ---------- */
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0,0,0));
    float n100 = hash(i + vec3(1,0,0));
    float n010 = hash(i + vec3(0,1,0));
    float n110 = hash(i + vec3(1,1,0));
    float n001 = hash(i + vec3(0,0,1));
    float n101 = hash(i + vec3(1,0,1));
    float n011 = hash(i + vec3(0,1,1));
    float n111 = hash(i + vec3(1,1,1));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
}

void main() {
    v_explode = u_explode;

    vec3 radialDir = normalize(position);

    /* ---------- Base wobble (slow, organic) ---------- */
    vec3 basePos = radialDir * 1.2 + vec3(u_time * 0.12);

    // secondary noise for randomness / dynamic spikes
    vec3 warp = vec3(
        noise(basePos + vec3(5.2, 1.3, 2.7)),
        noise(basePos + vec3(2.1, 7.4, 0.5)),
        noise(basePos + vec3(1.7, 3.3, 6.1))
    ) * 0.9; // small offset

    vec3 noisePos = basePos + warp;
    float n = noise(noisePos);
    n = n * 2.0 - 1.0; // center to [-1,1]

    /* ---------- Audio-driven amplitude ---------- */
    float audioEnergy = u_frequency * 0.7 + u_pulse * 0.3;
    audioEnergy = smoothstep(0.0, 0.9, audioEnergy);

    float wobbleStrength = n * audioEnergy * 1.2;

    /* ---------- Explosion ---------- */
    float explodeStrength = u_explode * 3.0;

    vec3 newPosition =
        position +
        radialDir * wobbleStrength +
        radialDir * explodeStrength;

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(newPosition, 1.0);
}
