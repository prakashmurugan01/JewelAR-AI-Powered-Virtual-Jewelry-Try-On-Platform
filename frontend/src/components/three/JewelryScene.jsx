import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';

/* ───── Animated Torus (Ring) ───── */
function Ring({ position = [0, 0, 0], scale = 1, color = '#d946ef', speed = 1 }) {
  const ref = useRef();
  useFrame((state) => {
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.3 + 0.5;
    ref.current.rotation.y += 0.008 * speed;
    ref.current.rotation.z = Math.cos(state.clock.elapsedTime * speed * 0.3) * 0.1;
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.5}>
      <mesh ref={ref} position={position} scale={scale} castShadow>
        <torusGeometry args={[1, 0.25, 32, 100]} />
        <MeshDistortMaterial
          color={color}
          metalness={0.95}
          roughness={0.05}
          distort={0.15}
          speed={2}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
}

/* ───── Diamond Gem ───── */
function Diamond({ position = [0, 0, 0], scale = 0.3, color = '#f0abfc' }) {
  const ref = useRef();
  useFrame((state) => {
    ref.current.rotation.y += 0.015;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <octahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.1}
        roughness={0}
        transmission={0.9}
        thickness={2}
        ior={2.4}
        envMapIntensity={3}
        clearcoat={1}
        clearcoatRoughness={0}
      />
    </mesh>
  );
}

/* ───── Necklace Chain (Catenary Curve) ───── */
function Chain({ position = [0, 0, 0], scale = 1 }) {
  const ref = useRef();
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI;
      const x = (t - Math.PI / 2) * 1.2;
      const y = -Math.cosh(t - Math.PI / 2) * 0.25 + 0.3;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  useFrame((state) => {
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    ref.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.2) * 0.05;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.8}>
      <group ref={ref} position={position} scale={scale}>
        <mesh>
          <tubeGeometry args={[curve, 80, 0.03, 12, false]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Pendant */}
        <Diamond position={[0, -0.65, 0]} scale={0.2} color="#c084fc" />
      </group>
    </Float>
  );
}

/* ───── Earring Drop ───── */
function Earring({ position, side = 1 }) {
  const ref = useRef();
  useFrame((state) => {
    const swing = Math.sin(state.clock.elapsedTime * 1.2 + side) * 0.08;
    ref.current.rotation.z = swing;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  return (
    <Float speed={2.5} floatIntensity={0.5}>
      <group ref={ref} position={position}>
        {/* Hook */}
        <mesh>
          <torusGeometry args={[0.12, 0.015, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Drop */}
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshPhysicalMaterial
            color="#e879f9"
            metalness={0.3}
            roughness={0}
            transmission={0.7}
            thickness={1}
            ior={2.0}
            clearcoat={1}
          />
        </mesh>
        {/* Teardrop pendant */}
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.05} />
        </mesh>
      </group>
    </Float>
  );
}

/* ───── Floating Particles Background ───── */
function ParticleField() {
  return (
    <>
      <Sparkles
        count={120}
        size={2.5}
        speed={0.4}
        scale={[15, 10, 10]}
        color="#d946ef"
        opacity={0.6}
      />
      <Sparkles
        count={80}
        size={1.8}
        speed={0.3}
        scale={[12, 8, 8]}
        color="#f97316"
        opacity={0.4}
      />
      <Sparkles
        count={60}
        size={3}
        speed={0.2}
        scale={[10, 10, 10]}
        color="#fbbf24"
        opacity={0.3}
      />
    </>
  );
}

/* ───── Orbiting Sphere ───── */
function OrbitSphere({ radius = 3, speed = 0.5, size = 0.08, color = '#d946ef', offset = 0 }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 2) * 0.5;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
    </mesh>
  );
}

/* ═══════════ MAIN SCENE ═══════════ */
export default function JewelryScene({ className = '' }) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-3, 2, 2]} intensity={1} color="#d946ef" />
        <pointLight position={[3, -1, 3]} intensity={0.8} color="#f97316" />
        <spotLight position={[0, 5, 0]} angle={0.5} penumbra={1} intensity={0.5} color="#fbbf24" />

        {/* HDR Environment for reflections */}
        <Environment preset="city" />

        {/* Main jewelry pieces */}
        <Ring position={[0, 0.3, 0]} scale={0.9} color="#d946ef" speed={1} />
        <Chain position={[0, -0.5, -1]} scale={1.2} />
        <Earring position={[-2.2, 0.8, -0.5]} side={1} />
        <Earring position={[2.2, 0.8, -0.5]} side={-1} />
        <Diamond position={[0, 1.8, -1]} scale={0.25} color="#c084fc" />

        {/* Orbiting accent spheres */}
        <OrbitSphere radius={3.5} speed={0.4} size={0.06} color="#d946ef" offset={0} />
        <OrbitSphere radius={3.5} speed={0.4} size={0.05} color="#f97316" offset={2.09} />
        <OrbitSphere radius={3.5} speed={0.4} size={0.04} color="#fbbf24" offset={4.19} />

        {/* Floating sparkle particles */}
        <ParticleField />
      </Canvas>
    </div>
  );
}
