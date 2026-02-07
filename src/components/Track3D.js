'use client';

import trackData from '@/lib/f1-circuits.json';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

function TrackLine({ coords }) {
    const lineRef = useRef();

    // Convert GeoJSON coords (lng, lat) to Vector3 (x, y, z)
    const points = useMemo(() => {
        if (!coords || coords.length === 0) return [];

        // Find center to normalize
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        coords.forEach(([lng, lat]) => {
            minX = Math.min(minX, lng);
            maxX = Math.max(maxX, lng);
            minY = Math.min(minY, lat);
            maxY = Math.max(maxY, lat);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Scale factor to make track reasonable size (e.g., extend 10 units)
        const scale = 1000; // Adjust based on lat/lng difference magnitude

        return coords.map(([lng, lat]) => {
            const x = (lng - centerX) * scale;
            const z = (lat - centerY) * -scale; // Flip Z for correct orientation
            return new THREE.Vector3(x, 0, z);
        });
    }, [coords]);

    if (points.length === 0) return null;

    // Create a smooth curve
    const curve = useMemo(() => new THREE.CatmullRomCurve3(points, true), [points]);

    return (
        <group>
            {/* Glowing Neon Track */}
            <mesh>
                <tubeGeometry args={[curve, 200, 0.15, 8, true]} />
                <meshStandardMaterial
                    color="#ff0000"
                    emissive="#ff0000"
                    emissiveIntensity={2}
                    roughness={0.4}
                    metalness={0.8}
                />
            </mesh>

            {/* Base/Ground reflection hint */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

function AnimatedCamera() {
    useFrame(({ clock, camera }) => {
        // Simple rotation for now, could be fly-through
        const time = clock.getElapsedTime() * 0.2;
        const radius = 15;
        camera.position.x = Math.sin(time) * radius;
        camera.position.z = Math.cos(time) * radius;
        camera.position.y = 8;
        camera.lookAt(0, 0, 0);
    });
    return null;
}

export default function Track3D({ trackKey }) {
    const [coordinates, setCoordinates] = useState([]);

    useEffect(() => {
        if (!trackData || !trackData.features) return;

        // Find feature by name or ID
        // The geojson likely has properties.Name or similar.
        // We need to map our trackKey to the geojson name.
        // For now, let's just find *any* match or defaulting.

        // Let's console log properties to debug matching if needed, 
        // but for now I'll implement a flexible finder.
        const feature = trackData.features.find(f => {
            const name = f.properties.Name?.toLowerCase() || '';
            const location = f.properties.Location?.toLowerCase() || '';
            const key = trackKey?.toLowerCase() || '';
            return name.includes(key) || location.includes(key);
        });

        if (feature && feature.geometry.type === 'LineString') {
            setCoordinates(feature.geometry.coordinates);
        } else if (feature && feature.geometry.type === 'Polygon') {
            // Polygons often wrap the line string in an extra array
            setCoordinates(feature.geometry.coordinates[0]);
        } else {
            // Fallback: Use the first one (Bahrain usually) if not found
            // Or clear it.
            console.warn('Track not found in GeoJSON:', trackKey);
        }
    }, [trackKey]);

    return (
        <div style={{ width: '100%', height: '100%', background: '#000' }}>
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 10, 10]} fov={50} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {coordinates.length > 0 && <TrackLine coords={coordinates} />}

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
        </div>
    );
}
