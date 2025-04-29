import React, { useState, useEffect } from 'react'
import { useSocket } from '../../context/SocketContext'
import { useTheme } from '../../context/ThemeContext'
import { useStore } from '../../store'
import styles from './OscDebug.module.scss'

interface OscMessage {
  address: string
  args: { type: string; value: any }[]
  timestamp: number
}

export const OscDebug: React.FC = () => {
  const { theme } = useTheme()
  const { socket, connected } = useSocket()
  
  const [oscMessages, setOscMessages] = useState<OscMessage[]>([])
  const [testAddress, setTestAddress] = useState('/test/address')
  const [testValue, setTestValue] = useState('1.0')
  const [messageTypes, setMessageTypes] = useState({
    incoming: true,
    outgoing: true
  })
  
  // Listen for OSC messages
  useEffect(() => {
    if (socket && connected) {
      const handleOscMessage = (message: OscMessage) => {
        setOscMessages(prev => [...prev.slice(-99), { ...message, timestamp: Date.now() }])
      }
      
      socket.on('oscMessage', handleOscMessage)
      
      return () => {
        socket.off('oscMessage', handleOscMessage)
      }
    }
  }, [socket, connected])
  
  // Send test OSC message
  const sendTestMessage = () => {
    if (socket && connected) {
      let valueToSend: number | string = testValue
      
      // Try to convert to number if possible
      if (!isNaN(Number(testValue))) {
        valueToSend = Number(testValue)
      }
      
      socket.emit('sendOsc', {
        address: testAddress,
        args: [{ type: typeof valueToSend, value: valueToSend }]
      })
      
      // Add to local messages list
      setOscMessages(prev => [
        ...prev.slice(-99),
        {
          address: testAddress,
          args: [{ type: typeof valueToSend, value: valueToSend }],
          timestamp: Date.now(),
          outgoing: true
        } as any
      ])
      
      useStore.getState().showStatusMessage('OSC message sent', 'success')
    }
  }
  
  // Clear messages
  const clearMessages = () => {
    setOscMessages([])
  }
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }
  
  // Filter messages by type
  const filteredMessages = oscMessages.filter(msg => {
    if (msg.outgoing && !messageTypes.outgoing) return false
    if (!msg.outgoing && !messageTypes.incoming) return false
    return true
  })
  
  return (
    <div className={styles.oscDebug}>
      <h2 className={styles.sectionTitle}>
        {theme === 'artsnob' && 'OSC Critique: The Digital Dialogue'}
        {theme === 'standard' && 'OSC Debug'}
        {theme === 'minimal' && 'OSC'}
      </h2>
      
      <div className={styles.oscPanel}>
        {/* OSC Test Message Form */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'OSC Test: Ephemeral Communiqué'}
              {theme === 'standard' && 'Send Test Message'}
              {theme === 'minimal' && 'Test'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label htmlFor="oscAddress">Address:</label>
              <input
                type="text"
                id="oscAddress"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                placeholder="/test/address"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="oscValue">Value:</label>
              <input
                type="text"
                id="oscValue"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                placeholder="1.0"
              />
            </div>
            
            <button
              className={styles.sendButton}
              onClick={sendTestMessage}
              disabled={!connected}
            >
              <i className="fas fa-paper-plane"></i>
              {theme === 'artsnob' && 'Dispatch'}
              {theme === 'standard' && 'Send'}
              {theme === 'minimal' && 'Send'}
            </button>
          </div>
        </div>
        
        {/* OSC Messages List */}
        <div className={`${styles.card} ${styles.messagesCard}`}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'Incoming Messages: Digital Whispers'}
              {theme === 'standard' && 'OSC Messages'}
              {theme === 'minimal' && 'Messages'}
            </h3>
            <div className={styles.messageControls}>
              <div className={styles.messageFilters}>
                <label className={styles.filterLabel}>
                  <input
                    type="checkbox"
                    checked={messageTypes.incoming}
                    onChange={() => setMessageTypes(prev => ({ ...prev, incoming: !prev.incoming }))}
                  />
                  <span>Incoming</span>
                </label>
                <label className={styles.filterLabel}>
                  <input
                    type="checkbox"
                    checked={messageTypes.outgoing}
                    onChange={() => setMessageTypes(prev => ({ ...prev, outgoing: !prev.outgoing }))}
                  />
                  <span>Outgoing</span>
                </label>
              </div>
              <button
                className={styles.clearButton}
                onClick={clearMessages}
                title="Clear Messages"
              >
                <i className="fas fa-eraser"></i>
                {theme !== 'minimal' && 'Clear'}
              </button>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.messagesList}>
              {filteredMessages.length === 0 ? (
                <div className={styles.emptyMessages}>
                  <i className="fas fa-comment-slash"></i>
                  <p>No OSC messages received yet</p>
                </div>
              ) : (
                filteredMessages.slice().reverse().map((msg, index) => (
                  <div 
                    key={index}
                    className={`${styles.oscMessage} ${msg.outgoing ? styles.outgoing : styles.incoming}`}
                  >
                    <div className={styles.messageHeader}>
                      <span className={styles.messageType}>
                        {msg.outgoing ? 'OUT' : 'IN'}
                      </span>
                      <span className={styles.messageTimestamp}>
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    
                    <div className={styles.messageAddress}>
                      {msg.address}
                    </div>
                    
                    <div className={styles.messageArgs}>
                      {msg.args && msg.args.map((arg, argIndex) => (
                        <div key={argIndex} className={styles.argItem}>
                          <span className={styles.argType}>{arg.type}</span>
                          <span className={styles.argValue}>{String(arg.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.oscInfo}>
        <h3>
          {theme === 'artsnob' && 'OSC Protocol: The Language of Digital Expression'}
          {theme === 'standard' && 'OSC Protocol Information'}
          {theme === 'minimal' && 'Info'}
        </h3>
        
        <div className={styles.infoContent}>
          <p>
            Open Sound Control (OSC) is a protocol for communication among computers, sound synthesizers, and other multimedia devices optimized for modern networking technology.
          </p>
          
          <h4>Common OSC Address Patterns:</h4>
          <ul>
            <li><code>/fixture/1</code> - Control fixture 1</li>
            <li><code>/dmx/1</code> - Control DMX channel 1</li>
            <li><code>/scene/load</code> - Load a scene</li>
            <li><code>/master/brightness</code> - Set master brightness</li>
          </ul>
          
          <h4>Supported OSC Types:</h4>
          <ul>
            <li><code>i</code> - Integer (32-bit)</li>
            <li><code>f</code> - Float (32-bit)</li>
            <li><code>s</code> - String</li>
            <li><code>b</code> - Blob</li>
          </ul>
        </div>
      </div>
    </div>
  )
}