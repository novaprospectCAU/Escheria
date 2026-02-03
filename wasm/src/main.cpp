#include <emscripten/bind.h>
#include <emscripten/val.h>
#include "gyrovector.hpp"
#include "hyperbolic.hpp"
#include "matrix.hpp"
#include <string>
#include <vector>

using namespace emscripten;
using namespace hypermath;

// Version info
std::string getVersion() {
    return "HyperMath 0.1.0";
}

// ============================================================================
// Gyrovector operations exposed to JavaScript
// ============================================================================

val gyroAdd(val a, val b) {
    Gyrovector va(a[0].as<double>(), a[1].as<double>(), a[2].as<double>());
    Gyrovector vb(b[0].as<double>(), b[1].as<double>(), b[2].as<double>());
    Gyrovector result = va.mobiusAdd(vb);

    val arr = val::array();
    arr.call<void>("push", result.x);
    arr.call<void>("push", result.y);
    arr.call<void>("push", result.z);
    return arr;
}

val gyroScale(val v, double scalar) {
    Gyrovector vec(v[0].as<double>(), v[1].as<double>(), v[2].as<double>());
    Gyrovector result = vec.mobiusScale(scalar);

    val arr = val::array();
    arr.call<void>("push", result.x);
    arr.call<void>("push", result.y);
    arr.call<void>("push", result.z);
    return arr;
}

val gyroNegate(val v) {
    val arr = val::array();
    arr.call<void>("push", -v[0].as<double>());
    arr.call<void>("push", -v[1].as<double>());
    arr.call<void>("push", -v[2].as<double>());
    return arr;
}

double gyroDistance(val a, val b) {
    Gyrovector va(a[0].as<double>(), a[1].as<double>(), a[2].as<double>());
    Gyrovector vb(b[0].as<double>(), b[1].as<double>(), b[2].as<double>());
    return va.hyperbolicDistance(vb);
}

val gyroGeodesicPoint(val start, val end, double t) {
    Gyrovector vStart(start[0].as<double>(), start[1].as<double>(), start[2].as<double>());
    Gyrovector vEnd(end[0].as<double>(), end[1].as<double>(), end[2].as<double>());
    Gyrovector result = vStart.geodesicPoint(vEnd, t);

    val arr = val::array();
    arr.call<void>("push", result.x);
    arr.call<void>("push", result.y);
    arr.call<void>("push", result.z);
    return arr;
}

// ============================================================================
// Coordinate transformations
// ============================================================================

val poincareToHyperboloidJS(val p) {
    Gyrovector vec(p[0].as<double>(), p[1].as<double>(), p[2].as<double>());
    auto result = poincareToHyperboloid(vec);

    val arr = val::array();
    arr.call<void>("push", result[0]);
    arr.call<void>("push", result[1]);
    arr.call<void>("push", result[2]);
    arr.call<void>("push", result[3]);
    return arr;
}

val hyperboloidToPoincareJS(val h) {
    std::array<double, 4> arr = {
        h[0].as<double>(),
        h[1].as<double>(),
        h[2].as<double>(),
        h[3].as<double>()
    };
    Gyrovector result = hyperboloidToPoincare(arr);

    val out = val::array();
    out.call<void>("push", result.x);
    out.call<void>("push", result.y);
    out.call<void>("push", result.z);
    return out;
}

// ============================================================================
// Matrix operations
// ============================================================================

val createLorentzBoost(double dx, double dy, double dz, double distance) {
    Matrix4 m = Matrix4::lorentzBoost(dx, dy, dz, distance);

    val arr = val::array();
    for (int i = 0; i < 16; ++i) {
        arr.call<void>("push", m.data[i]);
    }
    return arr;
}

val createRotationMatrix(double angle, int axis) {
    Matrix4 m;
    switch (axis) {
        case 0: m = Matrix4::rotateX(angle); break;
        case 1: m = Matrix4::rotateY(angle); break;
        case 2: m = Matrix4::rotateZ(angle); break;
        default: m = Matrix4::identity();
    }

    val arr = val::array();
    for (int i = 0; i < 16; ++i) {
        arr.call<void>("push", m.data[i]);
    }
    return arr;
}

val multiplyMatrices(val a, val b) {
    Matrix4 ma, mb;
    for (int i = 0; i < 16; ++i) {
        ma.data[i] = a[i].as<double>();
        mb.data[i] = b[i].as<double>();
    }
    Matrix4 result = ma * mb;

    val arr = val::array();
    for (int i = 0; i < 16; ++i) {
        arr.call<void>("push", result.data[i]);
    }
    return arr;
}

val transformPoint(val matrix, val point) {
    Matrix4 m;
    for (int i = 0; i < 16; ++i) {
        m.data[i] = matrix[i].as<double>();
    }

    std::array<double, 4> p = {
        point[0].as<double>(),
        point[1].as<double>(),
        point[2].as<double>(),
        point[3].as<double>()
    };

    auto result = m.transform(p);

    val arr = val::array();
    arr.call<void>("push", result[0]);
    arr.call<void>("push", result[1]);
    arr.call<void>("push", result[2]);
    arr.call<void>("push", result[3]);
    return arr;
}

// ============================================================================
// Tiling utilities
// ============================================================================

double getTilingEdgeLength(int p, int q) {
    return tilingEdgeLength(p, q);
}

double getTilingCircumradius(int p, int q) {
    return tilingCircumradius(p, q);
}

double getTilingInradius(int p, int q) {
    return tilingInradius(p, q);
}

val getPolygonVertices(int p, int q) {
    auto vertices = regularPolygonVertices(p, q);

    val arr = val::array();
    for (const auto& v : vertices) {
        val vertex = val::array();
        vertex.call<void>("push", v.x);
        vertex.call<void>("push", v.y);
        vertex.call<void>("push", v.z);
        arr.call<void>("push", vertex);
    }
    return arr;
}

// ============================================================================
// Embind module definition
// ============================================================================

EMSCRIPTEN_BINDINGS(hypermath) {
    // Version
    function("getVersion", &getVersion);

    // Gyrovector operations
    function("gyroAdd", &gyroAdd);
    function("gyroScale", &gyroScale);
    function("gyroNegate", &gyroNegate);
    function("gyroDistance", &gyroDistance);
    function("gyroGeodesicPoint", &gyroGeodesicPoint);

    // Coordinate transformations
    function("poincareToHyperboloid", &poincareToHyperboloidJS);
    function("hyperboloidToPoincare", &hyperboloidToPoincareJS);

    // Matrix operations
    function("createLorentzBoost", &createLorentzBoost);
    function("createRotationMatrix", &createRotationMatrix);
    function("multiplyMatrices", &multiplyMatrices);
    function("transformPoint", &transformPoint);

    // Tiling utilities
    function("getTilingEdgeLength", &getTilingEdgeLength);
    function("getTilingCircumradius", &getTilingCircumradius);
    function("getTilingInradius", &getTilingInradius);
    function("getPolygonVertices", &getPolygonVertices);
}
