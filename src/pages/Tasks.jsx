import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

// ==================== COMPONENTE: ITEM DA ESCALA ====================
function CleaningItem({ item, profile, isSacerdote, onDelete, onUpdate }) {
  const [activeLog, setActiveLog] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Verifica se já existe um log em andamento para este item
    const checkActiveLog = async () => {
      const { data } = await supabase
        .from('cleaning_logs')
        .select('*')
        .eq('schedule_id', item.id)
        .eq('status', 'em_andamento')
        .eq('user_id', profile.id)
        .single()
      if (data) setActiveLog(data)
    }
    checkActiveLog()
  }, [item.id, profile.id])

  const handleCheckIn = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cleaning_logs')
      .insert([{
        schedule_id: item.id,
        user_id: profile.id,
        check_in_time: new Date().toISOString(),
        status: 'em_andamento'
      }])
      .select()
      .single()
    
    if (!error) {
      setActiveLog(data)
    } else {
      alert('Erro ao iniciar limpeza: ' + error.message)
    }
    setLoading(false)
  }

  const handleCheckOut = async () => {
    if (!activeLog) return
    setLoading(true)
    
    const { error } = await supabase
      .from('cleaning_logs')
      .update({ 
        check_out_time: new Date().toISOString(),
        status: 'concluido'
      })
      .eq('id', activeLog.id)
    
    if (!error) {
      setActiveLog(null)
      onUpdate() // Recarrega a escala
    } else {
      alert('Erro ao concluir: ' + error.message)
    }
    setLoading(false)
  }

  const handleApprove = async () => {
    if (!activeLog) return
    const { error } = await supabase
      .from('cleaning_logs')
      .update({ 
        priest_approval: true,
        approved_by: profile.id
      })
      .eq('id', activeLog.id)
    
    if (!error) {
      setActiveLog({ ...activeLog, priest_approval: true })
      onUpdate()
    }
  }

  // Calcula tempo decorrido
  const getElapsedTime = () => {
    if (!activeLog?.check_in_time) return ''
    const start = new Date(activeLog.check_in_time)
    const now = new Date()
    const diff = Math.floor((now - start) / 60000) // minutos
    if (diff < 1) return 'Agora mesmo'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff/60)}h ${diff%60}min`
  }

  const isResponsible = item.responsible_id === profile.id
  const canAct = isResponsible || isSacerdote

  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="font-medium text-sm" style={{ color: 'var(--theme-text)' }}>{item.area}</div>
          {item.responsible && (
            <div className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              👤 {item.responsible.full_name}
            </div>
          )}
        </div>
        {isSacerdote && (
          <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs">×</button>
        )}
      </div>

      {/* Status do Log Ativo */}
      {activeLog && (
        <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: activeLog.status === 'concluido' ? '#dcfce7' : '#dbeafe' }}>
          <div className="flex justify-between items-center">
            <span className="font-bold" style={{ color: activeLog.status === 'concluido' ? '#166534' : '#1e40af' }}>
              {activeLog.status === 'concluido' ? '✅ Concluído' : '🧹 Em andamento...'}
            </span>
            {activeLog.status === 'em_andamento' && (
              <span className="font-mono">{getElapsedTime()}</span>
            )}
          </div>
          {activeLog.priest_approval && (
            <div className="mt-1 text-xs font-bold text-green-700">✓ Aprovado pelo Sacerdote</div>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      {canAct && (
        <div className="flex gap-2 mt-2">
          {!activeLog && (
            <button 
              onClick={handleCheckIn}
              disabled={loading}
              className="flex-1 py-1.5 text-xs rounded font-medium text-white"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              {loading ? '...' : '▶ Iniciar Limpeza'}
            </button>
          )}
          {activeLog && activeLog.status === 'em_andamento' && (
            <button 
              onClick={handleCheckOut}
              disabled={loading}
              className="flex-1 py-1.5 text-xs rounded font-medium text-white"
              style={{ backgroundColor: '#10b981' }}
            >
              {loading ? '...' : '✓ Concluir'}
            </button>
          )}
          {activeLog && activeLog.status === 'concluido' && !activeLog.priest_approval && isSacerdote && (
            <button 
              onClick={handleApprove}
              className="flex-1 py-1.5 text-xs rounded font-medium text-white"
              style={{ backgroundColor: '#8b5cf6' }}
            >
              ✓ Aprovar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== COMPONENTE: HISTÓRICO ====================
function CleaningHistory({ isSacerdote, profile }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cleaning_logs')
      .select(`
        *,
        schedule:cleaning_schedule(area, day_of_week),
        user:user_id(full_name),
        approver:approved_by(full_name)
      `)
      .order('check_in_time', { ascending: false })
      .limit(20)
    
    if (data) setLogs(data)
    setLoading(false)
  }

  const formatDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-'
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = Math.floor((end - start) / 60000)
    if (diff < 1) return '< 1 min'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff/60)}h ${diff%60}min`
  }

  if (loading) return <p className="text-center text-sm py-4" style={{ color: 'var(--theme-text-muted)' }}>Carregando histórico...</p>
  if (logs.length === 0) return <p className="text-center text-sm py-4" style={{ color: 'var(--theme-text-muted)' }}>Nenhuma limpeza registrada ainda.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
            <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Área</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Responsável</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Início</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Duração</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Status</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Aprovação</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <td className="py-2 px-3 font-medium" style={{ color: 'var(--theme-text)' }}>{log.schedule?.area || '-'}</td>
              <td className="py-2 px-3" style={{ color: 'var(--theme-text)' }}>{log.user?.full_name || '-'}</td>
              <td className="py-2 px-3 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {new Date(log.check_in_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="py-2 px-3" style={{ color: 'var(--theme-text)' }}>{formatDuration(log.check_in_time, log.check_out_time)}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  log.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {log.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                </span>
              </td>
              <td className="py-2 px-3">
                {log.priest_approval ? (
                  <span className="text-xs text-green-600 font-bold">✓ {log.approver?.full_name}</span>
                ) : (
                  <span className="text-xs text-gray-400">Pendente</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Tasks() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('tarefas')
  const [loading, setLoading] = useState(true)

  // Estados das Tarefas
  const [tasks, setTasks] = useState([])
  const [filterPerson, setFilterPerson] = useState('todos')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '', description: '', due_date: '', priority: 'media', recurrence: 'nenhuma'
  })

  // Estados do Modal Expandido
  const [modalTab, setModalTab] = useState('detalhes')
  const [subtasks, setSubtasks] = useState([])
  const [newSubtask, setNewSubtask] = useState('')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const commentsEndRef = useRef(null)

  // Estados da Limpeza
  const [cleaning, setCleaning] = useState([])
  const [people, setPeople] = useState([])
  const [showCleaningForm, setShowCleaningForm] = useState(false)
  const [newCleaning, setNewCleaning] = useState({ area: '', day_of_week: 0, responsible_id: '' })
  const [autoRotate, setAutoRotate] = useState(false)

  const isSacerdote = profile?.app_role === 'sacerdote'

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([fetchTasks(), fetchCleaning(), fetchPeople()])
    setLoading(false)
  }

  // ================= TAREFAS =================
  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select(`*, responsible:responsible_id(full_name)`)
      .order('due_date', { ascending: true })
    if (data) setTasks(data)
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('tasks').insert([{
      ...newTask,
      status: 'pendente',
      responsible_id: profile.id,
      author_id: profile.id
    }])
    if (!error) {
      setNewTask({ title: '', description: '', due_date: '', priority: 'media', recurrence: 'nenhuma' })
      setShowTaskForm(false)
      fetchTasks()
    } else {
      alert('Erro ao criar tarefa: ' + error.message)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (!error) fetchTasks()
  }

  const handleDeleteTask = async (id) => {
    if (window.confirm('Apagar tarefa?')) {
      await supabase.from('tasks').delete().eq('id', id)
      fetchTasks()
      setSelectedTask(null)
    }
  }

  const onDragEnd = async (result) => {
    const { destination, draggableId } = result
    if (!destination) return
    if (destination.droppableId === result.source.droppableId) return

    const { error } = await supabase.from('tasks').update({ status: destination.droppableId }).eq('id', draggableId)
    if (!error) {
      setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: destination.droppableId } : t))
    }
  }

  const filteredTasks = filterPerson === 'todos' ? tasks : tasks.filter(t => t.responsible_id === filterPerson)

  const columns = [
    { id: 'pendente', title: 'Pendente', bg: '#f3f4f6' },
    { id: 'em_andamento', title: 'Em Andamento', bg: '#dbeafe' },
    { id: 'concluida', title: 'Concluída', bg: '#dcfce7' }
  ]

  const priorityColors = {
    baixa: 'bg-green-100 text-green-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-red-100 text-red-800'
  }

  // ================= SUBTAREFAS =================
  const fetchSubtasks = async (taskId) => {
    const { data } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at')
    setSubtasks(data || [])
  }

  const addSubtask = async (e) => {
    e.preventDefault()
    if (!newSubtask.trim()) return
    
    const { error } = await supabase.from('task_subtasks').insert([{
      task_id: selectedTask.id,
      title: newSubtask
    }])
    
    if (!error) {
      setNewSubtask('')
      fetchSubtasks(selectedTask.id)
    }
  }

  const toggleSubtask = async (subtaskId, isCompleted) => {
    await supabase.from('task_subtasks').update({ is_completed: isCompleted }).eq('id', subtaskId)
    fetchSubtasks(selectedTask.id)
  }

  const deleteSubtask = async (subtaskId) => {
    await supabase.from('task_subtasks').delete().eq('id', subtaskId)
    fetchSubtasks(selectedTask.id)
  }

  // ================= COMENTÁRIOS =================
  const fetchComments = async (taskId) => {
    const { data } = await supabase
      .from('task_comments')
      .select(`*, author:author_id(full_name)`)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  const addComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    const { error } = await supabase.from('task_comments').insert([{
      task_id: selectedTask.id,
      author_id: profile.id,
      content: newComment
    }])
    
    if (!error) {
      setNewComment('')
      fetchComments(selectedTask.id)
    }
  }

  const deleteComment = async (commentId) => {
    await supabase.from('task_comments').delete().eq('id', commentId)
    fetchComments(selectedTask.id)
  }

  // ================= FOTOS =================
  const fetchPhotos = async (taskId) => {
    const { data } = await supabase
      .from('task_photos')
      .select(`*, uploader:uploaded_by(full_name)`)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setPhotos(data || [])
  }

  const uploadPhoto = async (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${selectedTask.id}-${Date.now()}-${type}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('app-files')
      .upload(`task-photos/${fileName}`, file)
    
    if (uploadError) {
      alert('Erro no upload: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('app-files').getPublicUrl(`task-photos/${fileName}`)
    
    await supabase.from('task_photos').insert([{
      task_id: selectedTask.id,
      photo_url: data.publicUrl,
      photo_type: type,
      uploaded_by: profile.id
    }])

    setUploading(false)
    fetchPhotos(selectedTask.id)
  }

  // ================= LIMPEZA =================
  const fetchCleaning = async () => {
    const { data } = await supabase
      .from('cleaning_schedule')
      .select(`*, responsible:responsible_id(full_name)`)
      .order('day_of_week')
    if (data) setCleaning(data)
  }

  const fetchPeople = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'ativo')
    if (data) setPeople(data)
  }

  const handleCreateCleaning = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('cleaning_schedule').insert([{
      ...newCleaning,
      responsible_id: newCleaning.responsible_id || null
    }])
    if (!error) {
      setNewCleaning({ area: '', day_of_week: 0, responsible_id: '' })
      setShowCleaningForm(false)
      fetchCleaning()
    }
  }

  const handleDeleteCleaning = async (id) => {
    if (window.confirm('Apagar?')) {
      await supabase.from('cleaning_schedule').delete().eq('id', id)
      fetchCleaning()
    }
  }

  const handleAutoRotate = async () => {
    const areas = [...new Set(cleaning.map(c => c.area))]
    for (const area of areas) {
      const areaItems = cleaning.filter(c => c.area === area).sort((a, b) => a.day_of_week - b.day_of_week)
      if (areaItems.length > 0 && people.length > 0) {
        const currentRespId = areaItems[0].responsible_id
        const currentIndex = people.findIndex(p => p.id === currentRespId)
        const nextPerson = people[(currentIndex + 1) % people.length]
        for (const item of areaItems) {
          await supabase.from('cleaning_schedule').update({ responsible_id: nextPerson.id }).eq('id', item.id)
        }
      }
    }
    fetchCleaning()
  }

  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  // Abrir modal com dados completos
  const openTaskModal = async (task) => {
    setSelectedTask(task)
    setModalTab('detalhes')
    await Promise.all([
      fetchSubtasks(task.id),
      fetchComments(task.id),
      fetchPhotos(task.id)
    ])
  }

  // ================= RENDER =================
  if (loading) return <p className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Carregando...</p>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--theme-primary)' }}>
        📋 Tarefas & Limpeza
      </h1>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        {[
          { id: 'tarefas', label: 'Kanban de Tarefas', icon: '📋' },
          { id: 'limpeza', label: 'Escala de Limpeza', icon: '🧹' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 font-medium transition flex items-center gap-2"
            style={{
              color: activeTab === tab.id ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--theme-primary)' : '2px solid transparent'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= ABA TAREFAS ================= */}
      {activeTab === 'tarefas' && (
        <>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                👤 Filtrar por pessoa:
              </label>
              <select 
                value={filterPerson} 
                onChange={e => setFilterPerson(e.target.value)}
                className="santann-input w-auto"
              >
                <option value="todos">Todas as pessoas</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            {isSacerdote && (
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="santann-btn">
                {showTaskForm ? 'Cancelar' : '+ Nova Tarefa'}
              </button>
            )}
          </div>

          {/* Formulário de Criação */}
          {showTaskForm && isSacerdote && (
            <div className="santann-card mb-6">
              <h3 className="santann-card-title text-lg mb-4">Nova Tarefa</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Título da tarefa"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  required
                  className="santann-input"
                />
                <textarea 
                  placeholder="Descrição (opcional)"
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  rows="2"
                  className="santann-input"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    type="date" 
                    value={newTask.due_date}
                    onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                    required
                    className="santann-input"
                  />
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value})}
                    className="santann-input"
                  >
                    <option value="baixa">Prioridade Baixa</option>
                    <option value="media">Prioridade Média</option>
                    <option value="alta">Prioridade Alta</option>
                  </select>
                  <select 
                    value={newTask.recurrence}
                    onChange={e => setNewTask({...newTask, recurrence: e.target.value})}
                    className="santann-input"
                  >
                    <option value="nenhuma">Sem recorrência</option>
                    <option value="diaria">Diária</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
                <button type="submit" className="santann-btn">Criar Tarefa</button>
              </form>
            </div>
          )}

          {/* Kanban Board */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map(col => (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided) => (
                    <div 
                      className="rounded-lg p-4 min-h-[400px]"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ backgroundColor: col.bg }}
                    >
                      <h3 className="font-bold text-center mb-4 text-gray-700">
                        {col.title} ({filteredTasks.filter(t => t.status === col.id).length})
                      </h3>
                      
                      {filteredTasks
                        .filter(t => t.status === col.id)
                        .map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openTaskModal(task)}
                                className="bg-white p-3 rounded-lg shadow-sm mb-2 cursor-pointer hover:shadow-md transition"
                                style={{ borderLeft: `4px solid var(--theme-primary)` }}
                              >
                                <div className="font-medium text-sm mb-1" style={{ color: 'var(--theme-text)' }}>
                                  {task.title}
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                  <span>📅 {new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                                  <span className={`px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                {task.responsible && (
                                  <div className="text-xs text-gray-500">
                                    👤 {task.responsible.full_name}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </>
      )}

      {/* ================= ABA LIMPEZA ================= */}
            {/* ================= ABA LIMPEZA ================= */}
      {activeTab === 'limpeza' && (
        <>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h2 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
              Escala de Limpeza Semanal
            </h2>
            <div className="flex gap-2">
              {isSacerdote && autoRotate && (
                <button onClick={handleAutoRotate} className="px-4 py-2 text-white rounded text-sm" style={{ backgroundColor: '#9333ea' }}>
                  🔄 Rodízio Automático
                </button>
              )}
              {isSacerdote && (
                <button onClick={() => setShowCleaningForm(!showCleaningForm)} className="santann-btn text-sm">
                  {showCleaningForm ? 'Cancelar' : '+ Adicionar'}
                </button>
              )}
            </div>
          </div>

          {isSacerdote && (
            <label className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} />
              Ativar opção de rodízio automático
            </label>
          )}

          {showCleaningForm && isSacerdote && (
            <div className="santann-card mb-6">
              <h3 className="santann-card-title text-lg mb-4">Novo Item de Limpeza</h3>
              <form onSubmit={handleCreateCleaning} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Área (ex: Sala principal, Cozinha)"
                  value={newCleaning.area}
                  onChange={e => setNewCleaning({...newCleaning, area: e.target.value})}
                  required
                  className="santann-input"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select 
                    value={newCleaning.day_of_week}
                    onChange={e => setNewCleaning({...newCleaning, day_of_week: parseInt(e.target.value)})}
                    className="santann-input"
                  >
                    {weekDays.map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                  <select 
                    value={newCleaning.responsible_id}
                    onChange={e => setNewCleaning({...newCleaning, responsible_id: e.target.value})}
                    className="santann-input"
                  >
                    <option value="">Responsável (opcional)</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <button type="submit" className="santann-btn">Salvar</button>
              </form>
            </div>
          )}

          {/* Grid da Escala Semanal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {weekDays.map((day, dayIndex) => {
              const dayItems = cleaning.filter(c => c.day_of_week === dayIndex)
              const today = new Date().getDay()
              const isToday = dayIndex === today
              
              return (
                <div 
                  key={dayIndex} 
                  className="santann-card"
                  style={{ 
                    border: isToday ? '2px solid var(--theme-primary)' : 'var(--theme-card-border)'
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold" style={{ color: 'var(--theme-primary)' }}>
                      {day} {isToday && <span className="text-xs ml-2 px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>HOJE</span>}
                    </h3>
                  </div>
                  
                  {dayItems.length === 0 ? (
                    <p className="text-sm italic" style={{ color: 'var(--theme-text-muted)' }}>Sem escala definida</p>
                  ) : (
                    <div className="space-y-3">
                      {dayItems.map(item => (
                        <CleaningItem 
                          key={item.id} 
                          item={item} 
                          profile={profile} 
                          isSacerdote={isSacerdote}
                          onDelete={handleDeleteCleaning}
                          onUpdate={fetchCleaning}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Histórico de Limpeza */}
          <div className="santann-card">
            <h3 className="font-bold mb-4 text-lg" style={{ color: 'var(--theme-text)' }}>
              📜 Histórico de Limpeza
            </h3>
            <CleaningHistory isSacerdote={isSacerdote} profile={profile} />
          </div>
        </>
      )}

      {/* ================= MODAL EXPANDIDO DA TAREFA ================= */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--theme-surface)' }}
          >
            {/* Header do Modal */}
            <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: 'var(--theme-border)' }}>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
                  {selectedTask.title}
                </h2>
                <div className="flex gap-3 text-sm flex-wrap">
                  <span style={{ color: 'var(--theme-text-muted)' }}>📅 {new Date(selectedTask.due_date).toLocaleDateString('pt-BR')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[selectedTask.priority]}`}>
                    {selectedTask.priority}
                  </span>
                  <span style={{ color: 'var(--theme-text-muted)' }}>👤 {selectedTask.responsible?.full_name || 'Não atribuído'}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
            </div>

            {/* Abas do Modal */}
            <div className="flex border-b" style={{ borderColor: 'var(--theme-border)' }}>
              {[
                { id: 'detalhes', label: 'Detalhes', icon: '📝' },
                { id: 'checklist', label: 'Checklist', icon: '✓' },
                { id: 'chat', label: 'Chat', icon: '💬' },
                { id: 'fotos', label: 'Fotos', icon: '📷' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  className="px-6 py-3 font-medium transition flex items-center gap-2"
                  style={{
                    color: modalTab === tab.id ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                    borderBottom: modalTab === tab.id ? '2px solid var(--theme-primary)' : '2px solid transparent',
                    backgroundColor: modalTab === tab.id ? 'var(--theme-bg)' : 'transparent'
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* ABA: DETALHES */}
              {modalTab === 'detalhes' && (
                <div className="space-y-4">
                  {selectedTask.description && (
                    <div>
                      <h3 className="font-bold mb-2" style={{ color: 'var(--theme-text)' }}>Descrição</h3>
                      <p className="p-3 rounded" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>
                        {selectedTask.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Status</h4>
                      <p className="font-medium" style={{ color: 'var(--theme-text)' }}>
                        {selectedTask.status === 'pendente' ? 'Pendente' : 
                         selectedTask.status === 'em_andamento' ? 'Em Andamento' : 'Concluída'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-text-muted)' }}>Recorrência</h4>
                      <p className="font-medium" style={{ color: 'var(--theme-text)' }}>{selectedTask.recurrence}</p>
                    </div>
                  </div>

                  {isSacerdote && selectedTask.status !== 'concluida' && (
                    <div className="flex gap-2 pt-4">
                      {selectedTask.status === 'pendente' && (
                        <button onClick={() => handleStatusChange(selectedTask.id, 'em_andamento')} className="santann-btn flex-1">
                          Iniciar Tarefa
                        </button>
                      )}
                      {selectedTask.status === 'em_andamento' && (
                        <button onClick={() => handleStatusChange(selectedTask.id, 'concluida')} className="santann-btn flex-1" style={{ backgroundColor: '#10b981' }}>
                          Concluir Tarefa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA: CHECKLIST */}
              {modalTab === 'checklist' && (
                <div>
                  <h3 className="font-bold mb-4" style={{ color: 'var(--theme-text)' }}>Subtarefas</h3>
                  
                  {isSacerdote && (
                    <form onSubmit={addSubtask} className="mb-4 flex gap-2">
                      <input
                        type="text"
                        placeholder="Adicionar subtarefa..."
                        value={newSubtask}
                        onChange={e => setNewSubtask(e.target.value)}
                        className="santann-input flex-1"
                      />
                      <button type="submit" className="santann-btn">Adicionar</button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {subtasks.length === 0 ? (
                      <p className="text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>Nenhuma subtarefa adicionada.</p>
                    ) : (
                      subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: 'var(--theme-bg)' }}>
                          <input
                            type="checkbox"
                            checked={sub.is_completed}
                            onChange={() => toggleSubtask(sub.id, !sub.is_completed)}
                            className="w-5 h-5 rounded"
                          />
                          <span className={`flex-1 ${sub.is_completed ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--theme-text)' }}>
                            {sub.title}
                          </span>
                          {isSacerdote && (
                            <button onClick={() => deleteSubtask(sub.id)} className="text-red-500 hover:text-red-700 text-sm">×</button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ABA: CHAT */}
              {modalTab === 'chat' && (
                <div className="flex flex-col h-[400px]">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Nenhum comentário ainda.</p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--theme-primary)' }}>
                            {comment.author?.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>{comment.author?.full_name || 'Usuário'}</span>
                              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                                {new Date(comment.created_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm mt-1 p-2 rounded" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>
                              {comment.content}
                            </p>
                          </div>
                          {(isSacerdote || comment.author_id === profile.id) && (
                            <button onClick={() => deleteComment(comment.id)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  <form onSubmit={addComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escreva um comentário..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="santann-input flex-1"
                    />
                    <button type="submit" className="santann-btn">Enviar</button>
                  </form>
                </div>
              )}

              {/* ABA: FOTOS */}
              {modalTab === 'fotos' && (
                <div>
                  <h3 className="font-bold mb-4" style={{ color: 'var(--theme-text)' }}>Fotos de Acompanhamento</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded border-2 border-dashed" style={{ borderColor: 'var(--theme-border)' }}>
                      <h4 className="font-bold mb-2 text-sm" style={{ color: 'var(--theme-text)' }}>📸 Antes</h4>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => uploadPhoto(e, 'before')}
                        disabled={uploading}
                        className="text-sm"
                      />
                    </div>
                    <div className="p-4 rounded border-2 border-dashed" style={{ borderColor: 'var(--theme-border)' }}>
                      <h4 className="font-bold mb-2 text-sm" style={{ color: 'var(--theme-text)' }}>✅ Depois</h4>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => uploadPhoto(e, 'after')}
                        disabled={uploading}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {uploading && <p className="text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>Enviando foto...</p>}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative group">
                        <img src={photo.photo_url} alt={photo.photo_type} className="w-full h-32 object-cover rounded-lg" />
                        <div className="absolute top-2 left-2 px-2 py-1 text-xs rounded text-white" style={{ backgroundColor: photo.photo_type === 'before' ? '#f59e0b' : '#10b981' }}>
                          {photo.photo_type === 'before' ? 'Antes' : 'Depois'}
                        </div>
                        {photo.uploader && (
                          <div className="absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                            {photo.uploader.full_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            {isSacerdote && (
              <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--theme-border)' }}>
                <button onClick={() => handleDeleteTask(selectedTask.id)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                  Apagar Tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}