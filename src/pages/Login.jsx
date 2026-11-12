import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

    const handleAuth = async (e) => {
    e.preventDefault()
    console.log("1. Clique no botão recebido!") // Teste 1
    setMessage('')
    setLoading(true)
    
    console.log("2. Enviando dados para o Supabase...") // Teste 2
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    console.log("3. Resposta recebida:", data, error) // Teste 3
    
    if (error) {
      setMessage('Erro ao entrar: ' + error.message)
    }
    setLoading(false)
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 watermark"></div>
      <div className="z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-6">
          <img src="/images/santann-logo.png" alt="Santann Logo" className="h-20 w-auto object-contain" />
        </div>
        <div className="flex justify-center mb-8">
          <img src="/images/Santann-type.png" alt="Santann" className="h-12 w-auto object-contain" />
        </div>

        <div className="santann-card">
          <h2 className="santann-card-title text-center text-2xl">Entre no Santann</h2>
          <p className="text-center text-gray-500 text-sm mb-6">Entre com seu login e senha</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="santann-input" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="santann-input" placeholder="••••••••" />
            </div>

            {message && <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">{message}</div>}

            <button type="submit" disabled={loading} className="santann-btn w-full mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Link to="/cadastro" className="text-sm santann-link">Não tem conta? Cadastre-se</Link>
          </div>
        </div>
        <div className="mt-8 text-center"><p className="text-xs text-gray-400">© 2026 Santann - Gestão de Centros Religiosos</p></div>
      </div>
    </div>
  )
}