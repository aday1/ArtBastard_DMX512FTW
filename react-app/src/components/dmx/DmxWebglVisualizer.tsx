import React, { useRef, useEffect, useState } from 'react'
import { useStore } from '../../store'
import styles from './DmxWebglVisualizer.module.scss'

// WebGL shader code
const vertexShaderSource = `
  attribute vec4 aVertexPosition;
  attribute vec2 aTextureCoord;
  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  
  varying highp vec2 vTextureCoord;
  
  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
  }
`

const fragmentShaderSource = `
  precision mediump float;
  
  varying highp vec2 vTextureCoord;
  
  uniform sampler2D uDmxValues;
  uniform vec3 uColorStart;
  uniform vec3 uColorEnd;
  
  void main() {
    float value = texture2D(uDmxValues, vTextureCoord).r;
    vec3 color = mix(uColorStart, uColorEnd, value);
    
    // Add some depth with a gradient
    float highlight = smoothstep(0.95, 1.0, value);
    color = mix(color, vec3(1.0), highlight * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

interface WebGLProgramInfo {
  program: WebGLProgram
  attribLocations: {
    vertexPosition: number
    textureCoord: number
  }
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation
    modelViewMatrix: WebGLUniformLocation
    dmxValues: WebGLUniformLocation
    colorStart: WebGLUniformLocation
    colorEnd: WebGLUniformLocation
  }
}

interface Props {
  sticky?: boolean;
}

export const DmxWebglVisualizer: React.FC<Props> = ({ sticky = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dmxChannels = useStore(state => state.dmxChannels)
  const selectedChannels = useStore(state => state.selectedChannels)
  const animationRef = useRef<number>(0)
  const programInfoRef = useRef<WebGLProgramInfo | null>(null)
  const textureRef = useRef<WebGLTexture | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const [isSticky, setIsSticky] = useState(sticky)
  
  // Toggle sticky mode
  const toggleStickyMode = () => {
    setIsSticky(!isSticky)
  }
  
  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const gl = canvas.getContext('webgl')
    if (!gl) {
      console.error('WebGL not supported')
      return
    }
    
    // Create shader program
    const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource)
    if (!shaderProgram) {
      console.error('Failed to initialize shader program')
      return
    }
    
    // Collect all the info needed to use the shader program
    programInfoRef.current = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix')!,
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')!,
        dmxValues: gl.getUniformLocation(shaderProgram, 'uDmxValues')!,
        colorStart: gl.getUniformLocation(shaderProgram, 'uColorStart')!,
        colorEnd: gl.getUniformLocation(shaderProgram, 'uColorEnd')!,
      },
    }
    
    // Create and initialize a texture for DMX values
    textureRef.current = initDmxTexture(gl)
    
    // Set up rendering
    startTimeRef.current = Date.now()
    render()
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [])
  
  // Update texture data when dmxChannels change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const gl = canvas.getContext('webgl')
    if (!gl) return
    
    updateDmxTexture(gl, dmxChannels)
  }, [dmxChannels])
  
  // Update canvas size on resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      // Update canvas size
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      
      // Update viewport
      const gl = canvas.getContext('webgl')
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
    }
    
    window.addEventListener('resize', handleResize)
    handleResize() // Initial setup
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Initialize DMX texture
  const initDmxTexture = (gl: WebGLRenderingContext): WebGLTexture | null => {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    
    // Create a 32x16 texture (512 DMX channels)
    const width = 32
    const height = 16
    const data = new Uint8Array(width * height)
    
    // Initialize with zeros
    for (let i = 0; i < data.length; i++) {
      data[i] = 0
    }
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data)
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    
    return texture
  }
  
  // Update DMX texture data
  const updateDmxTexture = (gl: WebGLRenderingContext, dmxValues: number[]) => {
    if (!textureRef.current) return
    
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current)
    
    // Convert DMX values (0-255) to texture data (0-255)
    const width = 32
    const height = 16
    const data = new Uint8Array(width * height)
    
    for (let i = 0; i < dmxValues.length && i < data.length; i++) {
      data[i] = dmxValues[i]
    }
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data)
  }
  
  // Initialize a shader program
  const initShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)
    
    if (!vertexShader || !fragmentShader) return null
    
    // Create the shader program
    const shaderProgram = gl.createProgram()
    if (!shaderProgram) return null
    
    gl.attachShader(shaderProgram, vertexShader)
    gl.attachShader(shaderProgram, fragmentShader)
    gl.linkProgram(shaderProgram)
    
    // Check if program linked successfully
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram))
      return null
    }
    
    return shaderProgram
  }
  
  // Load a shader
  const loadShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) return null
    
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    // Check if shader compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    
    return shader
  }
  
  // Create buffers for rendering
  const initBuffers = (gl: WebGLRenderingContext) => {
    // Positions for a square that fills the canvas
    const positions = [
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0,  1.0, 0.0,
    ]
    
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
    
    // Texture coordinates
    const textureCoordinates = [
      0.0, 1.0,
      1.0, 1.0,
      1.0, 0.0,
      0.0, 0.0,
    ]
    
    const textureCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW)
    
    // Element array for indices
    const indices = [
      0, 1, 2,
      0, 2, 3,
    ]
    
    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    
    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer,
    }
  }
  
  // Render the scene
  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const gl = canvas.getContext('webgl')
    if (!gl || !programInfoRef.current || !textureRef.current) return
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    
    const buffers = initBuffers(gl)
    const programInfo = programInfoRef.current
    
    // Set up projection and model view matrices
    const projectionMatrix = mat4Identity()
    const modelViewMatrix = mat4Identity()
    
    // Bind position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition)
    
    // Bind texture coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord)
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord)
    
    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices)
    
    // Use shader program
    gl.useProgram(programInfo.program)
    
    // Set uniforms
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix)
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix)
    
    // Set color gradient for visualization
    gl.uniform3fv(programInfo.uniformLocations.colorStart, [0.0, 0.0, 0.2]) // Dark blue
    gl.uniform3fv(programInfo.uniformLocations.colorEnd, [0.0, 1.0, 1.0])   // Cyan
    
    // Set up texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current)
    gl.uniform1i(programInfo.uniformLocations.dmxValues, 0)
    
    // Draw
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    
    // Continue animation
    animationRef.current = requestAnimationFrame(render)
  }
  
  // Create a 4x4 identity matrix
  const mat4Identity = (): number[] => {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]
  }
    return (
    <div className={`${styles.visualizerContainer} ${isSticky ? styles.sticky : ''}`}>
      <canvas ref={canvasRef} className={styles.visualizer} />
      <button className={styles.stickyToggle} onClick={toggleStickyMode}>
        <i className={`fas ${isSticky ? 'fa-thumbtack' : 'fa-map-pin'}`}></i>
        {isSticky ? 'Unpin' : 'Pin to top'}
      </button>
    </div>
  )
}