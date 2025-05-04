import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, useHelper } from '@react-three/drei'
import { SpotLightHelper, Vector3, SpotLight as ThreeSpotLight, Color, Euler } from 'three'
import { useStore } from '../../store'
import styles from './FixtureVisualizer3D.module.scss'

interface ChannelType {
  name: string;
  // Add other channel properties as needed
}

export const FixtureVisualizer3D: React.FC = () => {
  return (
    <div className={styles.visualizer3D}>
      <Canvas shadows>
        <Scene />
      </Canvas>
    </div>
  )
}

const Scene: React.FC = () => {
  const fixtures = useStore(state => state.fixtures)
  const dmxChannels = useStore(state => state.dmxChannels)
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 10]} />
      <OrbitControls />
      <ambientLight intensity={0.1} />
      
      <Grid infiniteGrid position={[0, -0.01, 0]} />
      
      {fixtures.map((fixture, index) => (
        <Fixture key={index} fixture={fixture} dmxChannels={dmxChannels} />
      ))}
    </>
  )
}

const Fixture: React.FC<{ fixture: any; dmxChannels: number[] }> = ({ fixture, dmxChannels }) => {
  const spotlightRef = useRef<ThreeSpotLight>(null)
  const [hovered, setHovered] = useState(false)
  
  // Only show helper when hovered and spotlight exists
  useHelper(hovered ? (spotlightRef as any) : null, SpotLightHelper)
  
  // Calculate color values from DMX channels
  const redChannel = fixture.channels.findIndex((c: ChannelType) => c.name.toLowerCase().includes('red'))
  const greenChannel = fixture.channels.findIndex((c: ChannelType) => c.name.toLowerCase().includes('green'))
  const blueChannel = fixture.channels.findIndex((c: ChannelType) => c.name.toLowerCase().includes('blue'))
  
  const red = redChannel >= 0 ? dmxChannels[fixture.startChannel + redChannel] / 255 : 0
  const green = greenChannel >= 0 ? dmxChannels[fixture.startChannel + greenChannel] / 255 : 0
  const blue = blueChannel >= 0 ? dmxChannels[fixture.startChannel + blueChannel] / 255 : 0
  
  // Calculate position from pan/tilt
  const panChannel = fixture.channels.findIndex((c: ChannelType) => c.name.toLowerCase().includes('pan'))
  const tiltChannel = fixture.channels.findIndex((c: ChannelType) => c.name.toLowerCase().includes('tilt'))
  
  const pan = panChannel >= 0 ? (dmxChannels[fixture.startChannel + panChannel] / 255) * Math.PI * 2 : 0
  const tilt = tiltChannel >= 0 ? (dmxChannels[fixture.startChannel + tiltChannel] / 255) * Math.PI : 0
  
  const position = fixture.position || [0, 3, 0]
  const rotation = new Euler(tilt, pan, 0)
  
  // Calculate intensity
  const intensity = Math.max(red, green, blue)
  
  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Light beam */}
      <spotLight
        ref={spotlightRef}
        position={[0, 0, 0]}
        angle={0.5}
        penumbra={0.5}
        intensity={intensity * 2}
        color={new Color(red, green, blue)}
        castShadow
      />
      
      {/* Fixture body */}
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color="black"
          emissive={new Color(red * intensity * 0.3, green * intensity * 0.3, blue * intensity * 0.3)}
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>
      
      {/* Light lens */}
      <mesh position={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 32]} />
        <meshStandardMaterial
          color="white"
          emissive={new Color(red, green, blue)}
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Fixture name label */}
      <Html position={[0, 0.5, 0]}>
        <div className={styles.fixtureLabel}>{fixture.name}</div>
      </Html>
    </group>
  )
}

// Html component to render HTML content in the 3D scene
const Html: React.FC<{ position: [number, number, number] | Vector3, children: React.ReactNode }> = ({ position, children }) => {
  const ref = useRef<HTMLDivElement>(null)
  
  useFrame(({ camera }) => {
    if (ref.current) {
      const pos = new Vector3(...(Array.isArray(position) ? position : [position.x, position.y, position.z]))
      pos.project(camera)
      
      // Convert to screen coordinates
      const x = (pos.x * 0.5 + 0.5) * window.innerWidth
      const y = (-pos.y * 0.5 + 0.5) * window.innerHeight
      
      // Update element position
      ref.current.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
    }
  })
  
  return (
    <div ref={ref} className={styles.htmlContent} style={{ position: 'absolute' }}>
      {children}
    </div>
  )
}