#pragma once

#include <array>
#include <cmath>

namespace hypermath {

/**
 * 4x4 matrix utilities for hyperbolic transformations.
 * Matrices are stored in column-major order for compatibility with WebGL/Three.js.
 */
class Matrix4 {
public:
    std::array<double, 16> data;

    Matrix4() : data{} {
        // Initialize to identity
        data[0] = 1.0; data[5] = 1.0; data[10] = 1.0; data[15] = 1.0;
    }

    explicit Matrix4(const std::array<double, 16>& values) : data(values) {}

    // Access element at row, col (column-major storage)
    double& at(int row, int col) { return data[col * 4 + row]; }
    double at(int row, int col) const { return data[col * 4 + row]; }

    // Create identity matrix
    static Matrix4 identity() {
        return Matrix4();
    }

    // Create Lorentz boost matrix (hyperbolic translation along direction)
    // In Minkowski space: (x, y, z, w) where w² = x² + y² + z² + 1
    static Matrix4 lorentzBoost(double dx, double dy, double dz, double distance) {
        Matrix4 result;

        double len = std::sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-10) {
            return result; // Return identity if direction is zero
        }

        // Normalize direction
        double nx = dx / len;
        double ny = dy / len;
        double nz = dz / len;

        double c = std::cosh(distance);
        double s = std::sinh(distance);

        // Lorentz boost matrix
        // This transforms points in Minkowski space
        result.at(0, 0) = 1.0 + (c - 1.0) * nx * nx;
        result.at(0, 1) = (c - 1.0) * nx * ny;
        result.at(0, 2) = (c - 1.0) * nx * nz;
        result.at(0, 3) = s * nx;

        result.at(1, 0) = (c - 1.0) * ny * nx;
        result.at(1, 1) = 1.0 + (c - 1.0) * ny * ny;
        result.at(1, 2) = (c - 1.0) * ny * nz;
        result.at(1, 3) = s * ny;

        result.at(2, 0) = (c - 1.0) * nz * nx;
        result.at(2, 1) = (c - 1.0) * nz * ny;
        result.at(2, 2) = 1.0 + (c - 1.0) * nz * nz;
        result.at(2, 3) = s * nz;

        result.at(3, 0) = s * nx;
        result.at(3, 1) = s * ny;
        result.at(3, 2) = s * nz;
        result.at(3, 3) = c;

        return result;
    }

    // Create rotation matrix around Z axis
    static Matrix4 rotateZ(double angle) {
        Matrix4 result;
        double c = std::cos(angle);
        double s = std::sin(angle);

        result.at(0, 0) = c;
        result.at(0, 1) = -s;
        result.at(1, 0) = s;
        result.at(1, 1) = c;

        return result;
    }

    // Create rotation matrix around X axis
    static Matrix4 rotateX(double angle) {
        Matrix4 result;
        double c = std::cos(angle);
        double s = std::sin(angle);

        result.at(1, 1) = c;
        result.at(1, 2) = -s;
        result.at(2, 1) = s;
        result.at(2, 2) = c;

        return result;
    }

    // Create rotation matrix around Y axis
    static Matrix4 rotateY(double angle) {
        Matrix4 result;
        double c = std::cos(angle);
        double s = std::sin(angle);

        result.at(0, 0) = c;
        result.at(0, 2) = s;
        result.at(2, 0) = -s;
        result.at(2, 2) = c;

        return result;
    }

    // Matrix multiplication
    Matrix4 operator*(const Matrix4& other) const {
        Matrix4 result;
        for (int i = 0; i < 4; ++i) {
            for (int j = 0; j < 4; ++j) {
                double sum = 0.0;
                for (int k = 0; k < 4; ++k) {
                    sum += at(i, k) * other.at(k, j);
                }
                result.at(i, j) = sum;
            }
        }
        return result;
    }

    // Transform a 4D point
    std::array<double, 4> transform(const std::array<double, 4>& point) const {
        std::array<double, 4> result;
        for (int i = 0; i < 4; ++i) {
            result[i] = 0.0;
            for (int j = 0; j < 4; ++j) {
                result[i] += at(i, j) * point[j];
            }
        }
        return result;
    }
};

} // namespace hypermath
