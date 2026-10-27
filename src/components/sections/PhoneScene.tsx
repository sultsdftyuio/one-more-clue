"use client";

import { ContactShadows, Environment, Lightformer, RoundedBox, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CANVAS_TALL, phoneScreens } from "./PhoneFrame";

/** Phone size in scene units: 1 unit is the phone's width. The screen keeps the screenshots' 469:1015 shape. */
const W = 1;
const H = 2.12;
const D = 0.1;
const SCREEN_W = 0.9;
const SCREEN_H = SCREEN_W * (1015 / 469);
const FRONT = D / 2;
const CORNER = 0.15;

/** The camera sits where the phone fills its slot exactly, given the canvas is CANVAS_TALL times the slot. */
const FOV = 26;
const CAMERA_Z = ((H * CANVAS_TALL) / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

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
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 16);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  return g;
}

/** The body: a rounded-corner slab with bevelled edges, centred on z=0 and exactly W x H x D. */
function bodyGeometry() {
  const bevel = 0.022;
  const g = new THREE.ExtrudeGeometry(roundedShape(W - bevel * 2, H - bevel * 2, CORNER - bevel), {
    depth: D - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 24,
  });
  g.translate(0, 0, -(D - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/** The screen: the current screenshot fades in over the last one when the step changes. */
function Screen({ screen }: { screen: number }) {
  const textures = useTexture(phoneScreens.map((s) => s.src));
  const geometry = useMemo(() => roundedRect(SCREEN_W, SCREEN_H, CORNER - 0.05), []);
  const under = useRef<THREE.MeshBasicMaterial>(null);
  const over = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef({ from: screen, to: screen, t: 1 });

  useMemo(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    }
  }, [textures]);

  useEffect(() => {
    const f = fade.current;
    if (f.to === screen) return;
    f.from = f.t < 0.5 ? f.from : f.to;
    f.to = screen;
    f.t = 0;
  }, [screen]);

  useFrame((_, dt) => {
    const f = fade.current;
    f.t = Math.min(1, f.t + dt * 2.6);
    if (!under.current || !over.current) return;
    under.current.map = textures[f.from];
    over.current.map = textures[f.to];
    over.current.opacity = THREE.MathUtils.smoothstep(f.t, 0, 1);
  });

  return (
    <group position={[0, 0, FRONT + 0.003]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial ref={under} map={textures[screen]} toneMapped={false} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0, 0.0005]}>
        <meshBasicMaterial ref={over} map={textures[screen]} toneMapped={false} transparent />
      </mesh>
    </group>
  );
}

function Phone({ screen, rotateX, rotateY }: { screen: number; rotateX: MotionValue<number>; rotateY: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const body = useMemo(bodyGeometry, []);
  const bezel = useMemo(() => roundedRect(W - 0.05, H - 0.05, CORNER - 0.025), []);
  const island = useMemo(() => roundedRect(0.22, 0.064, 0.032), []);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, THREE.MathUtils.degToRad(rotateY.get()), 6, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, THREE.MathUtils.degToRad(rotateX.get()), 6, dt);
    g.position.y = Math.sin(state.clock.elapsedTime * 1.25) * 0.035;
  });

  return (
    <group ref={group}>
      {/* Metal body. */}
      <mesh geometry={body}>
        <meshPhysicalMaterial color="#3a4080" metalness={0.9} roughness={0.24} clearcoat={0.8} clearcoatRoughness={0.12} />
      </mesh>
      {/* Black glass front, with the screen just under it. */}
      <mesh geometry={bezel} position={[0, 0, FRONT + 0.001]}>
        <meshPhysicalMaterial color="#05060f" metalness={0.2} roughness={0.08} clearcoat={1} clearcoatRoughness={0.03} />
      </mesh>
      <Screen screen={screen} />
      <mesh geometry={island} position={[0, SCREEN_H / 2 - 0.065, FRONT + 0.0045]}>
        <meshBasicMaterial color="#05060f" />
      </mesh>
      {/* Glass reflection: added on top, so it only ever brightens where the studio lights catch it. */}
      <mesh geometry={bezel} position={[0, 0, FRONT + 0.005]}>
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.06} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Side buttons. */}
      {[
        { x: W / 2 + 0.006, y: 0.42, h: 0.26 },
        { x: -W / 2 - 0.006, y: 0.55, h: 0.15 },
        { x: -W / 2 - 0.006, y: 0.35, h: 0.15 },
      ].map((b) => (
        <RoundedBox key={`${b.x}${b.y}`} args={[0.018, b.h, 0.045]} radius={0.008} position={[b.x, b.y, 0]}>
          <meshPhysicalMaterial color="#3a4080" metalness={0.9} roughness={0.3} />
        </RoundedBox>
      ))}
      {/* Camera bump on the back. */}
      <group position={[-0.24, H / 2 - 0.3, -FRONT - 0.012]}>
        <RoundedBox args={[0.4, 0.4, 0.03]} radius={0.012}>
          <meshPhysicalMaterial color="#262b55" metalness={0.6} roughness={0.35} clearcoat={0.6} />
        </RoundedBox>
        {[
          [-0.085, 0.085],
          [-0.085, -0.085],
          [0.085, 0.085],
        ].map(([x, y]) => (
          <mesh key={`${x}${y}`} position={[x, y, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.02, 32]} />
            <meshPhysicalMaterial color="#05060f" metalness={0.3} roughness={0.05} clearcoat={1} />
          </mesh>
        ))}
        <mesh position={[0.085, -0.085, -0.016]}>
          <circleGeometry args={[0.025, 24]} />
          <meshBasicMaterial color="#ffe6a7" side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Studio lighting built from light panels inside the scene, so nothing is
 * fetched: a big softbox overhead, two strips that run down the metal edges,
 * and warm and lilac kicks from the site's palette.
 */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[-4, 0, 2]} rotation-y={Math.PI / 2.4} scale={[0.6, 8, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[4, 0.5, 2]} rotation-y={-Math.PI / 2.4} scale={[0.5, 8, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#f2b33d" position={[3, -2, 3]} scale={1.6} />
      <Lightformer form="rect" intensity={0.8} color="#9b87f5" position={[-3, -3, -2]} scale={[4, 2, 1]} />
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
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

/** The WebGL phone, for laptops and tablets. Loaded on demand by PhoneStage. */
export default function PhoneScene({ screen, rotateX, rotateY, onReady, onLost, active }: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: FOV, position: [0, 0, CAMERA_Z] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.domElement.addEventListener("webglcontextlost", onLost, { once: true });
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <Suspense fallback={null}>
        <Studio />
        <Phone screen={screen} rotateX={rotateX} rotateY={rotateY} />
        <ContactShadows position={[0, -H / 2 - 0.12, 0]} opacity={0.42} scale={3} blur={2.6} far={1.2} resolution={256} color="#1b1f3b" />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
