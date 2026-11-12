  import Documentos from './pages/Documentos'
  import Membros from './pages/Membros'
  import Financeiro from './pages/Financeiro'
   import Tasks from './pages/Tasks'
import Settings from './pages/Settings'
   import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Layout from './components/Layout'

function AppContent() {
  const { user, loading } = useAuth()

  // Tela de carregamento inicial
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img src="/images/santann-logo.png" alt="Logo" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-[#5c2e0e] font-medium">Carregando Santann...</p>
        </div>
      </div>
    )
  }

  // Rotas Públicas (Login e Cadastro)
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
        
      </Routes>
    )
  }

  // Rotas Privadas (Sistema com Layout)
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendario" element={<Calendar />} />
       <Route path="/tarefas" element={<Tasks />} />
       <Route path="/financeiro" element={<Financeiro />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/membros" element={<Membros />} />
        <Route path="/documentos" element={<Layout><Documentos /></Layout>} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}