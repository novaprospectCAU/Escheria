#pragma once

#include "gyrovector.hpp"
#include "matrix.hpp"
#include <cmath>
#include <array>

namespace hypermath {

/**
 * Utility functions for hyperbolic geometry calculations.
 */

// Constants
constexpr double PI = 3.14159265358979323846;
constexpr double EPSILON = 1e-10;

/**
 * Convert a point from Poincaré ball model to hyperboloid model (Minkowski space)
 *
 * Hyperboloid model uses 4D coordinates (x, y, z, w) where:
 * -x² - y² - z² + w² = 1 (upper sheet)
 */
inline std::array<double, 4> poincareToHyperboloid(const Gyrovector& p) {
    double pSq = p.normSquared();
    double denom = 1.0 - pSq;

    // Avoid division by zero when point is at boundary
    if (std::abs(denom) < EPSILON) {
        // Return a point far away on the hyperboloid
        double norm = p.norm();
        double scale = 1000.0 / norm;
        return {p.x * scale, p.y * scale, p.z * scale, 1000.0};
    }

    double w = (1.0 + pSq) / denom;
    double scale = 2.0 / denom;

    return {p.x * scale, p.y * scale, p.z * scale, w};
}

/**
 * Convert a point from hyperboloid model to Poincaré ball model
 */
inline Gyrovector hyperboloidToPoincare(const std::array<double, 4>& h) {
    double denom = 1.0 + h[3];

    if (std::abs(denom) < EPSILON) {
        // Point at infinity
        return Gyrovector(0, 0, 0);
    }

    return Gyrovector(
        h[0] / denom,
        h[1] / denom,
        h[2] / denom
    ).clamp();
}

/**
 * Calculate the angle deficit at a vertex in hyperbolic space.
 * For a {p, q} tiling (p-gons, q meeting at each vertex):
 * - Euclidean: (q-2) * π / q for each polygon corner → q * (p-2)*π/p = 2π
 * - Hyperbolic: sum of angles < 2π (negative curvature)
 *
 * The tiling exists in hyperbolic space if (p-2)(q-2) > 4
 */
inline double tilingAngle(int p, int q) {
    // Interior angle of a hyperbolic p-gon in a {p,q} tiling
    return 2.0 * PI / q;
}

/**
 * Calculate the edge length of a regular hyperbolic polygon in a {p,q} tiling.
 * Uses the formula from hyperbolic trigonometry.
 */
inline double tilingEdgeLength(int p, int q) {
    double angleP = PI / p;
    double angleQ = PI / q;

    // Using the formula: cosh(edge/2) = cos(π/q) / sin(π/p)
    double ratio = std::cos(angleQ) / std::sin(angleP);

    // Handle cases where the tiling doesn't exist in hyperbolic space
    if (ratio <= 1.0) {
        return 0.0; // Euclidean or spherical
    }

    return 2.0 * std::acosh(ratio);
}

/**
 * Calculate the circumradius of a regular hyperbolic polygon in a {p,q} tiling.
 * This is the hyperbolic distance from center to vertex.
 */
inline double tilingCircumradius(int p, int q) {
    double angleP = PI / p;
    double angleQ = PI / q;

    // cosh(R) = cos(π/q) / sin(π/p) * cos(π/p) / sin(π/q)
    // Simplified: cosh(R) = cos(π/p)cos(π/q) / (sin(π/p)sin(π/q))
    double numerator = std::cos(angleP) * std::cos(angleQ);
    double denominator = std::sin(angleP) * std::sin(angleQ);

    if (denominator < EPSILON || numerator / denominator <= 1.0) {
        return 0.0;
    }

    return std::acosh(numerator / denominator);
}

/**
 * Calculate the inradius of a regular hyperbolic polygon in a {p,q} tiling.
 * This is the hyperbolic distance from center to edge midpoint.
 */
inline double tilingInradius(int p, int q) {
    double angleP = PI / p;
    double angleQ = PI / q;

    // cosh(r) = cos(π/p) / sin(π/q)
    double ratio = std::cos(angleP) / std::sin(angleQ);

    if (ratio <= 1.0) {
        return 0.0;
    }

    return std::acosh(ratio);
}

/**
 * Generate vertices of a regular p-gon centered at the origin.
 * Returns vertices in the Poincaré ball model.
 */
inline std::vector<Gyrovector> regularPolygonVertices(int p, int q) {
    std::vector<Gyrovector> vertices;
    vertices.reserve(p);

    double R = tilingCircumradius(p, q);

    // Convert hyperbolic radius to Euclidean radius in Poincaré ball
    // |v| = tanh(R/2)
    double euclideanR = std::tanh(R / 2.0);

    for (int i = 0; i < p; ++i) {
        double angle = 2.0 * PI * i / p;
        vertices.emplace_back(
            euclideanR * std::cos(angle),
            euclideanR * std::sin(angle),
            0.0
        );
    }

    return vertices;
}

/**
 * Reflect a point across a geodesic (circle orthogonal to unit circle).
 * The geodesic is defined by two points on the unit circle.
 */
inline Gyrovector reflectAcrossGeodesic(
    const Gyrovector& point,
    const Gyrovector& geodesicPoint1,
    const Gyrovector& geodesicPoint2
) {
    // For simplicity, we use the Möbius transformation approach
    // This is a placeholder - full implementation requires circle inversion

    // TODO: Implement proper geodesic reflection
    return point;
}

} // namespace hypermath
