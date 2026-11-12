import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Membros() {
  const { profile } = useAuth()
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterRole, setFilterRole] = useState('todos')
  const [selectedMember, setSelectedMember] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showRolesManager, setShowRolesManager] = useState(false)

  const isSacerdote = profile?.app_role === 'sacerdote'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [membersRes, rolesRes] = await Promise.all([
      supabase.from('member_details').select('*, role:member_roles(name)').order('full_name'),
      supabase.from('member_roles').select('*').order('name')
    ])
    if (membersRes.data) setMembers(membersRes.data)
    if (rolesRes.data) setRoles(rolesRes.data)
    setLoading(false)
  }

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'todos' || m.status === filterStatus
    const matchesRole = filterRole === 'todos' || m.role_id === filterRole
    return matchesSearch && matchesStatus && matchesRole
  })

  const getStatusColor = (status) => {
    const colors = {
      ativo: 'bg-green-100 text-green-800',
      inativo: 'bg-gray-100 text-gray-800',
      visitante: 'bg-blue-100 text-blue-800',
      novico: 'bg-yellow-100 text-yellow-800',
      afastado: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>
          Membros da Casa
        </h1>
        {isSacerdote && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowRolesManager(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm border-2 hover:opacity-80 transition"
              style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }}
            >
              Gerenciar Cargos
            </button>
            <button onClick={() => { setShowForm(true); setEditMode(false); setSelectedMember(null) }} className="santann-btn">
              + Novo Membro
            </button>
          </div>
        )}
      </div>

      <div className="santann-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="santann-input" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="santann-input">
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="visitante">Visitante</option>
            <option value="novico">Novico</option>
            <option value="afastado">Afastado</option>
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="santann-input">
            <option value="todos">Todos os cargos</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Carregando membros...</p>
      ) : filteredMembers.length === 0 ? (
        <div className="santann-card text-center py-8">
          <p style={{ color: 'var(--theme-text-muted)' }}>Nenhum membro encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(member => (
            <div key={member.id} onClick={() => setSelectedMember(member)} className="santann-card cursor-pointer hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
                      {member.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate" style={{ color: 'var(--theme-text)' }}>{member.full_name}</h3>
                  <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{member.role?.name || 'Sem cargo'}</p>
                  <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                    {member.status}
                  </span>
                </div>
              </div>
              {member.entry_date && (
                <p className="text-xs mt-3" style={{ color: 'var(--theme-text-muted)' }}>
                  Desde {new Date(member.entry_date).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <MemberForm
          member={selectedMember}
          editMode={editMode}
          roles={roles}
          onClose={() => { setShowForm(false); setSelectedMember(null) }}
          onSave={() => { setShowForm(false); setSelectedMember(null); loadData() }}
        />
      )}

      {selectedMember && !showForm && (
        <MemberProfile
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={() => { setEditMode(true); setShowForm(true) }}
          onUpdate={loadData}
        />
      )}

      {showRolesManager && (
        <RolesManager
          roles={roles}
          onClose={() => setShowRolesManager(false)}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}

function MemberForm({ member, editMode, roles, onClose, onSave }) {
  const { profile } = useAuth()
  const [formData, setFormData] = useState({
    full_name: member?.full_name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    birth_date: member?.birth_date || '',
    address: member?.address || '',
    emergency_contact: member?.emergency_contact || '',
    emergency_phone: member?.emergency_phone || '',
    role_id: member?.role_id || '',
    status: member?.status || 'ativo',
    entry_date: member?.entry_date || new Date().toISOString().split('T')[0],
    notes: member?.notes || ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    let photoUrl = member?.photo_url

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = Date.now() + '.' + fileExt
      const { error: uploadError } = await supabase.storage.from('app-files').upload('member-photos/' + fileName, photoFile)
      if (uploadError) { alert('Erro no upload: ' + uploadError.message); setUploading(false); return }
      const { data } = supabase.storage.from('app-files').getPublicUrl('member-photos/' + fileName)
      photoUrl = data.publicUrl
    }

    const memberData = { ...formData, role_id: formData.role_id || null, photo_url: photoUrl, created_by: profile.id }
    let error
    if (editMode && member?.id) {
      const res = await supabase.from('member_details').update(memberData).eq('id', member.id)
      error = res.error
    } else {
      const res = await supabase.from('member_details').insert([memberData])
      error = res.error
    }

    setUploading(false)
    if (!error) onSave()
    else alert('Erro: ' + error.message)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: 'var(--theme-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>{editMode ? 'Editar Membro' : 'Novo Membro'}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">x</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
              {member?.photo_url ? (
                <img src={member.photo_url} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
                  {formData.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Foto do membro</label>
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Nome completo *</label>
              <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required className="santann-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="santann-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Telefone</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="santann-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Data de nascimento</label>
              <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="santann-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Endereco</label>
            <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="santann-input" />
          </div>
          <div className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
            <h3 className="font-bold mb-3" style={{ color: 'var(--theme-text)' }}>Contato de Emergencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Nome</label>
                <input type="text" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className="santann-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Telefone</label>
                <input type="text" value={formData.emergency_phone} onChange={e => setFormData({...formData, emergency_phone: e.target.value})} className="santann-input" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Cargo</label>
              <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} className="santann-input">
                <option value="">Selecione um cargo</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="santann-input">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="visitante">Visitante</option>
                <option value="novico">Novico</option>
                <option value="afastado">Afastado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Data de entrada</label>
            <input type="date" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} className="santann-input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>Observacoes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="3" className="santann-input" />
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={uploading} className="santann-btn flex-1">{uploading ? 'Salvando...' : (editMode ? 'Atualizar' : 'Cadastrar')}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberProfile({ member, onClose, onEdit, onUpdate }) {
  const [activeTab, setActiveTab] = useState('dados')

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja remover este membro?')) {
      const { error } = await supabase.from('member_details').delete().eq('id', member.id)
      if (!error) { onUpdate(); onClose() }
      else alert('Erro: ' + error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--theme-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {member.photo_url ? (
              <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
                {member.full_name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>{member.full_name}</h2>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{member.role?.name || 'Sem cargo'}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{member.status}</span>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">x</button>
        </div>
        <div className="flex border-b" style={{ borderColor: 'var(--theme-border)' }}>
          <button onClick={() => setActiveTab('dados')} className="px-6 py-3 font-medium transition" style={{ color: activeTab === 'dados' ? 'var(--theme-primary)' : 'var(--theme-text-muted)', borderBottom: activeTab === 'dados' ? '2px solid var(--theme-primary)' : '2px solid transparent' }}>Dados</button>
          <button onClick={() => setActiveTab('obs')} className="px-6 py-3 font-medium transition" style={{ color: activeTab === 'obs' ? 'var(--theme-primary)' : 'var(--theme-text-muted)', borderBottom: activeTab === 'obs' ? '2px solid var(--theme-primary)' : '2px solid transparent' }}>Observacoes</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Email</h4>
                  <p style={{ color: 'var(--theme-text)' }}>{member.email || '-'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Telefone</h4>
                  <p style={{ color: 'var(--theme-text)' }}>{member.phone || '-'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Data de Nascimento</h4>
                  <p style={{ color: 'var(--theme-text)' }}>{member.birth_date ? new Date(member.birth_date).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Data de Entrada</h4>
                  <p style={{ color: 'var(--theme-text)' }}>{member.entry_date ? new Date(member.entry_date).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Endereco</h4>
                <p style={{ color: 'var(--theme-text)' }}>{member.address || '-'}</p>
              </div>
              <div className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
                <h4 className="font-bold mb-2" style={{ color: 'var(--theme-text)' }}>Contato de Emergencia</h4>
                <p style={{ color: 'var(--theme-text)' }}>{member.emergency_contact || '-'} {member.emergency_phone && '(' + member.emergency_phone + ')'}</p>
              </div>
            </div>
          )}
          {activeTab === 'obs' && (
            <div>
              <h4 className="font-bold mb-2" style={{ color: 'var(--theme-text)' }}>Observacoes Internas</h4>
              <p className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>{member.notes || 'Nenhuma observacao registrada.'}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-between" style={{ borderColor: 'var(--theme-border)' }}>
          <button onClick={onEdit} className="santann-btn">Editar</button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Remover Membro</button>
        </div>
      </div>
    </div>
  )
}

function RolesManager({ roles, onClose, onUpdate }) {
  const [newRole, setNewRole] = useState({ name: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ name: '', description: '' })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newRole.name.trim()) return
    const { error } = await supabase.from('member_roles').insert([newRole])
    if (!error) { setNewRole({ name: '', description: '' }); onUpdate() }
    else alert('Erro: ' + error.message)
  }

  const handleEdit = (role) => {
    setEditingId(role.id)
    setEditData({ name: role.name, description: role.description || '' })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('member_roles').update(editData).eq('id', editingId)
    if (!error) { setEditingId(null); setEditData({ name: '', description: '' }); onUpdate() }
    else alert('Erro: ' + error.message)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cargo?')) {
      const { error } = await supabase.from('member_roles').delete().eq('id', id)
      if (!error) onUpdate()
      else alert('Erro: ' + error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: 'var(--theme-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>Gerenciar Cargos</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">x</button>
        </div>
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
          <h3 className="font-bold mb-3" style={{ color: 'var(--theme-text)' }}>Adicionar Novo Cargo</h3>
          <div className="space-y-3">
            <input type="text" placeholder="Nome do cargo (ex: Tesoureiro)" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} required className="santann-input" />
            <textarea placeholder="Descricao (opcional)" value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})} rows="2" className="santann-input" />
            <button type="submit" className="santann-btn w-full">Adicionar Cargo</button>
          </div>
        </form>
        <div className="space-y-3">
          <h3 className="font-bold" style={{ color: 'var(--theme-text)' }}>Cargos Cadastrados ({roles.length})</h3>
          {roles.map(role => (
            <div key={role.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
              {editingId === role.id ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required className="santann-input" />
                  <textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} rows="2" className="santann-input" />
                  <div className="flex gap-2">
                    <button type="submit" className="santann-btn flex-1">Salvar</button>
                    <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded border" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold" style={{ color: 'var(--theme-text)' }}>{role.name}</h4>
                    {role.description && <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>{role.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(role)} className="px-3 py-1 text-sm rounded hover:opacity-80" style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}>Editar</button>
                    <button onClick={() => handleDelete(role.id)} className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600">Excluir</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}