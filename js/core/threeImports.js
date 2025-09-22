// js/core/threeImports.js
/**
 * Централизованный модуль импортов Three.js
 * Предотвращает дублирование импортов и конфликты версий
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r165/three.module.min.js';

// Экспортируем основные классы Three.js
export { THREE };
export const {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Mesh,
  Points,
  Line,
  Vector3,
  Vector2,
  Color,
  Texture,
  DataTexture,
  ShaderLib,
  UniformsUtils,
  Clock,
  Raycaster,
  Group,
  Object3D,
  Matrix4,
  Quaternion,
  Euler,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  PointsMaterial,
  LineBasicMaterial,
  RawShaderMaterial,
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  HemisphereLight,
  RectAreaLight,
  Fog,
  FogExp2,
  TextureLoader,
  CubeTextureLoader,
  FontLoader,
  JSONLoader,
  OBJLoader,
  MTLLoader,
  GLTFLoader,
  DRACOLoader,
  AnimationMixer,
  AnimationClip,
  KeyframeTrack,
  PropertyBinding,
  InterpolateLinear,
  InterpolateSmooth,
  InterpolateDiscrete,
  LoopRepeat,
  LoopOnce,
  LoopPingPong,
  ZeroCurvatureEnding,
  ZeroSlopeEnding,
  WrapAroundEnding,
  NormalAnimationBlendMode,
  AdditiveAnimationBlendMode,
  TrianglesDrawMode,
  TriangleStripDrawMode,
  TriangleFanDrawMode,
  LinearEncoding,
  sRGBEncoding,
  GammaEncoding,
  RGBEEncoding,
  LogLuvEncoding,
  RGBM7Encoding,
  RGBM16Encoding,
  RGBDEncoding,
  BasicShadowMap,
  PCFShadowMap,
  PCFSoftShadowMap,
  VSMShadowMap,
  FrontSide,
  BackSide,
  DoubleSide,
  FlatShading,
  SmoothShading,
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  CustomBlending,
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor,
  SrcAlphaSaturateFactor,
  NeverDepth,
  AlwaysDepth,
  LessDepth,
  LessEqualDepth,
  EqualDepth,
  GreaterEqualDepth,
  GreaterDepth,
  NotEqualDepth,
  MultiplyOperation,
  MixOperation,
  AddOperation,
  NoToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  ACESFilmicToneMapping,
  CustomToneMapping,
  UVMapping,
  CubeReflectionMapping,
  CubeRefractionMapping,
  EquirectangularReflectionMapping,
  EquirectangularRefractionMapping,
  SphericalReflectionMapping,
  CubeUVReflectionMapping,
  CubeUVRefractionMapping,
  RepeatWrapping,
  ClampToEdgeWrapping,
  MirroredRepeatWrapping,
  NearestFilter,
  NearestMipmapNearestFilter,
  NearestMipmapLinearFilter,
  LinearFilter,
  LinearMipmapNearestFilter,
  LinearMipmapLinearFilter,
  UnsignedByteType,
  ByteType,
  ShortType,
  UnsignedShortType,
  IntType,
  UnsignedIntType,
  FloatType,
  HalfFloatType,
  UnsignedShort4444Type,
  UnsignedShort5551Type,
  UnsignedShort565Type,
  UnsignedInt248Type,
  AlphaFormat,
  RGBFormat,
  RGBAFormat,
  LuminanceFormat,
  LuminanceAlphaFormat,
  RGBEFormat,
  DepthFormat,
  DepthStencilFormat,
  RedFormat,
  RedIntegerFormat,
  RGFormat,
  RGIntegerFormat,
  RGBIntegerFormat,
  RGBAIntegerFormat,
  _SRGBAFormat,
  RGBA_ASTC_4x4_Format,
  RGBA_ASTC_5x4_Format,
  RGBA_ASTC_5x5_Format,
  RGBA_ASTC_6x5_Format,
  RGBA_ASTC_6x6_Format,
  RGBA_ASTC_8x5_Format,
  RGBA_ASTC_8x6_Format,
  RGBA_ASTC_8x8_Format,
  RGBA_ASTC_10x5_Format,
  RGBA_ASTC_10x6_Format,
  RGBA_ASTC_10x8_Format,
  RGBA_ASTC_10x10_Format,
  RGBA_ASTC_12x10_Format,
  RGBA_ASTC_12x12_Format,
  SRGB8_ALPHA8_ASTC_4x4_Format,
  SRGB8_ALPHA8_ASTC_5x4_Format,
  SRGB8_ALPHA8_ASTC_5x5_Format,
  SRGB8_ALPHA8_ASTC_6x5_Format,
  SRGB8_ALPHA8_ASTC_6x6_Format,
  SRGB8_ALPHA8_ASTC_8x5_Format,
  SRGB8_ALPHA8_ASTC_8x6_Format,
  SRGB8_ALPHA8_ASTC_8x8_Format,
  SRGB8_ALPHA8_ASTC_10x5_Format,
  SRGB8_ALPHA8_ASTC_10x6_Format,
  SRGB8_ALPHA8_ASTC_10x8_Format,
  SRGB8_ALPHA8_ASTC_10x10_Format,
  SRGB8_ALPHA8_ASTC_12x10_Format,
  SRGB8_ALPHA8_ASTC_12x12_Format
} = THREE;

// Экспортируем математические функции
export const MathUtils = THREE.MathUtils;

// Экспортируем утилиты
export const {
  EventDispatcher,
  Layers,
  Raycaster,
  Triangle,
  Spherical,
  Cylindrical,
  Plane,
  Frustum,
  Sphere,
  Box3,
  Matrix3
} = THREE;

// Функция для проверки доступности WebGL
export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
              canvas.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

// Функция для создания базового рендерера
export function createBasicRenderer(canvas, options = {}) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: options.antialias !== false,
    alpha: options.alpha || false,
    powerPreference: options.powerPreference || 'default'
  });

  if (options.size) {
    renderer.setSize(options.size.width, options.size.height);
  }

  if (options.pixelRatio) {
    renderer.setPixelRatio(options.pixelRatio);
  }

  return renderer;
}

// Функция для создания базовой камеры
export function createBasicCamera(fov = 75, aspect = window.innerWidth / window.innerHeight, near = 0.1, far = 1000) {
  return new PerspectiveCamera(fov, aspect, near, far);
}

// Функция для создания базовой сцены
export function createBasicScene() {
  const scene = new Scene();
  scene.background = new Color(0x000000);
  return scene;
}

// Экспортируем версию Three.js для отладки
export const THREE_VERSION = THREE.REVISION;
