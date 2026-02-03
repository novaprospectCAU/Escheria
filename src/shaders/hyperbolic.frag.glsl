/**
 * Hyperbolic Fragment Shader
 * Simple version for debugging
 */

precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uAmbientColor;
uniform vec3 uLightColor;
uniform vec3 uLightPosition;
uniform vec3 uCameraPosition;
uniform vec3 uFogColor;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uTime;
uniform bool uDebugMode;
uniform int uDebugType;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHyperbolicDist;

void main() {
    // Debug mode
    if (uDebugMode) {
        if (uDebugType == 0) {
            // Distance
            float d = clamp(vHyperbolicDist / 2.0, 0.0, 1.0);
            gl_FragColor = vec4(d, 1.0 - d, 0.0, 1.0);
        } else if (uDebugType == 1) {
            // Normals
            gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
        } else {
            // UV
            gl_FragColor = vec4(vUv, 0.0, 1.0);
        }
        return;
    }

    // Simple lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vPosition);
    float diff = max(dot(normal, lightDir), 0.0);

    vec3 color = uAmbientColor * uBaseColor + diff * uLightColor * uBaseColor;

    // Simple fog
    float fogFactor = clamp((vHyperbolicDist - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);
}
