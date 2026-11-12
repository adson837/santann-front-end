import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const ThemeContext = createContext({})

const THEMES = {
  afro: {
    name: 'Afro',
    primary: '#8B4513',
    primaryHover: '#6B3410',
    secondary: '#D2691E',
    accent: '#CD853F',
    background: '#FDF5E6',
    surface: '#FFF8DC',
    text: '#3E2723',
    textMuted: '#6D4C41',
    border: '#D7CCC8',
    sidebar: '#5D4037',
    sidebarText: '#FFF8DC',
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 5 L35 15 L30 25 L25 15 Z M30 35 L35 45 L30 55 L25 45 Z M5 30 L15 35 L25 30 L15 25 Z M35 30 L45 35 L55 30 L45 25 Z' fill='%23D2691E' opacity='0.08'/%3E%3C/svg%3E")`,
    font: "'Merriweather', serif",
    cardRadius: '12px',
    cardShadow: '4px 4px 0px rgba(139, 69, 19, 0.2)',
    cardBorder: '2px solid #8B4513'
  },
  oriental: {
    name: 'Oriental',
    primary: '#8B0000',
    primaryHover: '#6B0000',
    secondary: '#DAA520',
    accent: '#B22222',
    background: '#FFF8F0',
    surface: '#FFFAF5',
    text: '#2C1810',
    textMuted: '#8B6F47',
    border: '#E8D5C4',
    sidebar: '#F5E6D3',
    sidebarText: '#8B0000',
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='20' fill='none' stroke='%238B0000' stroke-width='0.5' opacity='0.1'/%3E%3Ccircle cx='40' cy='40' r='10' fill='none' stroke='%23DAA520' stroke-width='0.5' opacity='0.15'/%3E%3Cpath d='M40 20 Q50 30 40 40 Q30 30 40 20' fill='%238B0000' opacity='0.05'/%3E%3C/svg%3E")`,
    font: "'Noto Serif JP', serif",
    cardRadius: '4px',
    cardShadow: '0 2px 8px rgba(139, 0, 0, 0.1)',
    cardBorder: '1px solid #8B0000'
  },
  europeu: {
    name: 'Europeu',
    primary: '#1E3A8A',
    primaryHover: '#1E40AF',
    secondary: '#C0C0C0',
    accent: '#3B82F6',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#CBD5E1',
    sidebar: '#0F172A',
    sidebarText: '#E2E8F0',
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='%231E3A8A' stroke-width='0.5' opacity='0.06'/%3E%3Ccircle cx='20' cy='20' r='2' fill='%23C0C0C0' opacity='0.3'/%3E%3C/svg%3E")`,
    font: "'Cormorant Garamond', serif",
    cardRadius: '2px',
    cardShadow: '0 1px 3px rgba(30, 58, 138, 0.15)',
    cardBorder: '1px solid #1E3A8A'
  },
  arabe: {
    name: 'Árabe',
    primary: '#B8860B',
    primaryHover: '#996515',
    secondary: '#DAA520',
    accent: '#CD853F',
    background: '#FFFDF5',
    surface: '#FFFAE6',
    text: '#3E2723',
    textMuted: '#8B7355',
    border: '#E6D5A8',
    sidebar: '#8B6914',
    sidebarText: '#FFF8DC',
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M50 10 L60 30 L80 30 L65 45 L70 65 L50 55 L30 65 L35 45 L20 30 L40 30 Z' fill='none' stroke='%23B8860B' stroke-width='0.5' opacity='0.1'/%3E%3Ccircle cx='50' cy='50' r='8' fill='none' stroke='%23DAA520' stroke-width='0.5' opacity='0.15'/%3E%3C/svg%3E")`,
    font: "'Amiri', serif",
    cardRadius: '16px',
    cardShadow: '0 4px 12px rgba(184, 134, 11, 0.2)',
    cardBorder: '2px solid #DAA520'
  },
  amerindio: {
    name: 'Ameríndio',
    primary: '#2E5D3A',
    primaryHover: '#1E4629',
    secondary: '#8B6F47',
    accent: '#6B8E23',
    background: '#F5F1E8',
    surface: '#FAF6EC',
    text: '#2C1810',
    textMuted: '#6B5D4F',
    border: '#D4C5A9',
    sidebar: '#3E5D3A',
    sidebarText: '#F5F1E8',
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Cpath d='M25 5 L30 15 L25 25 L20 15 Z M10 25 L20 30 L10 35 L5 30 Z M40 25 L45 30 L40 35 L35 30 Z' fill='%232E5D3A' opacity='0.08'/%3E%3Cpath d='M5 5 Q25 15 45 5 Q25 25 5 5' fill='none' stroke='%238B6F47' stroke-width='0.5' opacity='0.1'/%3E%3C/svg%3E")`,
    font: "'Caveat', cursive",
    cardRadius: '20px',
    cardShadow: '3px 3px 0px rgba(46, 93, 58, 0.2)',
    cardBorder: '3px solid #2E5D3A'
  }
}

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth()
  const [theme, setTheme] = useState('afro')
  const [mode, setMode] = useState('light')
  const [houseLogo, setHouseLogo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        console.error('Erro ao carregar preferências:', error)
        // Cria preferências padrão se não existir
        await supabase.from('user_preferences').insert([{ user_id: user.id, theme: 'afro', mode: 'light' }])
        setLoading(false)
        return
      }
      
      if (data) {
        setTheme(data.theme || 'afro')
        setMode(data.mode || 'light')
        setHouseLogo(data.house_logo_url)
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
    }
    setLoading(false)
  }

  const updatePreferences = useCallback(async (updates) => {
    console.log('Atualizando preferências:', updates)
    
    if (updates.theme) {
      console.log('Tema selecionado:', updates.theme, THEMES[updates.theme])
      setTheme(updates.theme)
    }
    if (updates.mode) {
      console.log('Modo selecionado:', updates.mode)
      setMode(updates.mode)
    }
    if (updates.house_logo_url !== undefined) {
      setHouseLogo(updates.house_logo_url)
    }

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Erro ao salvar preferências:', error)
      } else {
        console.log('Preferências salvas com sucesso!')
      }
    } catch (err) {
      console.error('Erro inesperado ao salvar:', err)
    }
  }, [user])

  const currentTheme = THEMES[theme]
  const isDark = mode === 'dark'

  // Aplica variáveis CSS dinamicamente
  useEffect(() => {
    const root = document.documentElement
    const t = currentTheme
    
    const bg = isDark ? '#1a1a1a' : t.background
    const surface = isDark ? '#2d2d2d' : t.surface
    const text = isDark ? '#e5e5e5' : t.text
    const textMuted = isDark ? '#a0a0a0' : t.textMuted
    
    root.style.setProperty('--theme-primary', t.primary)
    root.style.setProperty('--theme-primary-hover', t.primaryHover)
    root.style.setProperty('--theme-secondary', t.secondary)
    root.style.setProperty('--theme-accent', t.accent)
    root.style.setProperty('--theme-bg', bg)
    root.style.setProperty('--theme-surface', surface)
    root.style.setProperty('--theme-text', text)
    root.style.setProperty('--theme-text-muted', textMuted)
    root.style.setProperty('--theme-border', isDark ? '#444' : t.border)
    root.style.setProperty('--theme-sidebar', isDark ? '#1a1a1a' : t.sidebar)
    root.style.setProperty('--theme-sidebar-text', isDark ? '#e5e5e5' : t.sidebarText)
    root.style.setProperty('--theme-pattern', t.pattern)
    root.style.setProperty('--theme-font', t.font)
    root.style.setProperty('--theme-card-radius', t.cardRadius)
    root.style.setProperty('--theme-card-shadow', t.cardShadow)
    root.style.setProperty('--theme-card-border', t.cardBorder)
    
    console.log('Variáveis CSS aplicadas:', { theme: t.name, mode: isDark ? 'dark' : 'light' })
  }, [theme, mode, currentTheme, isDark])

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      mode, 
      houseLogo, 
      isDark,
      themes: THEMES,
      updatePreferences,
      loading 
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)