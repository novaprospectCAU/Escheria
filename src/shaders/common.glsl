/**
 * Common GLSL functions for hyperbolic geometry.
 * These functions are shared between vertex and fragment shaders.
 */

#define PI 3.14159265359
#define EPSILON 1e-6

// ============================================================================
// Hyperbolic Math Utilities
// ============================================================================

/**
 * Hyperbolic sine
 */
float sinh(float x) {
    return (exp(x) - exp(-x)) * 0.5;
}

/**
 * Hyperbolic cosine
 */
float cosh(float x) {
    return (exp(x) + exp(-x)) * 0.5;
}

/**
 * Hyperbolic tangent
 */
float tanh(float x) {
    float e2x = exp(2.0 * x);
    return (e2x - 1.0) / (e2x + 1.0);
}

/**
 * Inverse hyperbolic tangent (artanh)
 */
float atanh(float x) {
    return 0.5 * log((1.0 + x) / (1.0 - x));
}

/**
 * Inverse hyperbolic cosine (arcosh)
 */
float acosh(float x) {
    return log(x + sqrt(x * x - 1.0));
}

// ============================================================================
// Poincaré Ball Model Operations
// ============================================================================

/**
 * Möbius addition of two points in Poincaré ball
 * a ⊕ b = ((1 + 2<a,b> + |b|²)a + (1 - |a|²)b) / (1 + 2<a,b> + |a|²|b|²)
 */
vec3 mobiusAdd(vec3 a, vec3 b) {
    float aSq = dot(a, a);
    float bSq = dot(b, b);
    float ab = dot(a, b);

    float denom = 1.0 + 2.0 * ab + aSq * bSq;

    if (abs(denom) < EPSILON) {
        return vec3(0.0);
    }

    float coeffA = 1.0 + 2.0 * ab + bSq;
    float coeffB = 1.0 - aSq;

    vec3 result = (coeffA * a + coeffB * b) / denom;

    // Clamp to stay inside ball
    float norm = length(result);
    if (norm > 0.999) {
        result = result * (0.999 / norm);
    }

    return result;
}

/**
 * Möbius scalar multiplication
 * r ⊗ v = tanh(r * atanh(|v|)) * (v / |v|)
 */
vec3 mobiusScale(vec3 v, float scalar) {
    float n = length(v);
    if (n < EPSILON) {
        return vec3(0.0);
    }

    float clampedNorm = min(n, 0.9999);
    float newNorm = tanh(scalar * atanh(clampedNorm));

    return v * (newNorm / n);
}

/**
 * Hyperbolic distance between two points in Poincaré ball
 */
float hyperbolicDistance(vec3 a, vec3 b) {
    vec3 diff = mobiusAdd(-a, b);
    float n = min(length(diff), 0.9999);
    return 2.0 * atanh(n);
}

// ============================================================================
// Coordinate Transformations
// ============================================================================

/**
 * Convert from Poincaré ball to hyperboloid model
 * Returns vec4(x, y, z, w) where -x² - y² - z² + w² = 1
 */
vec4 poincareToHyperboloid(vec3 p) {
    float pSq = dot(p, p);
    float denom = 1.0 - pSq;

    if (abs(denom) < EPSILON) {
        // Point near infinity
        float norm = length(p);
        return vec4(p * (1000.0 / norm), 1000.0);
    }

    float w = (1.0 + pSq) / denom;
    float scale = 2.0 / denom;

    return vec4(p * scale, w);
}

/**
 * Convert from hyperboloid model to Poincaré ball
 */
vec3 hyperboloidToPoincare(vec4 h) {
    float denom = 1.0 + h.w;

    if (abs(denom) < EPSILON) {
        return vec3(0.0);
    }

    vec3 result = h.xyz / denom;

    // Clamp to ball
    float norm = length(result);
    if (norm > 0.999) {
        result = result * (0.999 / norm);
    }

    return result;
}

/**
 * Apply Lorentz transformation to hyperboloid point
 * direction: normalized direction of translation
 * distance: hyperbolic distance to translate
 */
vec4 lorentzTranslate(vec4 point, vec3 direction, float distance) {
    float c = cosh(distance);
    float s = sinh(distance);

    // Lorentz boost
    vec3 parallel = dot(point.xyz, direction) * direction;
    vec3 perpendicular = point.xyz - parallel;

    vec3 newXYZ = perpendicular + c * parallel + s * direction * point.w;
    float newW = c * point.w + s * dot(point.xyz, direction);

    return vec4(newXYZ, newW);
}

// ============================================================================
// Projection for Rendering
// ============================================================================

/**
 * Project hyperboloid point to screen coordinates
 * Uses perspective projection from hyperbolic space
 */
vec3 hyperbolicProject(vec4 hyperboloidPoint, float fov) {
    // First convert to Poincaré ball
    vec3 poincare = hyperboloidToPoincare(hyperboloidPoint);

    // Then apply standard perspective
    // (This is simplified; proper projection requires more work)
    return poincare;
}

/**
 * Distance-based attenuation for hyperbolic space
 * Falls off much faster than Euclidean due to exponential growth
 */
float hyperbolicAttenuation(float hypDist) {
    return 1.0 / (1.0 + hypDist * hypDist);
}

/**
 * Fog factor based on hyperbolic distance
 */
float hyperbolicFog(float hypDist, float fogStart, float fogEnd) {
    return clamp((hypDist - fogStart) / (fogEnd - fogStart), 0.0, 1.0);
}
