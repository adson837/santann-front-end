import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabaseClient'

export default function Settings() {
  const { profile } = useAuth()
  const { theme, mode, houseLogo, themes, updatePreferences } = useTheme()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [orgName, setOrgName] = useState(profile?.organization_name || '')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef(null)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, organization_name: orgName })
      .eq('id', profile.id)
    
    if (error) setMessage('Erro: ' + error.message)
    else setMessage('Perfil atualizado com sucesso!')
  }

  const handleLogoUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    setMessage('Erro: A imagem deve ter no máximo 5MB')
    return
  }
  
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`
    const filePath = `house-logos/${fileName}`
    
    console.log('Enviando arquivo:', filePath)
    
    const { error: uploadError } = await supabase.storage
      .from('house-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      setMessage('Erro ao enviar logo: ' + uploadError.message)
      return
    }
    
    const { data: urlData } = supabase.storage
      .from('house-logos')
      .getPublicUrl(filePath)
    
    console.log('URL pública:', urlData.publicUrl)
    
    await updatePreferences({ house_logo_url: urlData.publicUrl })
    setMessage('Logo atualizada com sucesso!')
  } catch (err) {
    console.error('Erro inesperado:', err)
    setMessage('Erro inesperado: ' + err.message)
  }
}

  const isDark = mode === 'dark'

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
        Configurações
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--theme-text-muted)' }}>
        Personalize sua experiência no Santann
      </p>

      {/* SEÇÃO: TEMA CULTURAL */}
      <div className="santann-card mb-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          🎨 Tema Cultural
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--theme-text-muted)' }}>
          Escolha a identidade visual da sua casa
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(themes).map(([key, t]) => {
            const isSelected = theme === key
            return (
              <button
                key={key}
                onClick={() => {
                  console.log(' Clicou no tema:', key)
                  updatePreferences({ theme: key })
                }}
                className="relative p-4 rounded-lg border-2 transition-all hover:scale-105 text-left"
                style={{
                  backgroundColor: t.background,
                  borderColor: isSelected ? t.primary : t.border,
                  boxShadow: isSelected ? `0 4px 12px ${t.primary}40` : 'none'
                }}
              >
                {isSelected && (
                  <div 
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: t.primary }}
                  >
                    ✓
                  </div>
                )}
                <div 
                  className="w-full h-16 rounded mb-3 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: t.primary }}
                >
                  {t.name}
                </div>
                <p className="text-xs font-medium" style={{ color: t.text }}>{t.name}</p>
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                  {key === 'afro' && 'Tons terrosos e padrões geométricos'}
                  {key === 'oriental' && 'Vermelho, dourado e serenidade'}
                  {key === 'europeu' && 'Azul clássico e elegância'}
                  {key === 'arabe' && 'Dourado e arabescos ornamentados'}
                  {key === 'amerindio' && 'Verde natureza e elementos tribais'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* SEÇÃO: MODO CLARO/ESCURO */}
      <div className="santann-card mb-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          ☀️ Modo de Exibição
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => updatePreferences({ mode: 'light' })}
            className="flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3"
            style={{
              backgroundColor: mode === 'light' ? 'var(--theme-primary)' : 'var(--theme-surface)',
              borderColor: mode === 'light' ? 'var(--theme-primary)' : 'var(--theme-border)',
              color: mode === 'light' ? '#fff' : 'var(--theme-text)'
            }}
          >
            <span className="text-2xl">☀️</span>
            <div className="text-left">
              <div className="font-bold">Claro</div>
              <div className="text-xs opacity-80">Visual tradicional</div>
            </div>
          </button>
          <button
            onClick={() => updatePreferences({ mode: 'dark' })}
            className="flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3"
            style={{
              backgroundColor: mode === 'dark' ? 'var(--theme-primary)' : 'var(--theme-surface)',
              borderColor: mode === 'dark' ? 'var(--theme-primary)' : 'var(--theme-border)',
              color: mode === 'dark' ? '#fff' : 'var(--theme-text)'
            }}
          >
            <span className="text-2xl">🌙</span>
            <div className="text-left">
              <div className="font-bold">Escuro</div>
              <div className="text-xs opacity-80">Conforto visual</div>
            </div>
          </button>
        </div>
      </div>

      {/* SEÇÃO: LOGO DA CASA */}
      <div className="santann-card mb-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          🏠 Logo da Casa
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
          Esta logo aparecerá no topo da sidebar. Deixe em branco para usar "Santann".
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          {houseLogo ? (
            <img src={houseLogo} alt="Logo atual" className="h-20 w-auto object-contain border rounded p-2" />
          ) : (
            <div className="h-20 w-32 border-2 border-dashed rounded flex items-center justify-center text-sm" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
              Sem logo
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="santann-btn"
          >
            {houseLogo ? 'Trocar Logo' : 'Enviar Logo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* SEÇÃO: EDITAR PERFIL */}
      <div className="santann-card mb-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          👤 Editar Perfil
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="santann-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Nome da organização</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="santann-input"
            />
          </div>
          <button type="submit" className="santann-btn">Salvar Perfil</button>
        </form>
      </div>

      {/* SEÇÃO: AJUDA */}
      <div className="santann-card">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
          ❓ Ajuda
        </h2>
        <div className="space-y-3 text-sm" style={{ color: 'var(--theme-text)' }}>
          <p><strong>Sacerdote:</strong> Pode criar eventos, tarefas, gerenciar membros e finanças.</p>
          <p><strong>Membro:</strong> Pode visualizar eventos, tarefas atribuídas e avisos.</p>
          <p><strong>Temas:</strong> Cada tema cultural muda cores, fontes e padrões de fundo.</p>
          <p><strong>Dúvidas?</strong> Entre em contato com o administrador da casa.</p>
        </div>
      </div>

      {message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${message.includes('Erro') ? 'bg-red-500' : 'bg-green-500'}`}>
          {message}
        </div>
      )}
    </div>
  )
}