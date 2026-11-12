import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ fullName: '', orgName: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.fullName } }
    })

    if (authError) {
      setMessage('Erro: ' + authError.message)
    } else if (authData.user) {
      await supabase.from('profiles').update({ organization_name: formData.orgName }).eq('id', authData.user.id)
      setMessage('Conta criada com sucesso! Redirecionando...')
      setTimeout(() => navigate('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-6"><img src="/images/santann-logo.png" alt="Logo" className="h-20 w-auto" /></div>
        <div className="flex justify-center mb-8"><img src="/images/Santann-type.png" alt="Santann" className="h-12 w-auto" /></div>

        <div className="santann-card">
          <h2 className="santann-card-title text-center text-2xl">Criar Conta</h2>
          <form onSubmit={handleRegister} className="space-y-4 mt-4">
            <input name="fullName" placeholder="Nome completo" value={formData.fullName} onChange={handleChange} required className="santann-input" />
            <input name="orgName" placeholder="Nome da organização" value={formData.orgName} onChange={handleChange} required className="santann-input" />
            <input name="email" type="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required className="santann-input" />
            <input name="password" type="password" placeholder="Senha" value={formData.password} onChange={handleChange} required className="santann-input" />

            {message && <div className={`p-3 rounded-md text-sm ${message.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message}</div>}

            <button type="submit" disabled={loading} className="santann-btn w-full mt-2">{loading ? 'Cadastrando...' : 'Cadastrar'}</button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Link to="/login" className="text-sm santann-link">Já tem conta? Faça Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}