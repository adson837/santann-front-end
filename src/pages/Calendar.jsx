import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Calendar() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [activeFilters, setActiveFilters] = useState(['FIXA', 'MOVEL', 'FESTIVA'])
  
  // Estados do Formulário de Evento
  const [newEvent, setNewEvent] = useState({
    title: '', event_date: '', start_time: '', end_time: '', all_day: false, type: 'FIXA', notes: ''
  })

  // Estados do Modal de Detalhes (Anexos)
  const [attachments, setAttachments] = useState([])
  const [showAttachForm, setShowAttachForm] = useState(false)
  const [newAttach, setNewAttach] = useState({ type: 'link', url: '', name: '' })
  const [file, setFile] = useState(null)

  const isSacerdote = profile?.app_role === 'sacerdote'
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('event_date')
    if (data) setEvents(data)
  }

  // Filtros
  const toggleFilter = (type) => {
    if (activeFilters.includes(type)) {
      setActiveFilters(activeFilters.filter(t => t !== type))
    } else {
      setActiveFilters([...activeFilters, type])
    }
  }

  const filteredEvents = events.filter(e => activeFilters.includes(e.type))

  // Gerar arquivo .ics
  const downloadICS = (event) => {
    const formatDate = (date, time) => {
      const d = new Date(`${date}T${time || '00:00:00'}`);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const start = formatDate(event.event_date, event.start_time);
    const end = event.end_time ? formatDate(event.event_date, event.end_time) : formatDate(event.event_date, '23:59:00');

    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Santann//Calendar//PT',
      'BEGIN:VEVENT', `UID:${event.id}@santann.app`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${event.title}`, `DESCRIPTION:${event.notes || ''}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Carregar anexos ao abrir evento
  const openEventDetails = async (event) => {
    setSelectedEvent(event)
    const { data } = await supabase.from('event_attachments').select('*').eq('event_id', event.id)
    setAttachments(data || [])
  }

  // Adicionar Anexo (Link ou Arquivo)
  const handleAddAttachment = async (e) => {
    e.preventDefault()
    let finalUrl = newAttach.url
    let finalName = newAttach.name || 'Arquivo'

    if (newAttach.type === 'file' && file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedEvent.id}-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('app-files').upload(`event-attachments/${fileName}`, file)
      if (error) return alert('Erro no upload: ' + error.message)
      
      const { data } = supabase.storage.from('app-files').getPublicUrl(`event-attachments/${fileName}`)
      finalUrl = data.publicUrl
      finalName = file.name
    }

    await supabase.from('event_attachments').insert([{
      event_id: selectedEvent.id, file_url: finalUrl, file_name: finalName, file_type: newAttach.type
    }])
    
    setNewAttach({ type: 'link', url: '', name: '' })
    setFile(null)
    setShowAttachForm(false)
    openEventDetails(selectedEvent) // Recarrega anexos
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    await supabase.from('events').insert([{ ...newEvent, author_id: profile.id }])
    setNewEvent({ title: '', event_date: '', start_time: '', end_time: '', all_day: false, type: 'FIXA', notes: '' })
    setShowEventForm(false)
    fetchEvents()
  }

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return filteredEvents.filter(e => e.event_date === dateStr)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Calendário Principal */}
      <div className="lg:col-span-3 santann-card">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded hover:bg-gray-100">◀</button>
            <h2 className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>{monthNames[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded hover:bg-gray-100">▶</button>
          </div>
          {isSacerdote && (
            <button onClick={() => setShowEventForm(!showEventForm)} className="santann-btn text-sm">+ Novo Evento</button>
          )}
        </div>

        {/* Filtros Visuais */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['FIXA', 'MOVEL', 'FESTIVA'].map(type => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className="px-3 py-1 text-xs rounded-full border transition font-medium"
              style={{
                backgroundColor: activeFilters.includes(type) ? 'var(--theme-primary)' : 'transparent',
                color: activeFilters.includes(type) ? '#fff' : 'var(--theme-text)',
                borderColor: 'var(--theme-primary)'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {showEventForm && isSacerdote && (
          <form onSubmit={handleCreateEvent} className="mb-6 p-4 rounded-lg space-y-3" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
            <input type="text" placeholder="Título" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required className="santann-input" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} required className="santann-input" />
              <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="santann-input">
                <option value="FIXA">Data Fixa</option><option value="MOVEL">Data Móvel</option><option value="FESTIVA">Festa</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="allDay" checked={newEvent.all_day} onChange={e => setNewEvent({...newEvent, all_day: e.target.checked})} />
              <label htmlFor="allDay" className="text-sm">Dia inteiro</label>
            </div>
            {!newEvent.all_day && (
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={newEvent.start_time} onChange={e => setNewEvent({...newEvent, start_time: e.target.value})} className="santann-input" />
                <input type="time" value={newEvent.end_time} onChange={e => setNewEvent({...newEvent, end_time: e.target.value})} className="santann-input" />
              </div>
            )}
            <button type="submit" className="santann-btn w-full">Salvar</button>
          </form>
        )}

        {/* Grid do Calendário */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => <div key={day} className="text-center text-xs font-bold py-2" style={{ color: 'var(--theme-text-muted)' }}>{day}</div>)}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="h-24"></div>)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = getEventsForDay(day)
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
            return (
              <div key={day} className={`h-24 border p-1 overflow-y-auto ${isToday ? 'bg-opacity-10' : ''}`} style={{ borderColor: 'var(--theme-border)', backgroundColor: isToday ? 'var(--theme-primary)' : 'transparent' }}>
                <div className="text-xs font-bold mb-1" style={{ color: isToday ? 'var(--theme-primary)' : 'var(--theme-text)' }}>{day}</div>
                {dayEvents.map(ev => (
                  <button key={ev.id} onClick={() => openEventDetails(ev)} className="block w-full text-left text-[10px] text-white rounded px-1 py-0.5 mb-1 truncate hover:opacity-80" style={{ backgroundColor: 'var(--theme-primary)' }}>
                    {ev.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Lista Lateral de Eventos do Mês */}
      <div className="santann-card h-fit">
        <h3 className="font-bold mb-4" style={{ color: 'var(--theme-primary)' }}>Próximos Eventos</h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredEvents
            .filter(e => new Date(e.event_date).getMonth() === month && new Date(e.event_date).getFullYear() === year)
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
            .map(ev => (
              <button key={ev.id} onClick={() => openEventDetails(ev)} className="w-full text-left p-3 rounded-lg transition hover:opacity-80" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
                <div className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>{ev.title}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{new Date(ev.event_date).toLocaleDateString('pt-BR')}</div>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{ev.type}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--theme-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>{selectedEvent.title}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                  {new Date(selectedEvent.event_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {!selectedEvent.all_day && selectedEvent.start_time && ` às ${selectedEvent.start_time}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadICS(selectedEvent)} className="p-2 rounded hover:bg-gray-100" title="Baixar para Google/Outlook">📅</button>
                <button onClick={() => setSelectedEvent(null)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>

            {selectedEvent.notes && <p className="mb-6 p-3 rounded italic" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>"{selectedEvent.notes}"</p>}

            {/* Seção de Anexos */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold" style={{ color: 'var(--theme-text)' }}> Anexos e Materiais</h3>
                {isSacerdote && <button onClick={() => setShowAttachForm(!showAttachForm)} className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>+ Adicionar</button>}
              </div>

              {showAttachForm && isSacerdote && (
                <form onSubmit={handleAddAttachment} className="mb-4 p-3 rounded space-y-2" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <select value={newAttach.type} onChange={e => setNewAttach({...newAttach, type: e.target.value})} className="santann-input">
                    <option value="link">Link Externo</option>
                    <option value="file">Arquivo (PDF/Imagem)</option>
                  </select>
                  {newAttach.type === 'link' ? (
                    <input type="url" placeholder="https://..." value={newAttach.url} onChange={e => setNewAttach({...newAttach, url: e.target.value})} required className="santann-input" />
                  ) : (
                    <input type="file" onChange={e => setFile(e.target.files[0])} required className="santann-input" />
                  )}
                  <input type="text" placeholder="Nome do anexo" value={newAttach.name} onChange={e => setNewAttach({...newAttach, name: e.target.value})} className="santann-input" />
                  <button type="submit" className="santann-btn w-full text-sm">Salvar Anexo</button>
                </form>
              )}

              <div className="space-y-2">
                {attachments.length === 0 ? <p className="text-sm text-center py-2" style={{ color: 'var(--theme-text-muted)' }}>Nenhum anexo.</p> : 
                  attachments.map(att => (
                    <div key={att.id} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--theme-bg)' }}>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: 'var(--theme-primary)' }}>
                        {att.file_type === 'link' ? ' ' : '📄 '}{att.file_name}
                      </a>
                      {isSacerdote && <button onClick={async () => { await supabase.from('event_attachments').delete().eq('id', att.id); openEventDetails(selectedEvent); }} className="text-red-500 text-xs">×</button>}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}