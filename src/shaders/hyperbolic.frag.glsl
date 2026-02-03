/**
 * Hyperbolic Fragment Shader
 * Renders geometry with hyperbolic-aware lighting and fog.
 */

precision highp float;

#include "common.glsl"

// Uniforms
uniform vec3 uCameraPosition;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform vec3 uBaseColor;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec3 uFogColor;
uniform float uTime;

// Debug mode
uniform bool uDebugMode;
uniform int uDebugType;  // 0: distance, 1: normals, 2: UV

// Varyings from vertex shader
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHyperbolicDist;

/**
 * Calculate lighting using hyperbolic distance attenuation
 */
vec3 calculateLighting(vec3 position, vec3 normal, vec3 baseColor) {
    // Ambient
    vec3 ambient = uAmbientColor * baseColor;

    // Calculate light direction in hyperbolic space
    vec3 lightDir = normalize(mobiusAdd(-position, uLightPosition));

    // Diffuse (Lambert)
    float diff = max(dot(normal, lightDir), 0.0);

    // Light attenuation based on hyperbolic distance
    float lightDist = hyperbolicDistance(position, uLightPosition);
    float attenuation = hyperbolicAttenuation(lightDist);

    vec3 diffuse = diff * attenuation * uLightColor * baseColor;

    return ambient + diffuse;
}

/**
 * Generate procedural tile pattern
 */
vec3 tilePattern(vec2 uv, vec3 color1, vec3 color2) {
    // Simple checker pattern - will be replaced with proper tiling
    float checker = mod(floor(uv.x * 4.0) + floor(uv.y * 4.0), 2.0);
    return mix(color1, color2, checker);
}

/**
 * Debug visualization
 */
vec3 debugVisualization(int type) {
    if (type == 0) {
        // Distance visualization - gradient from green to red
        float normalizedDist = clamp(vHyperbolicDist / 5.0, 0.0, 1.0);
        return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), normalizedDist);
    } else if (type == 1) {
        // Normal visualization
        return vNormal * 0.5 + 0.5;
    } else if (type == 2) {
        // UV visualization
        return vec3(vUv, 0.0);
    }
    return vec3(1.0, 0.0, 1.0);  // Magenta for unknown
}

void main() {
    // Debug mode
    if (uDebugMode) {
        gl_FragColor = vec4(debugVisualization(uDebugType), 1.0);
        return;
    }

    // Calculate base color (can be textured later)
    vec3 baseColor = uBaseColor;

    // Apply tile pattern
    baseColor = tilePattern(vUv, baseColor, baseColor * 0.8);

    // Calculate lighting
    vec3 litColor = calculateLighting(vPosition, normalize(vNormal), baseColor);

    // Apply fog based on hyperbolic distance
    float fogFactor = hyperbolicFog(vHyperbolicDist, uFogStart, uFogEnd);
    vec3 finalColor = mix(litColor, uFogColor, fogFactor);

    // Add subtle edge glow near Poincaré ball boundary
    float distFromOrigin = length(vPosition);
    float edgeGlow = smoothstep(0.9, 0.99, distFromOrigin);
    finalColor = mix(finalColor, vec3(0.5, 0.7, 1.0), edgeGlow * 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
}
