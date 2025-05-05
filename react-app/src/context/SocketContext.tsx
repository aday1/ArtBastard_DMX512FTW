import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '../store'

export interface SocketContextType {
  socket: Socket | null
  connected: boolean
  reconnect: () => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  reconnect: () => {}
})

export const useSocket = (): SocketContextType => useContext(SocketContext)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [serverAvailable, setServerAvailable] = useState(true)
  const maxRetries = 5
  const initialRetryDelay = 1000
  const maxRetryDelay = 10000
  
  const showStatusMessage = useStore((state) => state.showStatusMessage)
  const socket = useStore((state) => state.socket)
  const setSocket = useStore((state) => state.setSocket)

  // Check server availability before attempting socket connection
  const checkServerAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const available = response.ok
      setServerAvailable(available)
      return available
    } catch (error) {
      console.error('Server availability check failed:', error)
      setServerAvailable(false)
      return false
    }
  }, [])

  const getRetryDelay = useCallback((attempt: number) => {
    // Exponential backoff with jitter
    const delay = Math.min(
      initialRetryDelay * Math.pow(2, attempt),
      maxRetryDelay
    )
    // Add random jitter ±20%
    return delay * (0.8 + Math.random() * 0.4)
  }, [])

  const initSocket = useCallback(async () => {
    // Clean up existing socket if any
    if (socket) {
      socket.close()
      setSocket(null)
    }

    // Check server availability first
    const isAvailable = await checkServerAvailability()
    if (!isAvailable) {
      showStatusMessage('Server unavailable - will retry connecting', 'error')
      // Schedule retry with backoff
      const delay = getRetryDelay(retryCount)
      setTimeout(() => {
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1)
          initSocket()
        }
      }, delay)
      return null
    }

    console.log('Initializing socket connection...')
    
    const newSocket = io('/', {
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: maxRetries,
      reconnectionDelay: initialRetryDelay,
      reconnectionDelayMax: maxRetryDelay,
      timeout: 20000,
      autoConnect: true,
      transports: ['websocket', 'polling'] // Fall back to polling if websocket fails
    })

    newSocket.on('connect', () => {
      console.log('Socket connected successfully')
      setConnected(true)
      setRetryCount(0)
      showStatusMessage('Connected to the luminous server', 'success')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setConnected(false)
      
      if (error.message.includes('ECONNREFUSED')) {
        showStatusMessage('Server connection refused - checking availability', 'error')
        checkServerAvailability()
      } else {
        showStatusMessage(`Connection error: ${error.message}`, 'error')
      }
      
      if (retryCount < maxRetries) {
        const delay = getRetryDelay(retryCount)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          initSocket()
        }, delay)
      } else {
        showStatusMessage('Maximum retry attempts reached - please try manual reconnect', 'error')
      }
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnected(false)
      showStatusMessage('Connection lost - attempting to reconnect', 'error')
    })

    newSocket.io.on('reconnect', (attempt) => {
      console.log('Socket reconnected after', attempt, 'attempts')
      showStatusMessage('Connection restored', 'success')
    })

    newSocket.io.on('reconnect_attempt', (attempt) => {
      console.log('Reconnection attempt:', attempt)
      if (attempt <= maxRetries) {
        showStatusMessage('Attempting to reconnect...', 'info')
      }
    })

    newSocket.io.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error)
      showStatusMessage('Reconnection failed - will retry', 'error')
    })

    setSocket(newSocket)
    return newSocket
  }, [socket, showStatusMessage, setSocket, retryCount, maxRetries, checkServerAvailability, getRetryDelay])

  // Initialize socket on mount
  useEffect(() => {
    let socketInstance: Socket | null = null;
    
    const initialize = async () => {
      socketInstance = await initSocket();
    };
    
    initialize();
    
    return () => {
      if (socketInstance) {
        socketInstance.close();
        setSocket(null);
      }
    };
  }, [initSocket, setSocket])

  const reconnect = useCallback(() => {
    console.log('Manual reconnect requested')
    setRetryCount(0) // Reset retry count for manual reconnection
    initSocket()
  }, [initSocket])

  return (
    <SocketContext.Provider value={{ 
      socket, 
      connected, 
      reconnect 
    }}>
      {children}
    </SocketContext.Provider>
  )
}