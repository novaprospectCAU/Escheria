/**
 * Hyperbolic Vertex Shader
 * Transforms vertices from hyperbolic space to clip space.
 */

#include "common.glsl"

// Uniforms
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

// Camera position in Poincaré ball coordinates
uniform vec3 uCameraPosition;
// Camera rotation (yaw, pitch)
uniform vec2 uCameraRotation;
// Render settings
uniform float uRenderDistance;

// Vertex attributes
attribute vec3 position;      // Position in Poincaré ball model
attribute vec3 normal;
attribute vec2 uv;

// Varyings to fragment shader
varying vec3 vPosition;       // World position (Poincaré)
varying vec3 vNormal;
varying vec2 vUv;
varying float vHyperbolicDist;

/**
 * Apply camera transformation in hyperbolic space
 */
vec3 applyCameraTransform(vec3 worldPos) {
    // Translate by inverse camera position (Möbius subtraction)
    vec3 translated = mobiusAdd(-uCameraPosition, worldPos);

    // Apply camera rotation
    float cy = cos(uCameraRotation.x);
    float sy = sin(uCameraRotation.x);
    float cp = cos(uCameraRotation.y);
    float sp = sin(uCameraRotation.y);

    // Yaw rotation (around Y axis)
    vec3 rotatedYaw = vec3(
        translated.x * cy + translated.z * sy,
        translated.y,
        -translated.x * sy + translated.z * cy
    );

    // Pitch rotation (around X axis)
    vec3 rotated = vec3(
        rotatedYaw.x,
        rotatedYaw.y * cp - rotatedYaw.z * sp,
        rotatedYaw.y * sp + rotatedYaw.z * cp
    );

    return rotated;
}

void main() {
    // Get world position (already in Poincaré coordinates)
    vec3 worldPosition = position;

    // Calculate hyperbolic distance from camera for fog/culling
    vHyperbolicDist = hyperbolicDistance(uCameraPosition, worldPosition);

    // Apply hyperbolic camera transformation
    vec3 viewPosition = applyCameraTransform(worldPosition);

    // Convert to Euclidean for rendering
    // The Poincaré ball is already a valid projection for visualization
    vec4 clipPosition = projectionMatrix * viewMatrix * vec4(viewPosition, 1.0);

    // Pass to fragment shader
    vPosition = worldPosition;
    vNormal = normal;
    vUv = uv;

    gl_Position = clipPosition;
}
