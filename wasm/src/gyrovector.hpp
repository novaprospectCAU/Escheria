#pragma once

#include <cmath>
#include <array>

namespace hypermath {

/**
 * Gyrovector class for hyperbolic geometry operations.
 * Represents a point/vector in the Poincaré ball model of hyperbolic space.
 *
 * In the Poincaré ball model:
 * - All points lie within the unit ball (|v| < 1)
 * - The boundary (|v| = 1) represents infinity
 * - Geodesics are arcs of circles orthogonal to the boundary
 */
class Gyrovector {
public:
    double x, y, z;

    Gyrovector() : x(0), y(0), z(0) {}
    Gyrovector(double x, double y, double z) : x(x), y(y), z(z) {}

    // Squared magnitude
    double normSquared() const {
        return x * x + y * y + z * z;
    }

    // Magnitude (Euclidean norm, not hyperbolic distance!)
    double norm() const {
        return std::sqrt(normSquared());
    }

    // Clamp to stay inside the Poincaré ball (|v| < 1)
    // Uses a safety margin to avoid numerical issues at the boundary
    Gyrovector clamp(double maxNorm = 0.999) const {
        double n = norm();
        if (n > maxNorm) {
            double scale = maxNorm / n;
            return Gyrovector(x * scale, y * scale, z * scale);
        }
        return *this;
    }

    // Negate (hyperbolic inverse)
    Gyrovector operator-() const {
        return Gyrovector(-x, -y, -z);
    }

    // Scalar multiplication
    Gyrovector operator*(double s) const {
        return Gyrovector(x * s, y * s, z * s);
    }

    // Dot product
    double dot(const Gyrovector& other) const {
        return x * other.x + y * other.y + z * other.z;
    }

    // Cross product
    Gyrovector cross(const Gyrovector& other) const {
        return Gyrovector(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }

    /**
     * Möbius addition (hyperbolic vector addition)
     * This is the fundamental operation in gyrovector spaces.
     *
     * Formula: a ⊕ b = ((1 + 2<a,b> + |b|²)a + (1 - |a|²)b) / (1 + 2<a,b> + |a|²|b|²)
     *
     * Note: Möbius addition is NOT commutative! a ⊕ b ≠ b ⊕ a
     */
    Gyrovector mobiusAdd(const Gyrovector& other) const {
        double aSq = normSquared();
        double bSq = other.normSquared();
        double ab = dot(other);

        double denom = 1.0 + 2.0 * ab + aSq * bSq;

        // Avoid division by zero
        if (std::abs(denom) < 1e-10) {
            return Gyrovector(0, 0, 0);
        }

        double coeffA = 1.0 + 2.0 * ab + bSq;
        double coeffB = 1.0 - aSq;

        return Gyrovector(
            (coeffA * x + coeffB * other.x) / denom,
            (coeffA * y + coeffB * other.y) / denom,
            (coeffA * z + coeffB * other.z) / denom
        ).clamp();
    }

    /**
     * Möbius scalar multiplication (hyperbolic scaling)
     * This scales a vector along the geodesic from the origin.
     *
     * Formula: r ⊗ v = tanh(r * atanh(|v|)) * (v / |v|)
     */
    Gyrovector mobiusScale(double scalar) const {
        double n = norm();
        if (n < 1e-10) {
            return Gyrovector(0, 0, 0);
        }

        // Clamp to avoid atanh(1) = infinity
        double clampedNorm = std::min(n, 0.9999);
        double newNorm = std::tanh(scalar * std::atanh(clampedNorm));
        double scale = newNorm / n;

        return Gyrovector(x * scale, y * scale, z * scale);
    }

    /**
     * Hyperbolic distance between two points in the Poincaré ball
     *
     * Formula: d(a, b) = 2 * atanh(|(-a) ⊕ b|)
     */
    double hyperbolicDistance(const Gyrovector& other) const {
        Gyrovector diff = (-*this).mobiusAdd(other);
        double n = diff.norm();

        // Clamp to avoid atanh(1) = infinity
        n = std::min(n, 0.9999);

        return 2.0 * std::atanh(n);
    }

    /**
     * Point on geodesic between two points
     * Returns the point at parameter t (0 = start, 1 = end)
     */
    Gyrovector geodesicPoint(const Gyrovector& end, double t) const {
        // Direction from start to end in hyperbolic space
        Gyrovector direction = (-*this).mobiusAdd(end);

        // Scale the direction by t
        Gyrovector scaledDir = direction.mobiusScale(t);

        // Add to start point
        return mobiusAdd(scaledDir);
    }

    // Convert to array for WASM interop
    std::array<double, 3> toArray() const {
        return {x, y, z};
    }

    // Create from array
    static Gyrovector fromArray(const double* arr) {
        return Gyrovector(arr[0], arr[1], arr[2]);
    }
};

} // namespace hypermath
