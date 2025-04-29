import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '../store'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false
})

export const useSocket = () => useContext(SocketContext)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  
  const {
    showStatusMessage,
    setDmxChannel,
    addMidiMapping,
    midiLearnChannel,
    midiMessages,
  } = useStore((state) => ({
    showStatusMessage: state.showStatusMessage,
    setDmxChannel: state.setDmxChannel,
    addMidiMapping: state.addMidiMapping,
    midiLearnChannel: state.midiLearnChannel, 
    midiMessages: state.midiMessages,
  }))

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketInstance = io()
    setSocket(socketInstance)

    // Socket event handlers
    socketInstance.on('connect', () => {
      setConnected(true)
      showStatusMessage('Connected to the luminous server', 'success')
    })

    socketInstance.on('disconnect', () => {
      setConnected(false)
      showStatusMessage('Connection to the server lost - the canvas grows dark', 'error')
    })

    socketInstance.on('dmxUpdate', ({ channel, value }) => {
      setDmxChannel(channel, value)
    })

    socketInstance.on('midiMessage', (message) => {
      useStore.setState({ midiMessages: [...midiMessages, message] })
    })

    socketInstance.on('midiMappingLearned', ({ channel, mapping }) => {
      addMidiMapping(channel, mapping)
      showStatusMessage(`MIDI mapping learned for channel ${channel}`, 'success')
    })

    socketInstance.on('midiLearnStarted', ({ channel }) => {
      useStore.setState({ midiLearnChannel: channel })
      showStatusMessage(`MIDI learn mode started for channel ${channel}`, 'info')
    })

    socketInstance.on('midiLearnComplete', ({ channel, mapping }) => {
      addMidiMapping(channel, mapping)
      useStore.setState({ midiLearnChannel: null })
      showStatusMessage(`MIDI learn complete for channel ${channel}`, 'success')
    })

    socketInstance.on('midiLearnCancelled', ({ channel }) => {
      useStore.setState({ midiLearnChannel: null })
      showStatusMessage(`MIDI learn cancelled for channel ${channel}`, 'info')
    })

    socketInstance.on('midiLearnTimeout', ({ channel }) => {
      useStore.setState({ midiLearnChannel: null })
      showStatusMessage(`MIDI learn timed out for channel ${channel}`, 'error')
    })

    socketInstance.on('artnetStatus', ({ status }) => {
      useStore.setState({ 
        artNetStatus: status === 'alive' ? 'connected' : 'disconnected'
      })
    })

    socketInstance.on('sceneLoaded', ({ name }) => {
      showStatusMessage(`Scene "${name}" loaded`, 'success')
    })

    socketInstance.on('sceneSaved', (name) => {
      showStatusMessage(`Scene "${name}" saved`, 'success')
    })

    // Clean up on unmount
    return () => {
      socketInstance.disconnect()
    }
  }, [showStatusMessage, setDmxChannel, addMidiMapping, midiLearnChannel, midiMessages])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}