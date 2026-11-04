"use client";

import { Environment, Lightformer, RoundedBox, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CANVAS_TALL, phoneScreens, SCREEN_ASPECT } from "./PhoneFrame";

/** Phone size in scene units: 1 unit is the phone's width. The screen keeps the screenshots' shape. */
const SCREEN_W = 0.9;
const SCREEN_H = SCREEN_W * SCREEN_ASPECT;
const BORDER = 0.05;
const W = SCREEN_W + BORDER * 2;
const H = SCREEN_H + BORDER * 2;
const D = 0.095;
const FRONT = D / 2;
const CORNER = 0.165;
const SCREEN_CORNER = CORNER - BORDER + 0.005;
/** The status bar is the top 47 of the screens' 859 pixels; the camera cut-out sits in it. */
const STATUS_BAR = (47 / 859) * SCREEN_H;

/** The camera sits where the phone fills its slot exactly, given the canvas is CANVAS_TALL times the slot. */
const FOV = 26;
const CAMERA_Z = ((H * CANVAS_TALL) / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const TITANIUM = "#5a64a8";

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A flat rounded rectangle with its UVs spread 0-1 over the whole shape, for screens and glass. */
function roundedRect(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 24);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  return g;
}

/** The titanium frame: a rounded slab with soft bevelled edges, centred on z=0 and exactly W x H x D. */
function frameGeometry() {
  const bevel = 0.026;
  const g = new THREE.ExtrudeGeometry(roundedShape(W - bevel * 2, H - bevel * 2, CORNER - bevel), {
    depth: D - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 10,
    curveSegments: 32,
  });
  g.translate(0, 0, -(D - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * The screen moves on like an app: the next screen slides up over the last,
 * which drifts up and dims in its shadow, with a thin lit edge on the newcomer.
 */
const screenShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D uFrom;
    uniform sampler2D uTo;
    uniform float uProgress;
    varying vec2 vUv;
    void main() {
      float p = uProgress;
      vec3 from = texture2D(uFrom, vec2(vUv.x, vUv.y - 0.22 * p)).rgb;
      from *= 1.0 - 0.5 * p;
      from *= mix(0.55, 1.0, smoothstep(p, p + 0.1, vUv.y));
      vec3 to = texture2D(uTo, vec2(vUv.x, vUv.y + 1.0 - p)).rgb;
      vec3 color = mix(from, to, step(vUv.y, p));
      float moving = step(0.001, p) * (1.0 - step(0.999, p));
      color += vec3(1.0, 0.93, 0.8) * 0.22 * moving * (1.0 - smoothstep(0.0, 0.005, abs(vUv.y - p)));
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }
  `,
};

function Screen({ screen }: { screen: number }) {
  const textures = useTexture(phoneScreens.map((s) => s.src));
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const geometry = useMemo(() => roundedRect(SCREEN_W, SCREEN_H, SCREEN_CORNER), []);
  const move = useRef({ from: screen, to: screen, t: 1 });
  const uniforms = useMemo(() => ({ uFrom: { value: null as THREE.Texture | null }, uTo: { value: null as THREE.Texture | null }, uProgress: { value: 1 } }), []);

  useMemo(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = anisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
    }
  }, [textures, anisotropy]);

  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const mv = move.current;
    if (mv.to === screen) return;
    // A step change mid-move starts from whichever screen is mostly showing.
    mv.from = mv.t < 0.5 ? mv.from : mv.to;
    mv.to = screen;
    mv.t = 0;
    invalidate();
  }, [screen, invalidate]);

  useFrame((state, dt) => {
    const mv = move.current;
    // Frames are drawn on demand, so the first one after a still spell can carry a long dt.
    mv.t = Math.min(1, mv.t + Math.min(dt, 1 / 30) / 0.75);
    uniforms.uFrom.value = textures[mv.from];
    uniforms.uTo.value = textures[mv.to];
    uniforms.uProgress.value = 1 - Math.pow(1 - mv.t, 4);
    if (mv.t < 1) state.invalidate();
  });

  return (
    <mesh geometry={geometry} position={[0, 0, FRONT + 0.0025]}>
      {/* Uniforms go in through the constructor: passed as a prop they're copied, and the frame loop would update a stale copy. */}
      <shaderMaterial args={[{ ...screenShader, uniforms }]} toneMapped={false} />
    </mesh>
  );
}

/** A soft streak of studio light across the glass that slides as the phone turns. */
const glareShader = {
  vertexShader: screenShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform float uAt;
    varying vec2 vUv;
    void main() {
      float d = (vUv.x * 0.9 + vUv.y * 0.45) - uAt;
      float streak = exp(-d * d / 0.004) * 0.09 + exp(-(d - 0.16) * (d - 0.16) / 0.0008) * 0.045;
      float top = smoothstep(0.7, 1.0, vUv.y) * 0.025;
      gl_FragColor = vec4(vec3(1.0, 0.97, 0.92), streak + top);
    }
  `,
};

function Phone({ screen, rotateX, rotateY }: { screen: number; rotateX: MotionValue<number>; rotateY: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const frame = useMemo(frameGeometry, []);
  const glass = useMemo(() => roundedRect(W - 0.014, H - 0.014, CORNER - 0.007), []);
  const back = useMemo(() => roundedRect(W - 0.02, H - 0.02, CORNER - 0.01), []);
  const island = useMemo(() => roundedRect(0.27, 0.072, 0.036), []);
  const glare = useMemo(() => ({ uAt: { value: 0.5 } }), []);
  // Each step change kicks the phone round a little; a spring brings it back.
  const kick = useRef({ x: 0, v: 0, last: screen });
  // The turn the scroll and pointer ask for, smoothed.
  const turned = useRef({ x: 0, y: 0 });

  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const k = kick.current;
    if (k.last === screen) return;
    k.v += (screen > k.last ? 1 : -1) * 4.2;
    k.last = screen;
    invalidate();
  }, [screen, invalidate]);

  // Draw when the scroll or the pointer turns the phone; otherwise the last frame stands.
  useEffect(() => {
    const wake = () => invalidate();
    const offX = rotateX.on("change", wake);
    const offY = rotateY.on("change", wake);
    wake();
    return () => {
      offX();
      offY();
    };
  }, [rotateX, rotateY, invalidate]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    // Frames are drawn on demand, so the first one after a still spell can carry a long dt.
    const step = Math.min(dt, 1 / 30);
    const k = kick.current;
    k.v += (-90 * k.x - 11 * k.v) * step;
    k.x += k.v * step;
    const turn = turned.current;
    const wantY = THREE.MathUtils.degToRad(rotateY.get());
    const wantX = THREE.MathUtils.degToRad(rotateX.get());
    turn.y = THREE.MathUtils.damp(turn.y, wantY, 6, step);
    turn.x = THREE.MathUtils.damp(turn.x, wantX, 6, step);
    g.rotation.y = turn.y + k.x;
    g.rotation.x = turn.x;
    g.rotation.z = -k.x * 0.08;
    // The idle float is CSS on the canvas (PhoneStage), so a still phone costs nothing to show.
    g.position.y = Math.abs(k.x) * 0.12;
    glare.uAt.value = 0.62 - g.rotation.y * 1.1;
    const settled = Math.abs(k.x) < 1e-4 && Math.abs(k.v) < 1e-3 && Math.abs(turn.y - wantY) < 1e-4 && Math.abs(turn.x - wantX) < 1e-4;
    if (!settled) state.invalidate();
  });

  return (
    <group ref={group}>
      {/* Titanium frame. */}
      <mesh geometry={frame}>
        <meshPhysicalMaterial color={TITANIUM} metalness={1} roughness={0.22} anisotropy={0.8} anisotropyRotation={Math.PI / 2} clearcoat={0.35} clearcoatRoughness={0.2} />
      </mesh>
      {/* Black glass front: reflects the studio, with the screen just under it. */}
      <mesh geometry={glass} position={[0, 0, FRONT + 0.0015]}>
        <meshPhysicalMaterial color="#04050c" metalness={0} roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={1.6} />
      </mesh>
      <Screen screen={screen} />
      <mesh geometry={island} position={[0, SCREEN_H / 2 - STATUS_BAR / 2, FRONT + 0.004]}>
        <meshBasicMaterial color="#020308" />
      </mesh>
      <mesh geometry={glass} position={[0, 0, FRONT + 0.006]}>
        <shaderMaterial args={[{ ...glareShader, uniforms: glare }]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Frosted glass back. */}
      <mesh geometry={back} position={[0, 0, -FRONT - 0.0015]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial color="#2b3163" metalness={0.15} roughness={0.42} clearcoat={1} clearcoatRoughness={0.25} />
      </mesh>
      {/* Side buttons. */}
      {[
        { x: W / 2 + 0.005, y: 0.4, h: 0.28 },
        { x: -W / 2 - 0.005, y: 0.58, h: 0.16 },
        { x: -W / 2 - 0.005, y: 0.36, h: 0.16 },
        { x: -W / 2 - 0.005, y: 0.82, h: 0.07 },
      ].map((b) => (
        <RoundedBox key={`${b.x}${b.y}`} args={[0.016, b.h, 0.04]} radius={0.007} smoothness={4} position={[b.x, b.y, 0]}>
          <meshPhysicalMaterial color={TITANIUM} metalness={1} roughness={0.28} />
        </RoundedBox>
      ))}
      {/* Camera bump on the back. */}
      <group position={[-0.22, H / 2 - 0.29, -FRONT - 0.014]}>
        <RoundedBox args={[0.42, 0.42, 0.028]} radius={0.1} smoothness={6}>
          <meshPhysicalMaterial color="#323a72" metalness={0.5} roughness={0.25} clearcoat={1} />
        </RoundedBox>
        {[
          [-0.09, 0.09],
          [-0.09, -0.09],
          [0.09, 0.09],
        ].map(([x, y]) => (
          <group key={`${x}${y}`} position={[x, y, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.068, 0.068, 0.022, 48]} />
              <meshPhysicalMaterial color={TITANIUM} metalness={1} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.0115, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.002, 48]} />
              <meshPhysicalMaterial color="#05060f" metalness={0.2} roughness={0.02} clearcoat={1} iridescence={0.6} iridescenceIOR={1.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[0.09, -0.09, -0.016]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.026, 32]} />
          <meshBasicMaterial color="#ffe6a7" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Studio lighting built from light panels inside the scene, so nothing is
 * fetched: a softbox overhead, strips that run down the titanium edges, and
 * warm, lilac and coral kicks from the site's palette.
 */
function Studio() {
  return (
    <Environment resolution={512} frames={1}>
      <Lightformer form="rect" intensity={2.4} position={[0, 4, 3]} scale={[8, 2.5, 1]} />
      <Lightformer form="rect" intensity={3} position={[-3.5, 0.5, 2]} rotation-y={Math.PI / 2.6} scale={[0.35, 9, 1]} />
      <Lightformer form="rect" intensity={2.2} color="#ffe2b0" position={[3.5, 0, 2]} rotation-y={-Math.PI / 2.6} scale={[0.3, 9, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[0, -3, 3]} rotation-x={-Math.PI / 3} scale={[6, 1, 1]} />
      <Lightformer form="ring" intensity={2} color="#f2b33d" position={[3, -1.5, -2]} scale={2} />
      <Lightformer form="rect" intensity={1.6} color="#9b87f5" position={[-3, -2, -2]} scale={[4, 2, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ef5b5b" position={[-2, 3, -3]} scale={[3, 1, 1]} />
    </Environment>
  );
}

type Props = {
  screen: number;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  /** Called once the phone has drawn with its textures, so the CSS phone can step aside. */
  onReady: () => void;
  /** Called if the browser drops the WebGL context; the CSS phone takes over again. */
  onLost: () => void;
  /** Whether the canvas is on screen; it stops drawing when it isn't. */
  active: boolean;
};

/** Signals ready on the first frame after everything inside the Suspense has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

/** Brings the frame up to date when the canvas scrolls back on screen. */
function Wake({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  return null;
}

/**
 * The WebGL phone, for laptops and tablets. Loaded on demand by PhoneStage.
 * It draws only while something moves (a turn, a screen change, the kick), at
 * no more than 1.5x pixel density; its shadow on the ground is the CSS phone's.
 */
export default function PhoneScene({ screen, rotateX, rotateY, onReady, onLost, active }: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "demand" : "never"}
      camera={{ fov: FOV, position: [0, 0, CAMERA_Z] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", onLost, { once: true });
      }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <Wake active={active} />
      <Suspense fallback={null}>
        <Studio />
        <Phone screen={screen} rotateX={rotateX} rotateY={rotateY} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
