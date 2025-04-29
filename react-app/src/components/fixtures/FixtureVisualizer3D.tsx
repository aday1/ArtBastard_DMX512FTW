import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, useHelper } from '@react-three/drei'
import { SpotLightHelper, Vector3, SpotLight as ThreeSpotLight } from 'three'
import { useStore } from '../../store'
import styles from './FixtureVisualizer3D.module.scss'

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
      <directionalLight position={[0, 10, 0]} intensity={0.5} castShadow />
      
      {/* Floor grid */}
      <Grid infiniteGrid fadeDistance={30} fadeStrength={5} />
      
      {/* Stage platform */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[10, 0.1, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      
      {/* Render each fixture */}
      {fixtures.map((fixture, index) => (
        <FixtureObject 
          key={index}
          fixture={fixture}
          position={new Vector3(
            (index % 5) * 2 - 4, 
            3, 
            Math.floor(index / 5) * 2 - 2
          )}
          dmxValues={dmxChannels.slice(
            fixture.startAddress - 1, 
            fixture.startAddress - 1 + fixture.channels.length
          )}
        />
      ))}
    </>
  )
}

interface FixtureObjectProps {
  fixture: any // Use your Fixture type here
  position: Vector3
  dmxValues: number[]
}

const FixtureObject: React.FC<FixtureObjectProps> = ({ fixture, position, dmxValues }) => {
  const spotlightRef = useRef<ThreeSpotLight>(null)
  const [hovered, setHovered] = useState(false)
  
  // Use spotlight helper when debugging/hovered
  useHelper(hovered ? spotlightRef : null, SpotLightHelper, 'red')
  
  // Extract relevant DMX channel values
  const intensity = dmxValues[0] ? dmxValues[0] / 255 : 0.5
  
  // Find color channels if they exist
  const redChannel = fixture.channels.findIndex(c => c.name.toLowerCase().includes('red'))
  const greenChannel = fixture.channels.findIndex(c => c.name.toLowerCase().includes('green'))
  const blueChannel = fixture.channels.findIndex(c => c.name.toLowerCase().includes('blue'))
  
  const red = redChannel !== -1 ? dmxValues[redChannel] / 255 : 1
  const green = greenChannel !== -1 ? dmxValues[greenChannel] / 255 : 1
  const blue = blueChannel !== -1 ? dmxValues[blueChannel] / 255 : 1
  
  // Find pan/tilt channels if they exist
  const panChannel = fixture.channels.findIndex(c => c.name.toLowerCase().includes('pan'))
  const tiltChannel = fixture.channels.findIndex(c => c.name.toLowerCase().includes('tilt'))
  
  const pan = panChannel !== -1 ? (dmxValues[panChannel] / 255) * Math.PI * 2 : 0
  const tilt = tiltChannel !== -1 ? (dmxValues[tiltChannel] / 255) * Math.PI : 0
  
  // Animate the fixture based on DMX values
  useFrame(() => {
    if (spotlightRef.current) {
      // Update spotlight intensity
      spotlightRef.current.intensity = intensity * 10
      
      // Update spotlight color
      spotlightRef.current.color.setRGB(red, green, blue)
      
      // Update spotlight position
      spotlightRef.current.position.copy(position)
      
      // Update spotlight direction based on pan/tilt
      const target = new Vector3(
        position.x + Math.sin(pan) * Math.cos(tilt) * 10,
        position.y - Math.sin(tilt) * 10,
        position.z + Math.cos(pan) * Math.cos(tilt) * 10
      )
      spotlightRef.current.target.position.copy(target)
      spotlightRef.current.target.updateMatrixWorld()
    }
  })
  
  return (
    <group position={position}>
      {/* Fixture body */}
      <mesh 
        castShadow 
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.5, 0.8, 0.5]} />
        <meshStandardMaterial 
          color={hovered ? "#666" : "#444"} 
          emissive={new Vector3(red, green, blue).multiplyScalar(intensity * 0.3)}
        />
      </mesh>
      
      {/* Fixture front lens */}
      <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial 
          color="#888" 
          emissive={new Vector3(red, green, blue)}
          emissiveIntensity={intensity}
        />
      </mesh>
      
      {/* Light beam */}
      <spotLight
        ref={spotlightRef}
        position={[0, 0, 0]}
        angle={0.3}
        penumbra={0.2}
        intensity={intensity * 10}
        color={`rgb(${Math.floor(red * 255)}, ${Math.floor(green * 255)}, ${Math.floor(blue * 255)})`}
        distance={20}
        castShadow
      />
      
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