import React, { useState, useEffect } from 'react'
import { DmxControlPanel } from '../components/dmx/DmxControlPanel'
import { MidiOscSetup } from '../components/midi/MidiOscSetup'
import { FixtureSetup } from '../components/fixtures/FixtureSetup'
import { SceneGallery } from '../components/scenes/SceneGallery'
import { OscDebug } from '../components/osc/OscDebug'
import { Settings } from '../components/settings/Settings'
import styles from './MainPage.module.scss'

type ViewType = 'main' | 'midiOsc' | 'fixture' | 'scenes' | 'oscDebug' | 'misc'

const MainPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('main')
  
  useEffect(() => {
    // Listen for view change events from the navbar
    const handleViewChange = (e: CustomEvent<{ view: ViewType }>) => {
      setCurrentView(e.detail.view)
    }
    
    window.addEventListener('changeView', handleViewChange as EventListener)
    
    return () => {
      window.removeEventListener('changeView', handleViewChange as EventListener)
    }
  }, [])
  
  return (
    <div className={styles.mainPage}>
      {currentView === 'main' && <DmxControlPanel />}
      {currentView === 'midiOsc' && <MidiOscSetup />}
      {currentView === 'fixture' && <FixtureSetup />}
      {currentView === 'scenes' && <SceneGallery />}
      {currentView === 'oscDebug' && <OscDebug />}
      {currentView === 'misc' && <Settings />}
    </div>
  )
}

export default MainPage