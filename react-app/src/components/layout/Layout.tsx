import React from 'react'
import { useStore } from '../../store'
import { useTheme } from '../../context/ThemeContext'
import { StatusBar } from './StatusBar'
import { Navbar } from './Navbar'
import { StatusMessage } from './StatusMessage'
import styles from './Layout.module.scss'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, darkMode, toggleDarkMode } = useTheme()
  const statusMessage = useStore((state) => state.statusMessage)

  return (
    <div className={`${styles.layout} ${styles[theme]} ${darkMode ? styles.dark : styles.light}`}>
      <StatusBar />
      
      <div className={styles.themeToggle} onClick={toggleDarkMode} title="Toggle Light/Dark Mode">
        <i className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`}></i>
      </div>
      
      <div className={styles.mainContent}>
        <h1 className={styles.title}>
          ArtBastard DMX512FTW: 
          {theme === 'artsnob' && <span>The Luminary Palette</span>}
          {theme === 'standard' && <span>DMX Controller</span>}
          {theme === 'minimal' && <span>DMX</span>}
        </h1>
        
        {theme === 'artsnob' && (
          <div className={styles.artQuote}>
            "Light is not merely illumination—it is the very essence of sublime expression, where the ephemeral dance of photons transcends the mundane into the realm of provocative chromatic discourse."
            <div className={styles.artSignature}>— Monsieur Lumineux, Curator of Light</div>
          </div>
        )}
        
        {statusMessage && (
          <StatusMessage 
            message={statusMessage.text} 
            type={statusMessage.type} 
          />
        )}
        
        <Navbar />
        
        <div className={styles.contentArea}>
          {children}
        </div>
      </div>
    </div>
  )
}