/**
 * Hyperbolic Vertex Shader
 * Simple version for debugging
 */

uniform vec3 uCameraPosition;
uniform vec2 uCameraRotation;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHyperbolicDist;

void main() {
    // World position from mesh transform
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // Simple Euclidean distance for now
    vHyperbolicDist = length(worldPosition - uCameraPosition);

    // Standard MVP transform
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);

    // Pass to fragment
    vPosition = worldPosition;
    vNormal = normalMatrix * normal;
    vUv = uv;
}
