import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Calendar,
  ListChecks,
  DollarSign,
  FileText,
  Users,
  Settings,
  Bell,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabaseClient'
import { useInactivityTimer } from '../hooks/useInactivityTimer'

function NotificationBell({ profile, theme }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const bellRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchNotifications = async () => {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      const { data } = await supabase
        .from('events')
        .select('*')
        .in('event_date', [today, tomorrow])
        .order('event_date')

      setNotifications(data || [])
    }
    fetchNotifications()
  }, [])

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md transition-colors"
        style={{ color: theme.header.text }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.page.border)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Bell className="w-5 h-5" strokeWidth={1.5} />
        {notifications.length > 0 && (
          <span
            className="absolute top-1 right-1 h-4 w-4 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: theme.accent }}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50"
          style={{
            backgroundColor: theme.page.surface,
            borderColor: theme.page.border,
          }}
        >
          <div className="p-4 border-b" style={{ borderColor: theme.page.border }}>
            <h4 className="font-medium" style={{ color: theme.page.text }}>
              Próximos Eventos
            </h4>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: theme.page.textMuted }}>
              Nenhum evento para hoje ou amanhã.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-4 border-b last:border-0"
                  style={{ borderColor: theme.page.border }}
                >
                  <div className="font-medium text-sm" style={{ color: theme.page.text }}>
                    {n.title}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.page.textMuted }}>
                    {new Date(n.event_date).toLocaleDateString('pt-BR')}
                    {n.start_time && ` às ${n.start_time}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }) {
  const { profile, signOut, user } = useAuth()
  const { theme, houseLogo } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useInactivityTimer(user)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Calendário', path: '/calendario', icon: Calendar },
    { name: 'Tarefas', path: '/tarefas', icon: ListChecks },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign, adminOnly: true },
    { name: 'Documentos', path: '/documentos', icon: FileText },
    { name: 'Membros', path: '/membros', icon: Users, adminOnly: true },
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
  ]

  const visibleMenus = menuItems.filter(
    (item) => !item.adminOnly || profile?.app_role === 'sacerdote'
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: theme.page.bg }}>
      {/* ============================================ */}
      {/* SIDEBAR */}
      {/* ============================================ */}
      <aside
        className="hidden md:flex flex-col w-64 relative z-20"
        style={{
          backgroundColor: theme.sidebar.bg,
          borderRight: `1px solid ${theme.sidebar.border}`,
        }}
      >
        {/* Logo */}
        <div
          className="p-6 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${theme.sidebar.border}` }}
        >
          {houseLogo ? (
            <img
              src={houseLogo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-md flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: theme.accent,
                color: '#ffffff',
              }}
            >
              S
            </div>
          )}
          <div>
            <h1
              className="text-lg font-bold leading-tight"
              style={{
                fontFamily: theme.font.display,
                color: theme.sidebar.text,
              }}
            >
              Santann
            </h1>
            {profile?.organization_name && (
              <p className="text-xs" style={{ color: theme.sidebar.textMuted }}>
                {profile.organization_name}
              </p>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMenus.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all"
                style={
                  isActive
                    ? {
                        backgroundColor: theme.sidebar.active,
                        color: theme.sidebar.text,
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: theme.sidebar.textMuted,
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = theme.sidebar.text
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = theme.sidebar.textMuted
                }}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Perfil */}
        <div
          className="p-4"
          style={{ borderTop: `1px solid ${theme.sidebar.border}` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: theme.accent,
                color: '#ffffff',
              }}
            >
              {profile?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: theme.sidebar.text }}
              >
                {profile?.full_name || 'Usuário'}
              </p>
              <p className="text-xs capitalize" style={{ color: theme.sidebar.textMuted }}>
                {profile?.app_role}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              color: theme.sidebar.textMuted,
              border: `1px solid ${theme.sidebar.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.sidebar.text
              e.currentTarget.style.backgroundColor = theme.sidebar.active
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.sidebar.textMuted
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sair
          </button>
        </div>
      </aside>

      {/* ============================================ */}
      {/* ÁREA PRINCIPAL */}
      {/* ============================================ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex justify-end items-center px-6 py-4"
          style={{
            backgroundColor: theme.header.bg,
            borderBottom: `1px solid ${theme.header.border}`,
          }}
        >
          <NotificationBell profile={profile} theme={theme} />
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}