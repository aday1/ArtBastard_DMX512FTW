import { useEffect } from 'react'
import { Layout } from './components/layout/Layout'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import { useStore } from './store'
import MainPage from './pages/MainPage'

function App() {
  const fetchInitialState = useStore((state) => state.fetchInitialState)

  useEffect(() => {
    fetchInitialState()
  }, [fetchInitialState])

  return (
    <ThemeProvider>
      <SocketProvider>
        <Layout>
          <MainPage />
        </Layout>
      </SocketProvider>
    </ThemeProvider>
  )
}

export default App