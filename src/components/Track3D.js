'use client';

import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

function TrackLine({ coordinates }) {
    const curve = useMemo(() => {
        if (!coordinates?.length) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [lng, lat] of coordinates) {
            minX = Math.min(minX, lng);
            maxX = Math.max(maxX, lng);
            minY = Math.min(minY, lat);
            maxY = Math.max(maxY, lat);
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const xScale = Math.cos((centerY * Math.PI) / 180);
        // Fit the longest side into 20 scene units.
        const scale = 20 / Math.max((maxX - minX) * xScale, maxY - minY, 1e-9);
        const points = coordinates.map(([lng, lat]) => new THREE.Vector3(
            (lng - centerX) * xScale * scale,
            0,
            (lat - centerY) * -scale,
        ));
        return new THREE.CatmullRomCurve3(points, true);
    }, [coordinates]);

    if (!curve) return null;
    return (
        <group>
            <mesh>
                <tubeGeometry args={[curve, Math.max(200, coordinates.length * 3), 0.12, 8, true]} />
                <meshStandardMaterial color="#f5f5f5" roughness={0.5} metalness={0.2} />
            </mesh>
            <mesh position={curve.getPoint(0)}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial color="#e10600" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#151515" roughness={0.9} />
            </mesh>
        </group>
    );
}

export default function Track3D({ coordinates, label }) {
    const reduceMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return (
        <div style={{ width: '100%', height: '100%', background: '#0d0d0d' }} role="img" aria-label={label}>
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 16, 16]} fov={50} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 20, 10]} intensity={1.2} />
                <TrackLine coordinates={coordinates} />
                <OrbitControls enablePan={false} autoRotate={!reduceMotion} autoRotateSpeed={0.6} maxPolarAngle={Math.PI / 2.1} />
            </Canvas>
        </div>
    );
}
