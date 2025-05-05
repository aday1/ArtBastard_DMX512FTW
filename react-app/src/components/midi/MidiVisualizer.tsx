import React, { useEffect, useState, useCallback } from 'react'
import { useSocket } from '../../context/SocketContext'
import { useStore } from '../../store'
import styles from './MidiVisualizer.module.scss'

interface MidiMessage {
  _type: string
  channel: number
  note?: number
  velocity?: number
  controller?: number
  value?: number
  source?: string
  timestamp?: number
}

interface ActiveNote {
  note: number
  velocity: number
  source: string
  timestamp: number
}

export const MidiVisualizer: React.FC = () => {
  const { socket } = useSocket()
  const [messages, setMessages] = useState<MidiMessage[]>([])
  const [activeNotes, setActiveNotes] = useState<{[key: string]: ActiveNote}>({})
  const theme = useStore(state => state.theme)

  // Keep only last 100 messages
  const addMessage = useCallback((msg: MidiMessage) => {
    setMessages(prev => [...prev.slice(-99), { ...msg, timestamp: Date.now() }])
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleMidiMessage = (msg: MidiMessage) => {
      // Update active notes for visualization
      if (msg._type === 'noteon' && typeof msg.note === 'number' && typeof msg.velocity === 'number') {
        const noteKey = `${msg.source || 'unknown'}-${msg.channel}-${msg.note}`;
        const noteValue: ActiveNote = {
          note: msg.note,
          velocity: msg.velocity,
          source: msg.source || 'unknown',
          timestamp: Date.now()
        };
        
        setActiveNotes(prev => {
          const newState = { ...prev };
          newState[noteKey] = noteValue;
          return newState;
        });
      } else if (msg._type === 'noteoff' && typeof msg.note === 'number') {
        setActiveNotes(prev => {
          const newState = { ...prev }
          delete newState[`${msg.source || 'unknown'}-${msg.channel}-${msg.note}`]
          return newState
        })
      }

      addMessage(msg)
    }

    socket.on('midiMessage', handleMidiMessage)
    return () => {
      socket.off('midiMessage', handleMidiMessage)
    }
  }, [socket, addMessage])

  // Clean up stale notes (over 2 seconds old)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      setActiveNotes(prev => {
        const newState = { ...prev }
        Object.entries(newState).forEach(([key, note]) => {
          // Use type assertion to tell TypeScript that note is an ActiveNote
          const activeNote = note as ActiveNote;
          if (now - activeNote.timestamp > 2000) {
            delete newState[key]
          }
        })
        return newState
      })
    }, 1000)

    return () => clearInterval(cleanup)
  }, [])

  return (
    <div className={styles.visualizer}>
      <div className={styles.header}>
        <h3>
          {theme === 'artsnob' && 'MIDI Signal Interpretation'}
          {theme === 'standard' && 'MIDI Activity'}
          {theme === 'minimal' && 'MIDI'}
        </h3>
      </div>

      <div className={styles.activeNotes}>
        {Object.values(activeNotes).map((note) => {
          // Use type assertion to help TypeScript understand the note type
          const activeNote = note as ActiveNote;
          return (
            <div
              key={`${activeNote.source}-${activeNote.note}`}
              className={styles.activeNote}
              style={{
                height: `${(activeNote.velocity / 127) * 100}%`,
                opacity: Math.max(0.3, activeNote.velocity / 127)
              }}
            >
              <span className={styles.noteLabel}>
                {activeNote.note} ({activeNote.source})
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.messageLog}>
        {messages.slice().reverse().map((msg, idx) => (
          <div 
            key={`${msg.timestamp}-${idx}`}
            className={styles.message}
          >
            <span className={styles.timestamp}>
              {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
            </span>
            <span className={styles.source}>
              {msg.source || 'unknown'}
            </span>
            <span className={styles.type}>
              {msg._type}
            </span>
            <span className={styles.details}>
              ch:{msg.channel} 
              {msg.note !== undefined && ` note:${msg.note}`}
              {msg.velocity !== undefined && ` vel:${msg.velocity}`}
              {msg.controller !== undefined && ` cc:${msg.controller}`}
              {msg.value !== undefined && ` val:${msg.value}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}