import React, { useEffect, useState } from 'react'
import { useSocket } from '../../context/SocketContext'
import { useTheme } from '../../context/ThemeContext'
import styles from './NetworkStatus.module.scss'

interface HealthStatus {
  status: 'ok' | 'degraded'
  serverStatus: string
  socketConnections: number
  socketStatus: string
  uptime: number
  timestamp: string
  memoryUsage: {
    heapUsed: number
    heapTotal: number
  }
  midiDevicesConnected: number
  artnetStatus: string
}

interface Props {
  isModal?: boolean
  onClose?: () => void
}

export const NetworkStatus: React.FC<Props> = ({ isModal = false, onClose }) => {
  const { socket, connected } = useSocket()
  const { theme } = useTheme()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()
        setHealth(data)
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Failed to fetch health status:', error)
      }
    }

    // Initial fetch
    fetchHealth()

    // Poll every 10 seconds
    const interval = setInterval(fetchHealth, 10000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isModal) {
      setShowModal(true)
    }
  }, [isModal])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const handleClose = () => {
    setShowModal(false)
    onClose?.()
  }

  const content = (
    <div className={styles.networkStatus}>
      <div className={styles.header}>
        <h3>
          {theme === 'artsnob' && 'Network Telemetry'}
          {theme === 'standard' && 'Network Status'}
          {theme === 'minimal' && 'Status'}
        </h3>
        {lastUpdate && (
          <span className={styles.lastUpdate}>
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        {isModal && (
          <button className={styles.closeButton} onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      <div className={styles.statusGrid}>
        <div className={`${styles.statusItem} ${styles[health?.status || 'unknown']}`}>
          <i className="fas fa-server"></i>
          <div className={styles.statusInfo}>
            <span className={styles.label}>Server</span>
            <span className={styles.value}>{health?.serverStatus || 'Unknown'}</span>
          </div>
        </div>

        <div className={`${styles.statusItem} ${styles[connected ? 'ok' : 'degraded']}`}>
          <i className="fas fa-plug"></i>
          <div className={styles.statusInfo}>
            <span className={styles.label}>WebSocket</span>
            <span className={styles.value}>
              {connected ? `Connected (${health?.socketConnections || 0} clients)` : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className={`${styles.statusItem} ${styles[health?.midiDevicesConnected ? 'ok' : 'unknown']}`}>
          <i className="fas fa-music"></i>
          <div className={styles.statusInfo}>
            <span className={styles.label}>MIDI Devices</span>
            <span className={styles.value}>{health?.midiDevicesConnected || 0} connected</span>
          </div>
        </div>

        <div className={`${styles.statusItem} ${styles[health?.artnetStatus === 'initialized' ? 'ok' : 'degraded']}`}>
          <i className="fas fa-network-wired"></i>
          <div className={styles.statusInfo}>
            <span className={styles.label}>ArtNet</span>
            <span className={styles.value}>{health?.artnetStatus || 'Unknown'}</span>
          </div>
        </div>

        <div className={styles.statsSection}>
          <div className={styles.stat}>
            <span className={styles.label}>Uptime</span>
            <span className={styles.value}>{health ? formatUptime(health.uptime) : 'Unknown'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Memory</span>
            <span className={styles.value}>
              {health?.memoryUsage ? formatMemory(health.memoryUsage.heapUsed) : 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return showModal ? (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          {content}
        </div>
      </div>
    ) : null
  }

  return content
}