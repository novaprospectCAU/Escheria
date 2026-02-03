# CLAUDE.md - Escheria

## 프로젝트 개요

**이름:** Escheria
**목표:** 브라우저에서 쌍곡(Hyperbolic) 공간을 1인칭으로 탐험할 수 있는 웹 기반 비유클리드 렌더링 엔진

> *"에셔의 세계로 걸어 들어가다"*

### 핵심 컨셉
- 쌍곡 기하학에서는 평행선이 무한히 발산함
- 공간이 "지수적으로" 확장됨 (거리 d에서 원의 둘레 ∝ e^d)
- 직선(측지선)이 유클리드 관점에서 곡선으로 보임

---

## 기술 스택

```
├── Core Math (C++ → WASM)
│   ├── Gyrovector 연산
│   ├── 쌍곡 변환 행렬
│   ├── 측지선 계산
│   └── Emscripten 바인딩
│
├── Rendering (TypeScript + Three.js)
│   ├── Three.js 씬 관리
│   ├── 커스텀 ShaderMaterial
│   └── 카메라 컨트롤러
│
├── Shaders (GLSL)
│   ├── 쌍곡 정점 변환
│   ├── 비유클리드 조명
│   └── 거리 기반 포그
│
└── UI (React + TypeScript)
    ├── 컨트롤 패널
    ├── 디버그 오버레이
    └── 데모 페이지
```

### 빌드 도구
- **Vite**: 프론트엔드 번들링
- **Emscripten**: C++ → WASM 컴파일
- **pnpm**: 패키지 매니저

---

## 디렉토리 구조

```
escheria/
├── CLAUDE.md
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
│
├── src/
│   ├── main.tsx                 # React 엔트리
│   ├── App.tsx                  # 메인 앱
│   │
│   ├── core/                    # WASM 바인딩 & 수학 유틸
│   │   ├── wasm/
│   │   │   └── HyperMath.ts     # WASM 모듈 로더 & 타입
│   │   ├── gyrovector.ts        # Gyrovector 클래스 (JS fallback)
│   │   └── hyperbolic.ts        # 쌍곡 유틸 함수
│   │
│   ├── engine/                  # Three.js 엔진 레이어
│   │   ├── HyperbolicEngine.ts  # 메인 엔진 클래스
│   │   ├── HyperbolicCamera.ts  # 쌍곡 카메라 컨트롤러
│   │   ├── HyperbolicObject.ts  # 쌍곡 공간 오브젝트
│   │   └── HyperbolicTiling.ts  # 타일링 생성기
│   │
│   ├── shaders/                 # GLSL 쉐이더
│   │   ├── hyperbolic.vert.glsl
│   │   ├── hyperbolic.frag.glsl
│   │   └── common.glsl          # 공통 수학 함수
│   │
│   ├── components/              # React 컴포넌트
│   │   ├── Canvas.tsx           # Three.js 캔버스 래퍼
│   │   ├── Controls.tsx         # UI 컨트롤 패널
│   │   └── DebugOverlay.tsx     # 디버그 정보
│   │
│   └── types/                   # TypeScript 타입
│       └── index.ts
│
├── wasm/                        # C++ 소스
│   ├── CMakeLists.txt
│   ├── src/
│   │   ├── main.cpp             # WASM 엔트리 & 바인딩
│   │   ├── gyrovector.hpp       # Gyrovector 클래스
│   │   ├── gyrovector.cpp
│   │   ├── hyperbolic.hpp       # 쌍곡 변환 함수
│   │   ├── hyperbolic.cpp
│   │   └── matrix.hpp           # 4x4 행렬 유틸
│   │
│   └── build/                   # WASM 빌드 출력
│       └── hypermath.wasm
│
└── public/
    └── index.html
```

---

## 핵심 수학 개념

### 1. Poincaré Disk Model
- 쌍곡 평면을 단위 원 내부에 매핑
- 원의 경계 = 무한대
- 측지선 = 원과 직교하는 원호 (또는 직경)

### 2. Gyrovector
쌍곡 공간에서의 "벡터". 일반 벡터와 달리 덧셈이 비가환적.

```cpp
// Möbius 덧셈 (쌍곡 공간의 벡터 덧셈)
Gyrovector mobius_add(Gyrovector a, Gyrovector b) {
    double a_sq = dot(a, a);
    double b_sq = dot(b, b);
    double ab = dot(a, b);
    double denom = 1.0 + 2.0 * ab + a_sq * b_sq;
    return ((1.0 + 2.0 * ab + b_sq) * a + (1.0 - a_sq) * b) / denom;
}
```

### 3. 쌍곡 거리
```cpp
double hyperbolic_distance(Gyrovector a, Gyrovector b) {
    Gyrovector diff = mobius_add(-a, b);  // 쌍곡 뺄셈
    double norm = length(diff);
    return 2.0 * atanh(norm);  // 쌍곡 거리
}
```

### 4. 변환 행렬
- 쌍곡 이동(translation)은 Lorentz 변환으로 표현
- Minkowski 공간 (x, y, z, w) 사용, w² = x² + y² + z² + 1

---

## 구현 가이드라인

### C++ (WASM 코어)

```cpp
// 모든 공개 함수는 extern "C"로 노출
extern "C" {
    // Gyrovector 연산
    void gyro_add(double* a, double* b, double* result);
    void gyro_scale(double* v, double scalar, double* result);
    
    // 변환
    void hyperbolic_translate(double* matrix, double* direction, double distance);
    void hyperbolic_rotate(double* matrix, double angle);
    
    // 측지선
    void geodesic_point(double* start, double* end, double t, double* result);
}
```

**컨벤션:**
- 배열은 포인터로 전달 (WASM 메모리 효율)
- 에러는 반환값으로 처리 (예외 사용 X)
- `double` 사용 (정밀도 중요)

### TypeScript

```typescript
// WASM 모듈 로딩
const hyperMath = await HyperMath.init();

// Gyrovector 클래스
class Gyrovector {
  constructor(public x: number, public y: number, public z: number) {}
  
  add(other: Gyrovector): Gyrovector {
    const result = new Float64Array(3);
    hyperMath.gyro_add(this.toArray(), other.toArray(), result);
    return Gyrovector.fromArray(result);
  }
}
```

**컨벤션:**
- 클래스는 PascalCase
- 함수/변수는 camelCase
- 상수는 UPPER_SNAKE_CASE
- 타입은 명시적으로

### GLSL 쉐이더

```glsl
// 정점 쉐이더: 쌍곡 → 유클리드 투영
vec3 hyperbolicToEuclidean(vec4 h) {
    // Poincaré ball model projection
    return h.xyz / (1.0 + h.w);
}

// 거리 감쇠 (쌍곡 거리 기반)
float hyperbolicAttenuation(float hypDist) {
    return 1.0 / (1.0 + hypDist * hypDist);
}
```

---

## Phase 1 작업 목록

### Week 1: 기초
- [ ] 프로젝트 스캐폴딩 (Vite + React + Three.js)
- [ ] C++ 빌드 파이프라인 (Emscripten + CMake)
- [ ] Gyrovector 클래스 구현 (C++)
- [ ] WASM 바인딩 & 로더

### Week 2: 렌더링
- [ ] 기본 Three.js 씬 셋업
- [ ] 쌍곡 정점 쉐이더 구현
- [ ] Poincaré disk 2D 시각화 (디버그용)
- [ ] 단일 타일 렌더링

### Week 3: 이동 & 타일링
- [ ] 쌍곡 카메라 컨트롤러 (WASD + 마우스)
- [ ] 측지선 기반 이동
- [ ] {7,3} 타일링 생성 (정칠각형)
- [ ] 동적 타일 로딩 (카메라 주변)

### Week 4: 폴리싱
- [ ] 조명 시스템 (쌍곡 거리 감쇠)
- [ ] 포그 효과
- [ ] 성능 최적화
- [ ] 데모 페이지 완성

---

## 참고 자료

### 논문
- "Adapting Game Engines to Curved Spaces" (Szirmay-Kalos & Magdics, 2021)
- "Gyrovector Spaces" (Ungar, 2008)

### 코드 참고
- [HyperRogue/RogueViz](https://github.com/zenorogue/hyperrogue) - 가장 성숙한 비유클리드 엔진
- [HyperEngine](https://github.com/HackerPoet/HyperEngine) - Hyperbolica 게임 엔진
- [CodeParade Devlogs](https://www.youtube.com/c/CodeParade) - 쌍곡 게임 개발 영상

### 수학
- [Hyperbolic Geometry (Wikipedia)](https://en.wikipedia.org/wiki/Hyperbolic_geometry)
- [Poincaré Disk Model](https://en.wikipedia.org/wiki/Poincar%C3%A9_disk_model)

---

## Claude CLI 작업 지시

### 코드 생성 시 주의사항
1. **수학적 정확성 최우선** - 쌍곡 연산은 반드시 검증된 공식 사용
2. **성능 고려** - 프레임마다 호출되는 함수는 최적화 필수
3. **점진적 구현** - 2D 검증 → 3D 확장 순서로
4. **테스트 포함** - 수학 함수는 반드시 단위 테스트 작성

### 질문하기 전에
- 쌍곡 기하학 기본 개념은 이 문서 참고
- Three.js 기본 사용법은 공식 문서 참고
- 구현 방향 불확실하면 먼저 질문

### 커밋 메시지 컨벤션
```
feat: 새 기능
fix: 버그 수정
refactor: 리팩토링
docs: 문서
test: 테스트
chore: 빌드/설정
```

---

## MVP 완료 기준 체크리스트

- [ ] 브라우저에서 60fps로 쌍곡 공간 렌더링
- [ ] WASD로 측지선 따라 이동
- [ ] 마우스로 시점 회전
- [ ] {7,3} 또는 {5,4} 타일링이 무한히 펼쳐짐
- [ ] 거리에 따른 시각적 왜곡이 체감됨
- [ ] 빌드 & 배포 가능 (Vercel/Netlify)
