import React, { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import styles from './Navbar.module.scss'

interface NavItem {
  id: string
  icon: string
  title: {
    artsnob: string
    standard: string
    minimal: string
  }
}

export const Navbar: React.FC = () => {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('main')
  
  const navItems: NavItem[] = [
    {
      id: 'main',
      icon: 'fa-lightbulb',
      title: {
        artsnob: 'Luminous Canvas',
        standard: 'Main Control',
        minimal: 'Main'
      }
    },
    {
      id: 'midiOsc',
      icon: 'fa-sliders-h',
      title: {
        artsnob: 'MIDI/OSC Atelier',
        standard: 'MIDI/OSC Setup',
        minimal: 'I/O'
      }
    },
    {
      id: 'fixture',
      icon: 'fa-object-group',
      title: {
        artsnob: 'Fixture Composition',
        standard: 'Fixture Setup',
        minimal: 'Fix'
      }
    },
    {
      id: 'scenes',
      icon: 'fa-theater-masks',
      title: {
        artsnob: 'Scene Gallery',
        standard: 'Scenes',
        minimal: 'Scn'
      }
    },
    {
      id: 'oscDebug',
      icon: 'fa-bug',
      title: {
        artsnob: 'OSC Critique',
        standard: 'OSC Debug',
        minimal: 'OSC'
      }
    },
    {
      id: 'misc',
      icon: 'fa-cog',
      title: {
        artsnob: 'Avant-Garde Settings',
        standard: 'Settings',
        minimal: 'Cfg'
      }
    }
  ]
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // Dispatch event to change content view
    window.dispatchEvent(new CustomEvent('changeView', { detail: { view: tabId } }))
  }

  return (
    <nav className={styles.navbar}>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.navButton} ${activeTab === item.id ? styles.active : ''}`}
          onClick={() => handleTabChange(item.id)}
        >
          <i className={`fas ${item.icon}`}></i> {item.title[theme]}
        </button>
      ))}
    </nav>
  )
}