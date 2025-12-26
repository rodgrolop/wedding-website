uniform float u_time;
uniform float u_frequency;

void main() {
  // basic wobble just to verify things work
  vec3 transformed = position + normal * (u_frequency * 0.02) * sin(u_time);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}