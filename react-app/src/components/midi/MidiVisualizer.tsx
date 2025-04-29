import React, { useRef, useEffect, useState } from 'react'
import { useStore } from '../../store'
import styles from './MidiVisualizer.module.scss'

type VisualizerMode = 'piano' | 'heatmap' | 'text'

export const MidiVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const midiMessages = useStore(state => state.midiMessages)
  const [mode, setMode] = useState<VisualizerMode>('heatmap')
  const [canvasReady, setCanvasReady] = useState(false)
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Set canvas size to match parent
    const resize = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = 200
        setCanvasReady(true)
      }
    }
    
    resize()
    window.addEventListener('resize', resize)
    
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])
  
  // Update visualization when messages change
  useEffect(() => {
    if (!canvasReady) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (mode === 'piano') {
      drawPianoRoll(ctx, canvas.width, canvas.height, midiMessages)
    } else if (mode === 'heatmap') {
      drawHeatmap(ctx, canvas.width, canvas.height, midiMessages)
    }
  }, [canvasReady, midiMessages, mode])
  
  // Draw piano roll visualization
  const drawPianoRoll = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number, 
    messages: any[]
  ) => {
    // Piano roll constants
    const noteRange = { min: 21, max: 108 } // 88-key piano
    const totalNotes = noteRange.max - noteRange.min + 1
    const keyWidth = width / totalNotes
    
    const whiteKeyHeight = height * 0.8
    const blackKeyHeight = height * 0.5
    
    // Draw white keys
    for (let i = noteRange.min; i <= noteRange.max; i++) {
      const isBlackKey = [1, 3, 6, 8, 10].includes(i % 12)
      if (!isBlackKey) {
        const x = (i - noteRange.min) * keyWidth
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(x, 0, keyWidth, whiteKeyHeight)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.strokeRect(x, 0, keyWidth, whiteKeyHeight)
      }
    }
    
    // Draw black keys on top
    for (let i = noteRange.min; i <= noteRange.max; i++) {
      const isBlackKey = [1, 3, 6, 8, 10].includes(i % 12)
      if (isBlackKey) {
        const x = (i - noteRange.min) * keyWidth
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.fillRect(x, 0, keyWidth, blackKeyHeight)
      }
    }
    
    // Draw active notes (from recent messages)
    const recent = messages.filter(msg => 
      Date.now() - (msg.timestamp || Date.now()) < 500 && 
      (msg._type === 'noteon' || msg._type === 'noteoff')
    ).slice(-50)
    
    recent.forEach(msg => {
      if (msg._type === 'noteon' && msg.velocity > 0 && msg.note >= noteRange.min && msg.note <= noteRange.max) {
        const x = (msg.note - noteRange.min) * keyWidth
        const isBlackKey = [1, 3, 6, 8, 10].includes(msg.note % 12)
        const keyHeight = isBlackKey ? blackKeyHeight : whiteKeyHeight
        
        // Calculate opacity based on recency and velocity
        const timeSince = Date.now() - (msg.timestamp || Date.now())
        const opacity = Math.max(0, 1 - (timeSince / 500))
        const velocity = msg.velocity / 127
        
        // Color based on channel (hue rotation)
        const hue = (msg.channel * 30) % 360
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${opacity * velocity})`
        
        // Draw glowing rectangle for the note
        ctx.beginPath()
        ctx.roundRect(x, 0, keyWidth, keyHeight, 2)
        ctx.fill()
        
        // Add channel number
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.font = '8px sans-serif'
        ctx.fillText(`${msg.channel}`, x + 2, keyHeight - 5)
      }
    })
  }
  
  // Draw heatmap visualization
  const drawHeatmap = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    messages: any[]
  ) => {
    // Constants for the heatmap
    const channels = 16
    const controllers = 128
    const cellWidth = width / controllers
    const cellHeight = height / channels
    
    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)'
    ctx.lineWidth = 0.5
    
    // Vertical grid lines (every 8 controllers)
    for (let i = 0; i <= controllers; i += 8) {
      ctx.beginPath()
      ctx.moveTo(i * cellWidth, 0)
      ctx.lineTo(i * cellWidth, height)
      ctx.stroke()
    }
    
    // Horizontal grid lines (channels)
    for (let i = 0; i <= channels; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * cellHeight)
      ctx.lineTo(width, i * cellHeight)
      ctx.stroke()
    }
    
    // Add channel numbers
    ctx.fillStyle = 'rgba(200, 200, 200, 0.7)'
    ctx.font = '10px sans-serif'
    for (let i = 0; i < channels; i++) {
      ctx.fillText(`${i + 1}`, 2, (i + 0.7) * cellHeight)
    }
    
    // Add controller numbers (every 8)
    for (let i = 0; i <= controllers; i += 8) {
      ctx.fillText(`${i}`, i * cellWidth, height - 2)
    }
    
    // Get recent CC messages
    const recent = messages.filter(msg => 
      Date.now() - (msg.timestamp || Date.now()) < 2000 && 
      msg._type === 'cc'
    ).slice(-100)
    
    // Create a lookup of the latest value for each controller/channel combo
    const latestValues: Record<string, {value: number, timestamp: number}> = {}
    
    recent.forEach(msg => {
      if (msg._type === 'cc' && msg.controller !== undefined && msg.channel !== undefined) {
        const key = `${msg.channel}:${msg.controller}`
        if (!latestValues[key] || (msg.timestamp || Date.now()) > latestValues[key].timestamp) {
          latestValues[key] = {
            value: msg.value || 0,
            timestamp: msg.timestamp || Date.now()
          }
        }
      }
    })
    
    // Draw cells for each controller/channel with activity
    Object.entries(latestValues).forEach(([key, data]) => {
      const [channel, controller] = key.split(':').map(Number)
      if (channel >= 1 && channel <= channels && controller >= 0 && controller < controllers) {
        const x = controller * cellWidth
        const y = (channel - 1) * cellHeight
        
        // Calculate opacity based on recency
        const timeSince = Date.now() - data.timestamp
        const opacity = Math.max(0, 1 - (timeSince / 2000))
        
        // Calculate color based on value
        const value = data.value / 127
        const r = Math.round(value * 0)
        const g = Math.round(value * 200)
        const b = Math.round(value * 255)
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
        ctx.fillRect(x, y, cellWidth, cellHeight)
        
        // Add value text for high-value cells
        if (opacity > 0.7 && value > 0.5) {
          ctx.fillStyle = 'white'
          ctx.font = '10px sans-serif'
          ctx.fillText(data.value.toString(), x + 2, y + cellHeight - 2)
        }
      }
    })
  }
  
  return (
    <div className={styles.midiVisualizer}>
      <div className={styles.visualizerControls}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as VisualizerMode)}
          className={styles.modeSelect}
        >
          <option value="heatmap">Controller Heatmap</option>
          <option value="piano">Piano Roll</option>
          <option value="text">Text Only</option>
        </select>
      </div>
      
      {mode !== 'text' && (
        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef}
            className={styles.canvas}
          />
        </div>
      )}
    </div>
  )
}