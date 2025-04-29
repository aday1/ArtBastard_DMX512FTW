import React from 'react'
import { useStore } from '../../store'
import { useSocket } from '../../context/SocketContext'
import styles from './StatusBar.module.scss'

export const StatusBar: React.FC = () => {
  const artNetStatus = useStore((state) => state.artNetStatus)
  const { connected } = useSocket()
  
  // Local state for MIDI activity indicators
  const [midiInActive, setMidiInActive] = React.useState(false)
  const [midiOutActive, setMidiOutActive] = React.useState(false)
  const [oscInActive, setOscInActive] = React.useState(false)
  const [oscOutActive, setOscOutActive] = React.useState(false)
  
  // Monitor MIDI messages to show activity
  const midiMessages = useStore((state) => state.midiMessages)
  
  React.useEffect(() => {
    if (midiMessages.length > 0) {
      const lastMessage = midiMessages[midiMessages.length - 1]
      // Flash the MIDI in indicator
      setMidiInActive(true)
      setTimeout(() => setMidiInActive(false), 300)
    }
  }, [midiMessages])

  return (
    <div className={styles.statusBar}>
      <div className={styles.statusIndicator} title="ArtNet Connection">
        <div 
          className={`${styles.statusDot} ${artNetStatus === 'connected' ? styles.connected : ''}`}
        ></div>
        <span>ArtNet</span>
      </div>
      
      <div className={styles.statusIndicator} title="Server Connection">
        <div 
          className={`${styles.statusDot} ${connected ? styles.connected : ''}`}
        ></div>
        <span>Server</span>
      </div>
      
      <div className={styles.statusIndicator} title="MIDI Input">
        <div 
          className={`${styles.statusDot} ${midiInActive ? styles.active : ''}`}
        ></div>
        <span>MIDI In</span>
      </div>
      
      <div className={styles.statusIndicator} title="MIDI Output">
        <div 
          className={`${styles.statusDot} ${midiOutActive ? styles.active : ''}`}
        ></div>
        <span>MIDI Out</span>
      </div>
      
      <div className={styles.statusIndicator} title="OSC Input">
        <div 
          className={`${styles.statusDot} ${oscInActive ? styles.active : ''}`}
        ></div>
        <span>OSC In</span>
      </div>
      
      <div className={styles.statusIndicator} title="OSC Output">
        <div 
          className={`${styles.statusDot} ${oscOutActive ? styles.active : ''}`}
        ></div>
        <span>OSC Out</span>
      </div>
    </div>
  )
}