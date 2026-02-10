# Escheria

> 브라우저에서 쌍곡(Hyperbolic) 공간을 탐험하는 비유클리드 렌더링 엔진

<img width="1262" height="553" alt="image" src="https://github.com/user-attachments/assets/d8d5c100-28c1-4e70-bac7-e2534271b85b" />

*"에셔의 세계로 걸어 들어가다"*

## Demo

[Live Demo](https://escheria.vercel.app) *(배포 후 URL 업데이트)*

## Features

- **쌍곡 기하학 렌더링**: Poincaré disk 모델 기반 실시간 렌더링
- **{7,3} 타일링**: 정칠각형이 각 꼭짓점에서 3개씩 만나는 쌍곡 타일링
- **동적 타일 로딩**: 카메라 주변 타일만 생성/삭제하여 무한 탐험 가능
- **WASM 가속**: C++ 수학 연산을 WebAssembly로 컴파일하여 성능 최적화
- **측지선 이동**: 쌍곡 공간의 "직선"을 따라 이동

## Controls

| 키 | 동작 |
|---|------|
| W / ↑ | 앞으로 이동 |
| S / ↓ | 뒤로 이동 |
| A / ← | 왼쪽 이동 |
| D / → | 오른쪽 이동 |
| 마우스 드래그 | 시점 회전 |

## Tech Stack

```
├── Frontend: React + TypeScript + Vite
├── 3D Rendering: Three.js + Custom GLSL Shaders
├── Math Core: C++ → WebAssembly (Emscripten)
└── Geometry: Gyrovector algebra, Möbius transformations
```

## Project Structure

```
escheria/
├── src/
│   ├── core/           # 수학 라이브러리 (Gyrovector, 쌍곡 변환)
│   │   ├── gyrovector.ts
│   │   ├── hyperbolic.ts
│   │   └── wasm/       # WASM 로더
│   ├── engine/         # Three.js 엔진
│   │   ├── HyperbolicEngine.ts
│   │   ├── HyperbolicCamera.ts
│   │   ├── HyperbolicTiling.ts
│   │   └── HyperbolicMaterial.ts
│   ├── shaders/        # GLSL 쉐이더
│   └── components/     # React 컴포넌트
├── wasm/               # C++ 소스 (Emscripten)
│   └── src/
│       ├── gyrovector.hpp/cpp
│       ├── hyperbolic.hpp/cpp
│       └── main.cpp    # Embind 바인딩
└── public/wasm/        # 빌드된 WASM 모듈
```

## Development

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm

### Setup

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build
```

### WASM 빌드 (선택사항)

C++ 수학 코어를 수정하려면 Emscripten이 필요합니다:

```bash
# Emscripten 설치
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source emsdk_env.sh

# WASM 빌드
cd wasm
mkdir -p build && cd build
emcmake cmake ..
emmake make
```

## Core Concepts

### Poincaré Disk Model

쌍곡 평면을 단위 원 내부에 매핑한 모델:
- 원의 경계 = 무한대
- 측지선(직선) = 원과 직교하는 원호

### Gyrovector

쌍곡 공간에서의 "벡터". Möbius 덧셈으로 정의:

```
a ⊕ b = ((1 + 2⟨a,b⟩ + |b|²)a + (1 - |a|²)b) / (1 + 2⟨a,b⟩ + |a|²|b|²)
```

### {p,q} Tiling

- **p**: 각 타일의 변의 수
- **q**: 각 꼭짓점에서 만나는 타일 수
- (p-2)(q-2) > 4 일 때 쌍곡 타일링

## Progress

### Completed
- [x] 프로젝트 스캐폴딩 (Vite + React + Three.js)
- [x] Gyrovector 클래스 (JS + WASM)
- [x] 쌍곡 ShaderMaterial
- [x] Poincaré disk 디버그 뷰
- [x] {7,3} 타일링 생성
- [x] WASD 카메라 컨트롤
- [x] 측지선 기반 이동
- [x] 동적 타일 로딩
- [x] WASM 빌드 및 통합

### TODO
- [ ] 조명 시스템 (쌍곡 거리 감쇠)
- [ ] 포그 효과
- [ ] 3D 확장 (현재 2D 평면)
- [ ] 다양한 타일링 선택 UI
- [ ] 1인칭 시점

## References

- [HyperRogue](https://github.com/zenorogue/hyperrogue) - 가장 성숙한 비유클리드 게임
- [Hyperbolica](https://store.steampowered.com/app/1256230/Hyperbolica/) - 3D 쌍곡 공간 게임
- [Gyrovector Spaces](https://en.wikipedia.org/wiki/Gyrovector_space) - 수학적 배경

## License

MIT
