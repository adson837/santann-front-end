import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { validateDocument, formatFileSize } from '../utils/fileValidator'

export default function Documentos() {
  const { profile } = useAuth()
  const [documents, setDocuments] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('todas')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [newDoc, setNewDoc] = useState({ title: '', category_id: '', description: '' })
  const [file, setFile] = useState(null)

  const isSacerdote = profile?.app_role === 'sacerdote'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [docsRes, catsRes] = await Promise.all([
      supabase
        .from('documents')
        .select('*, category:document_categories(name, color)')
        .order('created_at', { ascending: false }),
      supabase.from('document_categories').select('*').order('name')
    ])
    if (docsRes.data) setDocuments(docsRes.data)
    if (catsRes.data) setCategories(catsRes.data)
    setLoading(false)
  }

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'todas' || doc.category_id === filterCategory
    return matchesSearch && matchesCategory
  })

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      alert('Selecione um arquivo')
      return
    }

    const validation = validateDocument(file)
    if (!validation.valid) {
      alert('Erro no upload:\n' + validation.errors.join('\n'))
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`
      const filePath = `documents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('app-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('app-files')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase.from('documents').insert([{
        title: newDoc.title,
        description: newDoc.description,
        category_id: newDoc.category_id || null,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: profile.id
      }])

      if (dbError) throw dbError

      setNewDoc({ title: '', category_id: '', description: '' })
      setFile(null)
      setShowUploadForm(false)
      loadData()
    } catch (err) {
      alert('Erro: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return

    const doc = documents.find(d => d.id === docId)
    if (doc?.file_url) {
      const filePath = doc.file_url.split('/').pop()
      await supabase.storage.from('app-files').remove([`documents/${filePath}`])
    }

    await supabase.from('documents').delete().eq('id', docId)
    loadData()
    setSelectedDoc(null)
  }

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop().toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc', 'docx'].includes(ext)) return '📝'
    if (['xls', 'xlsx'].includes(ext)) return '📊'
    return '📎'
  }

  if (loading) return <p className="text-center py-8">Carregando documentos...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
  <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>
    📚 Documentos
  </h1>
  {isSacerdote && (
    <div className="flex gap-2">
      <button
        onClick={() => setShowCategoryManager(true)}
        className="px-4 py-2 rounded-lg font-medium text-sm border-2 hover:opacity-80 transition"
        style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }}
      >
        Gerenciar Categorias
      </button>
      <button
        onClick={() => setShowUploadForm(true)}
        className="santann-btn"
      >
        + Upload Documento
      </button>
    </div>
  )}
</div>

      {/* Filtros */}
      <div className="santann-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar documentos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="santann-input"
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="santann-input"
          >
            <option value="todas">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Documentos */}
      {filteredDocs.length === 0 ? (
  <div className="santann-card text-center py-12">
    <p className="text-6xl mb-4">📂</p>
    <p className="text-lg" style={{ color: 'var(--theme-text-muted)' }}>
      {searchTerm || filterCategory !== 'todas' 
        ? 'Nenhum documento encontrado com os filtros aplicados.'
        : 'Nenhum documento cadastrado ainda.'}
    </p>
    {isSacerdote && !searchTerm && filterCategory === 'todas' && (
      <button
        onClick={() => setShowUploadForm(true)}
        className="santann-btn mt-4"
      >
        Fazer primeiro upload
      </button>
    )}
  </div>
) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="santann-card cursor-pointer hover:shadow-lg transition"
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl">{getFileIcon(doc.file_name)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate" style={{ color: 'var(--theme-text)' }}>
                    {doc.title}
                  </h3>
                  {doc.category && (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: doc.category.color + '20',
                        color: doc.category.color
                      }}
                    >
                      {doc.category.name}
                    </span>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              {doc.description && (
                <p className="text-sm mt-3 line-clamp-2" style={{ color: 'var(--theme-text-muted)' }}>
                  {doc.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploadForm(false)}
        >
          <div
            className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            style={{ backgroundColor: 'var(--theme-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                Upload de Documento
              </h2>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  Título do documento *
                </label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                  required
                  className="santann-input"
                  placeholder="Ex: Ata da reunião de março"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  Categoria
                </label>
                <select
                  value={newDoc.category_id}
                  onChange={e => setNewDoc({ ...newDoc, category_id: e.target.value })}
                  className="santann-input"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={newDoc.description}
                  onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                  rows="3"
                  className="santann-input"
                  placeholder="Breve descrição do conteúdo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  Arquivo * (PDF, DOC, DOCX, XLS, XLSX - máx 5MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={e => setFile(e.target.files[0])}
                  required
                  className="santann-input"
                />
                {file && (
                  <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                    Selecionado: {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="santann-btn flex-1"
                >
                  {uploading ? 'Enviando...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 rounded border"
                  style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--theme-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: 'var(--theme-border)' }}>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
                  {selectedDoc.title}
                </h2>
                {selectedDoc.category && (
                  <span
                    className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: selectedDoc.category.color + '20',
                      color: selectedDoc.category.color
                    }}
                  >
                    {selectedDoc.category.name}
                  </span>
                )}
                <p className="text-sm mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                  {formatFileSize(selectedDoc.file_size)} • {new Date(selectedDoc.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedDoc.description && (
                <div className="mb-4">
                  <h3 className="font-bold mb-2" style={{ color: 'var(--theme-text)' }}>Descrição</h3>
                  <p style={{ color: 'var(--theme-text)' }}>{selectedDoc.description}</p>
                </div>
              )}

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <h3 className="font-bold mb-2" style={{ color: 'var(--theme-text)' }}>Informações do Arquivo</h3>
                <div className="space-y-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  <p><strong>Nome:</strong> {selectedDoc.file_name}</p>
                  <p><strong>Tamanho:</strong> {formatFileSize(selectedDoc.file_size)}</p>
                  <p><strong>Uploadado em:</strong> {new Date(selectedDoc.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--theme-border)' }}>
  <a
    href={selectedDoc.file_url}
    target="_blank"
    rel="noopener noreferrer"
    className="santann-btn flex-1 text-center"
  >
    📥 Download
  </a>
  <a
    href={selectedDoc.file_url}
    target="_blank"
    rel="noopener noreferrer"
    className="px-4 py-2 rounded border text-center"
    style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
  >
    👁️ Visualizar
  </a>
  {isSacerdote && (
    <button
      onClick={() => handleDelete(selectedDoc.id)}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      Excluir
    </button>
  )}
</div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Categorias */}
      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}

// ==================== GERENCIADOR DE CATEGORIAS ====================
function CategoryManager({ categories, onClose, onUpdate }) {
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3B82F6' })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ name: '', color: '' })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    const { error } = await supabase.from('document_categories').insert([newCategory])
    if (!error) {
      setNewCategory({ name: '', color: '#3B82F6' })
      onUpdate()
    } else {
      alert('Erro: ' + error.message)
    }
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setEditData({ name: cat.name, color: cat.color })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('document_categories').update(editData).eq('id', editingId)
    if (!error) {
      setEditingId(null)
      setEditData({ name: '', color: '' })
      onUpdate()
    } else {
      alert('Erro: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      const { error } = await supabase.from('document_categories').delete().eq('id', id)
      if (!error) {
        onUpdate()
      } else {
        alert('Erro: ' + error.message)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--theme-surface)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
            Gerenciar Categorias
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
          <h3 className="font-bold mb-3" style={{ color: 'var(--theme-text)' }}>Nova Categoria</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome da categoria (ex: Atas, Estatutos)"
              value={newCategory.name}
              onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
              required
              className="santann-input"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--theme-text)' }}>Cor:</label>
              <input
                type="color"
                value={newCategory.color}
                onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                className="w-16 h-10 rounded border cursor-pointer"
              />
            </div>
            <button type="submit" className="santann-btn w-full">Adicionar Categoria</button>
          </div>
        </form>

        <div className="space-y-3">
          <h3 className="font-bold" style={{ color: 'var(--theme-text)' }}>
            Categorias Cadastradas ({categories.length})
          </h3>
          {categories.map(cat => (
            <div
              key={cat.id}
              className="p-4 rounded-lg flex justify-between items-center"
              style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}
            >
              {editingId === cat.id ? (
                <form onSubmit={handleUpdate} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    required
                    className="santann-input flex-1"
                  />
                  <input
                    type="color"
                    value={editData.color}
                    onChange={e => setEditData({ ...editData, color: e.target.value })}
                    className="w-16 h-10 rounded border cursor-pointer"
                  />
                  <button type="submit" className="santann-btn">Salvar</button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded border"
                    style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    ></div>
                    <span className="font-medium" style={{ color: 'var(--theme-text)' }}>
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="px-3 py-1 text-sm rounded hover:opacity-80"
                      style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}