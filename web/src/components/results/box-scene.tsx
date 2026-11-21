"use client";

/**
 * One packed box in 3D: transparent wireframe box, items colored by SKU,
 * orbit controls. Engine axes (x = length, y = width, z = height) map to
 * three.js (x, z, y) so height points up.
 */
import { Canvas } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import type { PackedBox } from "@/engine/types";

interface Props {
  box: PackedBox;
  colors: ReadonlyMap<string, string>;
  /** Largest dimension across the boxes shown side by side (shared scale). */
  sceneSize: number;
}

export function BoxScene({ box, colors, sceneSize }: Props) {
  const L = box.length_in;
  const W = box.width_in;
  const H = box.height_in;
  const d = sceneSize * 1.9;
  return (
    <Canvas
      camera={{ position: [-d * 0.9, d * 0.75, -d], fov: 35, near: 0.1, far: d * 20 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label={`3D view of ${box.box_id}`}
    >
      <color attach="background" args={["#fbf9f6"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[d, d * 2, d * 1.5]} intensity={1.1} />
      <directionalLight position={[-d, d, -d]} intensity={0.35} />
      <group position={[-L / 2, -H / 2, -W / 2]}>
        {/* The box: faint walls + kraft edges. */}
        <mesh position={[L / 2, H / 2, W / 2]}>
          <boxGeometry args={[L, H, W]} />
          <meshStandardMaterial color="#b08d57" transparent opacity={0.08} depthWrite={false} />
          <Edges color="#7a5c2e" lineWidth={1.5} />
        </mesh>
        {/* Floor. */}
        <mesh position={[L / 2, 0.01, W / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L, W]} />
          <meshStandardMaterial color="#d9c4a0" transparent opacity={0.35} />
        </mesh>
        {box.items.map((it, i) => (
          <mesh key={i} position={[it.x + it.l / 2, it.z + it.h / 2, it.y + it.w / 2]}>
            <boxGeometry args={[it.l * 0.985, it.h * 0.985, it.w * 0.985]} />
            <meshStandardMaterial color={colors.get(it.sku) ?? "#888888"} roughness={0.7} />
            <Edges color="#ffffff" />
          </mesh>
        ))}
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={sceneSize * 0.8}
        maxDistance={sceneSize * 6}
      />
    </Canvas>
  );
}
