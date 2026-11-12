import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Users,
  Bell,
  Info,
  ArrowRight,
  X,
  Clock,
  ListChecks,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const { profile } = useAuth()
  const { theme, houseLogo } = useTheme()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [notices, setNotices] = useState([])
  const [balance, setBalance] = useState(null)
  const [showAbout, setShowAbout] = useState(false)
  const [aboutText, setAboutText] = useState('')
  const [houseImage, setHouseImage] = useState(null)

  const isSacerdote = profile?.app_role === 'sacerdote'

  useEffect(() => {
    loadData()
    loadHouseInfo()
  }, [])

  const loadData = async () => {
    // Próximos 2 eventos
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(2)

    if (eventsData) setEvents(eventsData)

    // Minhas 3 tarefas mais próximas do prazo
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('responsible_id', profile.id)
      .neq('status', 'concluida')
      .order('due_date', { ascending: true })
      .limit(3)

    if (tasksData) setTasks(tasksData)

    // Últimos 3 avisos
    const { data: noticesData } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)

    if (noticesData) setNotices(noticesData)

    // Saldo (só sacerdote)
    if (isSacerdote) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount')

      if (transactions) {
        const total = transactions.reduce((acc, t) => {
          return acc + (t.type === 'income' ? t.amount : -t.amount)
        }, 0)
        setBalance(total)
      }
    }
  }

  const loadHouseInfo = async () => {
    // Carregar texto "Quem Somos" e imagem da casa
    const { data } = await supabase
      .from('house_info')
      .select('*')
      .single()

    if (data) {
      setAboutText(data.about_text || '')
      setHouseImage(data.house_image_url || null)
    }
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* HERO CARD - BOAS VINDAS */}
      {/* ============================================ */}
      <div
        className="relative rounded-lg overflow-hidden shadow-sm"
        style={{
          backgroundColor: theme.page.surface,
          border: `1px solid ${theme.page.border}`,
          minHeight: '280px',
        }}
      >
        {/* Imagem de fundo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: houseImage
              ? `url(${houseImage})`
              : houseLogo
              ? `url(${houseLogo})`
              : 'none',
            opacity: 0.15,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${theme.sidebar.bg} 0%, ${theme.sidebar.bg}dd 100%)`,
          }}
        />

        {/* Conteúdo */}
        <div className="relative z-10 p-8 md:p-12">
          <p
            className="text-sm uppercase tracking-widest mb-3"
            style={{ color: theme.sidebar.textMuted }}
          >
            Bem-vindo de volta
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              fontFamily: theme.font.display,
              color: theme.sidebar.text,
            }}
          >
            Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p
            className="text-lg mb-6 max-w-2xl"
            style={{ color: theme.sidebar.textMuted }}
          >
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <button
            onClick={() => setShowAbout(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: theme.accent,
              color: '#ffffff',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Info className="w-4 h-4" />
            Quem Somos
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* CARDS DE DADOS */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Próximos Eventos */}
        <div
          className="rounded-lg p-6 cursor-pointer transition-all hover:shadow-md"
          style={{
            backgroundColor: theme.page.surface,
            border: `1px solid ${theme.page.border}`,
          }}
          onClick={() => navigate('/calendario')}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: theme.page.textMuted }}
              >
                Próximos Eventos
              </p>
              <p
                className="text-3xl font-bold"
                style={{ fontFamily: theme.font.display, color: theme.page.text }}
              >
                {events.length}
              </p>
            </div>
            <Calendar
              className="w-8 h-8"
              style={{ color: theme.primary, strokeWidth: 1.5 }}
            />
          </div>
          {events.length > 0 && (
            <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${theme.page.border}` }}>
              {events.map((event) => (
                <div key={event.id}>
                  <p className="text-sm font-medium" style={{ color: theme.page.text }}>
                    {event.title}
                  </p>
                  <p className="text-xs" style={{ color: theme.page.textMuted }}>
                    {formatDate(event.event_date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minhas Tarefas */}
        <div
          className="rounded-lg p-6 cursor-pointer transition-all hover:shadow-md"
          style={{
            backgroundColor: theme.page.surface,
            border: `1px solid ${theme.page.border}`,
          }}
          onClick={() => navigate('/tarefas')}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: theme.page.textMuted }}
              >
                Minhas Tarefas
              </p>
              <p
                className="text-3xl font-bold"
                style={{ fontFamily: theme.font.display, color: theme.page.text }}
              >
                {tasks.length}
              </p>
            </div>
            <ListChecks
              className="w-8 h-8"
              style={{ color: theme.primary, strokeWidth: 1.5 }}
            />
          </div>
          {tasks.length > 0 && (
            <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${theme.page.border}` }}>
              {tasks.map((task) => (
                <div key={task.id}>
                  <p className="text-sm font-medium" style={{ color: theme.page.text }}>
                    {task.title}
                  </p>
                  <p className="text-xs" style={{ color: theme.page.textMuted }}>
                    {formatDate(task.due_date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saldo em Caixa (só sacerdote) */}
        {isSacerdote && (
          <div
            className="rounded-lg p-6 cursor-pointer transition-all hover:shadow-md"
            style={{
              backgroundColor: theme.page.surface,
              border: `1px solid ${theme.page.border}`,
            }}
            onClick={() => navigate('/financeiro')}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p
                  className="text-xs uppercase tracking-wider mb-1"
                  style={{ color: theme.page.textMuted }}
                >
                  Saldo em Caixa
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{ fontFamily: theme.font.display, color: theme.page.text }}
                >
                  {formatCurrency(balance)}
                </p>
              </div>
              <DollarSign
                className="w-8 h-8"
                style={{ color: theme.primary, strokeWidth: 1.5 }}
              />
            </div>
            <p className="text-xs pt-3" style={{ borderTop: `1px solid ${theme.page.border}`, color: theme.page.textMuted }}>
              Atualizado agora
            </p>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* MURAL DE AVISOS */}
      {/* ============================================ */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: theme.page.surface,
          border: `1px solid ${theme.page.border}`,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: theme.font.display, color: theme.page.text }}
          >
            Mural de Avisos
          </h2>
          <ArrowRight
            className="w-5 h-5 cursor-pointer hover:opacity-70"
            style={{ color: theme.primary }}
            onClick={() => navigate('/')}
          />
        </div>

        {notices.length === 0 ? (
          <p className="text-sm" style={{ color: theme.page.textMuted }}>
            Nenhum aviso publicado ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="pb-4"
                style={{ borderBottom: `1px solid ${theme.page.border}` }}
              >
                <div className="flex items-start gap-3">
                  <Bell
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    style={{ color: theme.accent, strokeWidth: 1.5 }}
                  />
                  <div className="flex-1">
                    <h3
                      className="font-medium mb-1"
                      style={{ color: theme.page.text }}
                    >
                      {notice.title}
                    </h3>
                    <p
                      className="text-sm mb-2"
                      style={{ color: theme.page.textMuted }}
                    >
                      {notice.content}
                    </p>
                    <p className="text-xs" style={{ color: theme.page.textMuted }}>
                      {new Date(notice.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* MODAL QUEM SOMOS */}
      {/* ============================================ */}
      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAbout(false)}
        >
          <div
            className="max-w-2xl w-full rounded-lg p-8"
            style={{
              backgroundColor: theme.page.surface,
              border: `1px solid ${theme.page.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2
                className="text-3xl font-bold"
                style={{ fontFamily: theme.font.display, color: theme.page.text }}
              >
                Quem Somos
              </h2>
              <button
                onClick={() => setShowAbout(false)}
                style={{ color: theme.page.textMuted }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div
              className="prose max-w-none"
              style={{ color: theme.page.text }}
            >
              {aboutText ? (
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {aboutText}
                </p>
              ) : (
                <p className="text-base" style={{ color: theme.page.textMuted }}>
                  Nenhuma informação cadastrada ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}