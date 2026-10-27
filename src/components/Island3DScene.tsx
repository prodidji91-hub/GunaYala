import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

// Procedural Tropical Island Mesh
function IslandModel() {
  const islandRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (islandRef.current) {
      // Gentle floating / breathing motion
      islandRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
      // Subtle rotation
      islandRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={islandRef}>
      {/* Main Island Landmass / Hill */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[2.8, 3.2, 0.6, 32]} />
        <meshStandardMaterial color="#2d5a3f" roughness={0.8} />
      </mesh>

      {/* Island Sand Beach Ring */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 3.8, 32]} />
        <meshStandardMaterial color="#f4e4bc" roughness={0.9} />
      </mesh>

      {/* Shallow Turquoise Coastal Ring */}
      <mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.7, 5.5, 32]} />
        <meshStandardMaterial color="#22d3ee" transparent opacity={0.6} roughness={0.2} />
      </mesh>

      {/* Palm Trees (Multiple procedural clusters) */}
      {/* Palm 1 */}
      <group position={[1.2, 0.2, 0.8]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color="#1b4d3e" roughness={0.7} />
        </mesh>
      </group>

      {/* Palm 2 */}
      <group position={[-1.0, 0.3, -0.9]} rotation={[0.1, 0.4, -0.1]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 1.4, 8]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.45, 8, 8]} />
          <meshStandardMaterial color="#1b4d3e" roughness={0.7} />
        </mesh>
      </group>

      {/* Palm 3 */}
      <group position={[-0.8, 0.15, 1.1]} rotation={[-0.1, -0.2, 0.1]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.06, 0.09, 1.0, 8]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshStandardMaterial color="#2d5a3f" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// Ocean Water Plane with subtle wave animation
function OceanWater() {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = -0.48 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  return (
    <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
      <planeGeometry args={[25, 25, 32, 32]} />
      <meshStandardMaterial color="#0e7490" roughness={0.1} metalness={0.8} transparent opacity={0.85} />
    </mesh>
  );
}

interface Island3DSceneProps {
  onSelectStoryPoint: (index: number) => void;
  activePoint: number;
}

export const Island3DScene: React.FC<Island3DSceneProps> = ({ onSelectStoryPoint, activePoint }) => {
  return (
    <div className="w-full h-[400px] sm:h-[480px] lg:h-[540px] relative rounded-3xl overflow-hidden shadow-2xl border border-[#C8AC75]/40 bg-gradient-to-b from-[#061815] to-[#040E15]">
      <Canvas
        camera={{ position: [0, 3, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} color="#fffbeb" castShadow />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#22d3ee" />

        <OceanWater />
        <IslandModel />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minPolarAngle={Math.PI / 4}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.8}
        />
      </Canvas>

      {/* Floating Interactive Hotspots / Markers Overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-wrap items-center justify-center gap-3">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => onSelectStoryPoint(idx)}
            className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-2 shadow-lg backdrop-blur-md ${
              activePoint === idx
                ? 'bg-[#C8AC75] text-[#040E15] font-bold scale-105 border border-white'
                : 'bg-black/50 text-[#FAF8F5] border border-[#C8AC75]/40 hover:bg-[#0E3B2F]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#C8AC75]" />
            <span>Pillar 0{idx + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
