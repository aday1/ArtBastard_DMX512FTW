import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { useSocket } from '../context/SocketContext'
// Import the WebMidi types added to the global scope
import '../types/webmidi'

export interface BrowserMidiInput {
  id: string
  name: string
  manufacturer: string
  connection: string
  state: string
}

interface BrowserMidiMessage {
  _type: string
  channel: number
  controller?: number
  value?: number
  note?: number
  velocity?: number
  source: string
}

export const useBrowserMidi = () => {
  const [midiAccess, setMidiAccess] = useState<WebMidi.MIDIAccess | null>(null)
  const [browserInputs, setBrowserInputs] = useState<BrowserMidiInput[]>([])
  const [activeBrowserInputs, setActiveBrowserInputs] = useState<Set<string>>(new Set())
  const [isSupported, setIsSupported] = useState<boolean>(!!navigator.requestMIDIAccess)
  const [error, setError] = useState<string | null>(null)
  
  const socket = useSocket().socket
  const midiMessages = useStore(state => state.midiMessages)
  const midiLearnChannel = useStore(state => state.midiLearnChannel)
  const addMidiMapping = useStore(state => state.addMidiMapping)
  
  // Initialize Web MIDI API
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setIsSupported(false)
      setError('Web MIDI API is not supported in this browser')
      return
    }

    const initWebMidi = async () => {
      try {
        const access = await navigator.requestMIDIAccess({ sysex: false })
        setMidiAccess(access)
        updateDeviceList(access)
        
        // Listen for device connection/disconnection
        access.addEventListener('statechange', (event) => {
          updateDeviceList(access)
        })
      } catch (err) {
        setError(`Error accessing MIDI devices: ${err instanceof Error ? err.message : String(err)}`)
        console.error('MIDI Access Error:', err)
      }
    }
    
    initWebMidi()
  }, [])
  
  // Update device list when MIDI access changes
  const updateDeviceList = useCallback((access: WebMidi.MIDIAccess) => {
    const inputs: BrowserMidiInput[] = []
    
    access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name || `Unknown Device (${input.id})`,
        manufacturer: input.manufacturer || 'Unknown',
        connection: input.connection,
        state: input.state
      })
    })
    
    setBrowserInputs(inputs)
  }, [])
  
  // Connect to a browser MIDI input
  const connectBrowserInput = useCallback((inputId: string) => {
    if (!midiAccess) return
    
    const input = midiAccess.inputs.get(inputId)
    if (!input) return
    
    // Only connect if not already connected
    if (!activeBrowserInputs.has(inputId)) {
      // Create a copy of the set to avoid direct mutation
      const newActiveInputs = new Set(activeBrowserInputs)
      newActiveInputs.add(inputId)
      setActiveBrowserInputs(newActiveInputs)
      
      // Set up the message handler for this input
      input.onmidimessage = handleMIDIMessage
      
      console.log(`Connected to browser MIDI input: ${input.name || inputId}`)
    }
  }, [midiAccess, activeBrowserInputs])
  
  // Disconnect from a browser MIDI input
  const disconnectBrowserInput = useCallback((inputId: string) => {
    if (!midiAccess) return
    
    const input = midiAccess.inputs.get(inputId)
    if (!input) return
    
    // Remove the message handler
    input.onmidimessage = null
    
    // Update active inputs
    const newActiveInputs = new Set(activeBrowserInputs)
    newActiveInputs.delete(inputId)
    setActiveBrowserInputs(newActiveInputs)
    
    console.log(`Disconnected from browser MIDI input: ${input.name || inputId}`)
  }, [midiAccess, activeBrowserInputs])
  
  // Handle incoming MIDI messages from browser
  const handleMIDIMessage = useCallback((event: WebMidi.MIDIMessageEvent) => {
    const [statusByte, dataByte1, dataByte2] = event.data
    
    // Get the MIDI message type and channel
    const messageType = statusByte >> 4
    const channel = statusByte & 0xF
    
    let midiMessage: BrowserMidiMessage | null = null
    
    // Note On message (0x9)
    if (messageType === 0x9) {
      midiMessage = {
        _type: 'noteon',
        channel: channel,
        note: dataByte1,
        velocity: dataByte2,
        source: 'browser'
      }
    }
    // Note Off message (0x8)
    else if (messageType === 0x8) {
      midiMessage = {
        _type: 'noteoff',
        channel: channel,
        note: dataByte1,
        velocity: dataByte2,
        source: 'browser'
      }
    }
    // Control Change message (0xB)
    else if (messageType === 0xB) {
      midiMessage = {
        _type: 'cc',
        channel: channel,
        controller: dataByte1,
        value: dataByte2,
        source: 'browser'
      }
    }
    
    if (midiMessage) {
      // Add to the local state through the store
      useStore.setState({ midiMessages: [...midiMessages, midiMessage] })
      
      // Forward to server if socket is connected
      if (socket) {
        socket.emit('browserMidiMessage', midiMessage)
      }
      
      // Handle MIDI learn if in learn mode
      if (midiLearnChannel !== null) {
        if (midiMessage._type === 'noteon' || midiMessage._type === 'cc') {
          let mapping: any
          
          if (midiMessage._type === 'noteon') {
            mapping = {
              channel: midiMessage.channel,
              note: midiMessage.note
            }
          } else { // cc
            mapping = {
              channel: midiMessage.channel,
              controller: midiMessage.controller
            }
          }
          
          // Add the mapping
          addMidiMapping(midiLearnChannel, mapping)
        }
      }
    }
  }, [socket, midiMessages, midiLearnChannel, addMidiMapping])
  
  // Refresh the list of available devices
  const refreshDevices = useCallback(() => {
    if (midiAccess) {
      updateDeviceList(midiAccess)
    }
  }, [midiAccess, updateDeviceList])
  
  return {
    isSupported,
    error,
    browserInputs,
    activeBrowserInputs,
    connectBrowserInput,
    disconnectBrowserInput,
    refreshDevices
  }
}