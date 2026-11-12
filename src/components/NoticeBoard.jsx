import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function NoticeBoard() {
  const { profile } = useAuth()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => { fetchNotices() }, [])

  const fetchNotices = async () => {
    setLoading(true)
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false })
    if (data) setNotices(data)
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('notices').insert([{ title, content, author_id: profile.id }])
    if (!error) { setTitle(''); setContent(''); setShowForm(false); fetchNotices() }
    else alert('Erro ao criar aviso: ' + error.message)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este aviso?')) {
      const { error } = await supabase.from('notices').delete().eq('id', id)
      if (!error) fetchNotices()
    }
  }

  const isSacerdote = profile?.app_role === 'sacerdote'

  return (
    <div className="santann-card w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="santann-card-title mb-0">📢 Quadro de Avisos</h2>
        {isSacerdote && (
          <button onClick={() => setShowForm(!showForm)} className="santann-btn text-sm py-1 px-3">
            {showForm ? 'Cancelar' : '+ Novo Aviso'}
          </button>
        )}
      </div>

      {showForm && isSacerdote && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input type="text" placeholder="Título do aviso" value={title} onChange={(e) => setTitle(e.target.value)} required className="santann-input mb-3" />
          <textarea placeholder="Conteúdo do aviso..." value={content} onChange={(e) => setContent(e.target.value)} required rows="3" className="santann-input mb-3" />
          <button type="submit" className="santann-btn w-full">Publicar Aviso</button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-4">Carregando avisos...</p>
      ) : notices.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Nenhum aviso publicado ainda.</p>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div key={notice.id} className="p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-[#5c2e0e] text-lg">{notice.title}</h3>
                {isSacerdote && <button onClick={() => handleDelete(notice.id)} className="text-red-500 hover:text-red-700 text-sm">Apagar</button>}
              </div>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{notice.content}</p>
              <p className="text-xs text-gray-400 mt-3">Publicado em {new Date(notice.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}