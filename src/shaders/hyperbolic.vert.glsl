/**
 * Hyperbolic Vertex Shader
 * Uses Poincaré disk model hyperbolic distance for fog/lighting
 */

uniform vec3 uCameraPosition;
uniform vec2 uCameraRotation;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHyperbolicDist;

// Hyperbolic distance in the Poincaré ball model
// d(a,b) = acosh(1 + 2|a-b|² / ((1-|a|²)(1-|b|²)))
float hyperbolicDist(vec3 a, vec3 b) {
    vec3 diff = a - b;
    float diffSq = dot(diff, diff);
    float aSq = dot(a, a);
    float bSq = dot(b, b);
    float denom = (1.0 - aSq) * (1.0 - bSq);
    // Clamp to avoid numerical issues at disk boundary
    float coshDist = 1.0 + 2.0 * diffSq / max(denom, 0.0001);
    return log(coshDist + sqrt(max(coshDist * coshDist - 1.0, 0.0)));
}

void main() {
    // World position from mesh transform
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // Hyperbolic distance in Poincaré ball model
    vHyperbolicDist = hyperbolicDist(worldPosition, uCameraPosition);

    // Standard MVP transform
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);

    // Pass to fragment
    vPosition = worldPosition;
    vNormal = normalMatrix * normal;
    vUv = uv;
}
