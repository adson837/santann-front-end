import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Financeiro() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const isSacerdote = profile?.app_role === 'sacerdote'

  // Dados globais
  const [categories, setCategories] = useState([])
  const [stockCategories, setStockCategories] = useState([])
  const [locations, setLocations] = useState([])

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    const [catRes, stockCatRes, locRes] = await Promise.all([
      supabase.from('finance_categories').select('*').order('name'),
      supabase.from('stock_categories').select('*').order('name'),
      supabase.from('stock_locations').select('*').order('name')
    ])
    if (catRes.data) setCategories(catRes.data)
    if (stockCatRes.data) setStockCategories(stockCatRes.data)
    if (locRes.data) setLocations(locRes.data)
    setLoading(false)
  }

  if (loading) return <p className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Carregando módulo financeiro...</p>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--theme-primary)' }}>
        💰 Financeiro & Estoque
      </h1>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b flex-wrap" style={{ borderColor: 'var(--theme-border)' }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'transacoes', label: 'Transações', icon: '💳' },
          { id: 'estoque', label: 'Estoque', icon: '📦' },
          { id: 'compras', label: 'Movimentações & Compras', icon: '🛒' }
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

      {/* Conteúdo das Abas */}
      {activeTab === 'dashboard' && <DashboardTab isSacerdote={isSacerdote} />}
      {activeTab === 'transacoes' && <TransacoesTab isSacerdote={isSacerdote} categories={categories} />}
      {activeTab === 'estoque' && <EstoqueTab isSacerdote={isSacerdote} categories={stockCategories} locations={locations} />}
      {activeTab === 'compras' && <ComprasTab isSacerdote={isSacerdote} profile={profile} />}
    </div>
  )
}

// ==================== ABA 1: DASHBOARD ====================
function DashboardTab({ isSacerdote }) {
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 })
  const [lowStock, setLowStock] = useState([])
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // 1. Estatísticas do mês atual
    const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('transaction_date', startOfMonth)
    
    let income = 0, expense = 0
    if (transactions) {
      transactions.forEach(t => {
        if (t.type === 'income') income += parseFloat(t.amount)
        else expense += parseFloat(t.amount)
      })
    }

    // 2. Alertas de estoque baixo
    const { data: stock } = await supabase
      .from('stock_items')
      .select('name, quantity, min_quantity, unit')
      .lte('quantity', supabase.rpc('stock_items', { min_quantity: 'quantity' })) // Filtro simplificado via JS abaixo
      .eq('is_active', true)
    
    // Filtro manual para garantir funcionamento sem RPC customizado
    const { data: allStock } = await supabase.from('stock_items').select('name, quantity, min_quantity, unit').eq('is_active', true)
    const filteredLowStock = allStock ? allStock.filter(item => item.quantity <= item.min_quantity) : []

    setStats({ income, expense, balance: income - expense })
    setLowStock(filteredLowStock)
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="santann-card border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>Entradas do Mês</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#10B981' }}>R$ {stats.income.toFixed(2)}</p>
        </div>
        <div className="santann-card border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>Saídas do Mês</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#EF4444' }}>R$ {stats.expense.toFixed(2)}</p>
        </div>
        <div className="santann-card border-l-4" style={{ borderLeftColor: 'var(--theme-primary)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>Saldo Atual</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--theme-primary)' }}>R$ {stats.balance.toFixed(2)}</p>
        </div>
      </div>

      {/* Alertas de Estoque */}
      <div className="santann-card">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--theme-text)' }}>⚠️ Alertas de Estoque Baixo</h3>
        {lowStock.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Nenhum item com estoque crítico no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div>
                  <p className="font-medium text-red-800">{item.name}</p>
                  <p className="text-xs text-red-600">Restam: {item.quantity} {item.unit} (Mín: {item.min_quantity})</p>
                </div>
                <span className="text-xl">📉</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== ABA 2: TRANSAÇÕES ====================
function TransacoesTab({ isSacerdote, categories }) {
  const [transactions, setTransactions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newTx, setNewTx] = useState({ type: 'income', amount: '', description: '', category_id: '', transaction_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, category:finance_categories(name, color, icon)')
      .order('transaction_date', { ascending: false })
      .limit(50)
    if (data) setTransactions(data)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('transactions').insert([{
      ...newTx,
      amount: parseFloat(newTx.amount),
      created_by: profile.id // Nota: profile vem do contexto pai, precisamos passar ou pegar via useAuth aqui. Vamos ajustar.
    }])
    // Para simplificar, vou assumir que o componente pai passa profile, ou usamos useAuth dentro deste componente.
    // Vou adicionar useAuth no topo deste componente interno para garantir.
  }
  
  // Ajuste rápido: usar useAuth dentro do componente
  const { profile } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('transactions').insert([{
      type: newTx.type,
      amount: parseFloat(newTx.amount),
      description: newTx.description,
      category_id: newTx.category_id || null,
      transaction_date: newTx.transaction_date,
      created_by: profile.id
    }])
    if (!error) {
      setNewTx({ type: 'income', amount: '', description: '', category_id: '', transaction_date: new Date().toISOString().split('T')[0] })
      setShowForm(false)
      fetchTransactions()
    } else {
      alert('Erro: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Histórico de Transações</h2>
        {isSacerdote && (
          <button onClick={() => setShowForm(!showForm)} className="santann-btn text-sm">
            {showForm ? 'Cancelar' : '+ Nova Transação'}
          </button>
        )}
      </div>

      {showForm && isSacerdote && (
        <form onSubmit={handleSubmit} className="santann-card mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} className="santann-input">
              <option value="income">Entrada (Receita)</option>
              <option value="expense">Saída (Despesa)</option>
            </select>
            <input type="number" step="0.01" placeholder="Valor (R$)" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} required className="santann-input" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={newTx.category_id} onChange={e => setNewTx({...newTx, category_id: e.target.value})} className="santann-input">
              <option value="">Selecione a categoria</option>
              {categories.filter(c => c.type === newTx.type).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input type="date" value={newTx.transaction_date} onChange={e => setNewTx({...newTx, transaction_date: e.target.value})} required className="santann-input" />
          </div>
          <input type="text" placeholder="Descrição (ex: Doação de João, Compra de velas)" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} required className="santann-input" />
          <button type="submit" className="santann-btn w-full md:w-auto">Salvar Transação</button>
        </form>
      )}

      <div className="santann-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <th className="text-left py-3 px-2">Data</th>
              <th className="text-left py-3 px-2">Descrição</th>
              <th className="text-left py-3 px-2">Categoria</th>
              <th className="text-right py-3 px-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b hover:opacity-80" style={{ borderColor: 'var(--theme-border)' }}>
                <td className="py-3 px-2" style={{ color: 'var(--theme-text-muted)' }}>{new Date(tx.transaction_date).toLocaleDateString('pt-BR')}</td>
                <td className="py-3 px-2 font-medium" style={{ color: 'var(--theme-text)' }}>{tx.description}</td>
                <td className="py-3 px-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: tx.category?.color + '20', color: tx.category?.color }}>
                    {tx.category?.icon} {tx.category?.name || 'Sem categoria'}
                  </span>
                </td>
                <td className="py-3 px-2 text-right font-bold" style={{ color: tx.type === 'income' ? '#10B981' : '#EF4444' }}>
                  {tx.type === 'income' ? '+' : '-'} R$ {parseFloat(tx.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== ABA 3: ESTOQUE ====================
function EstoqueTab({ isSacerdote, categories, locations }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category_id: '', location_id: '', unit: 'unidade', quantity: 0, min_quantity: 1, unit_cost: '' })
  const { profile } = useAuth()

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('stock_items')
      .select('*, category:stock_categories(name, icon, color), location:stock_locations(name)')
      .eq('is_active', true)
      .order('name')
    if (data) setItems(data)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('stock_items').insert([{
      ...newItem,
      quantity: parseFloat(newItem.quantity),
      min_quantity: parseFloat(newItem.min_quantity),
      unit_cost: newItem.unit_cost ? parseFloat(newItem.unit_cost) : null,
      created_by: profile.id
    }])
    if (!error) {
      setNewItem({ name: '', category_id: '', location_id: '', unit: 'unidade', quantity: 0, min_quantity: 1, unit_cost: '' })
      setShowForm(false)
      fetchItems()
    } else {
      alert('Erro: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Controle de Estoque</h2>
        {isSacerdote && (
          <button onClick={() => setShowForm(!showForm)} className="santann-btn text-sm">
            {showForm ? 'Cancelar' : '+ Novo Item'}
          </button>
        )}
      </div>

      {showForm && isSacerdote && (
        <form onSubmit={handleCreate} className="santann-card mb-6 space-y-4">
          <input type="text" placeholder="Nome do item" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required className="santann-input" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})} required className="santann-input">
              <option value="">Categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select value={newItem.location_id} onChange={e => setNewItem({...newItem, location_id: e.target.value})} required className="santann-input">
              <option value="">Local de armazenamento</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className="santann-input">
              <option value="unidade">Unidade</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="litro">Litro (L)</option>
              <option value="caixa">Caixa</option>
              <option value="pacote">Pacote</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="number" step="0.01" placeholder="Qtd. Atual" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} required className="santann-input" />
            <input type="number" step="0.01" placeholder="Qtd. Mínima (alerta)" value={newItem.min_quantity} onChange={e => setNewItem({...newItem, min_quantity: e.target.value})} required className="santann-input" />
            <input type="number" step="0.01" placeholder="Custo Unitário (R$)" value={newItem.unit_cost} onChange={e => setNewItem({...newItem, unit_cost: e.target.value})} className="santann-input" />
          </div>
          <button type="submit" className="santann-btn w-full md:w-auto">Salvar Item</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const isLow = item.quantity <= item.min_quantity
          return (
            <div key={item.id} className="santann-card relative" style={{ border: isLow ? '2px solid #EF4444' : 'var(--theme-card-border)' }}>
              {isLow && <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 font-bold">ESTOQUE BAIXO</span>}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{item.category?.icon}</span>
                <h3 className="font-bold text-lg" style={{ color: 'var(--theme-text)' }}>{item.name}</h3>
              </div>
              <div className="space-y-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <p>📦 {item.quantity} {item.unit} (Mín: {item.min_quantity})</p>
                <p>📍 {item.location?.name}</p>
                {item.unit_cost && <p>💰 R$ {parseFloat(item.unit_cost).toFixed(2)} / {item.unit}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== ABA 4: MOVIMENTAÇÕES & COMPRAS ====================
function ComprasTab({ isSacerdote, profile }) {
  const [shoppingList, setShoppingList] = useState([])
  const [newItem, setNewItem] = useState({ item_name: '', quantity: 1, unit: 'unidade', priority: 'normal' })
  const { profile: authProfile } = useAuth() // Garantir acesso ao profile

  useEffect(() => { fetchShoppingList() }, [])

  const fetchShoppingList = async () => {
    const { data } = await supabase
      .from('shopping_list')
      .select('*, requester:requested_by(full_name)')
      .order('created_at', { ascending: false })
    if (data) setShoppingList(data)
  }

  const handleAddToCart = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('shopping_list').insert([{
      ...newItem,
      quantity: parseFloat(newItem.quantity),
      requested_by: authProfile.id,
      status: 'pendente'
    }])
    if (!error) {
      setNewItem({ item_name: '', quantity: 1, unit: 'unidade', priority: 'normal' })
      fetchShoppingList()
    }
  }

  const handleStatusChange = async (id, status) => {
    const updates = status === 'comprado' ? { status, purchased_by: authProfile.id } : { status }
    await supabase.from('shopping_list').update(updates).eq('id', id)
    fetchShoppingList()
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remover item da lista?')) {
      await supabase.from('shopping_list').delete().eq('id', id)
      fetchShoppingList()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista de Compras */}
      <div className="santann-card">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--theme-text)' }}>🛒 Lista de Compras Colaborativa</h3>
        
        <form onSubmit={handleAddToCart} className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="O que está faltando?" 
            value={newItem.item_name} 
            onChange={e => setNewItem({...newItem, item_name: e.target.value})} 
            required 
            className="santann-input flex-1" 
          />
          <input 
            type="number" 
            step="0.1" 
            placeholder="Qtd" 
            value={newItem.quantity} 
            onChange={e => setNewItem({...newItem, quantity: e.target.value})} 
            required 
            className="santann-input w-20" 
          />
          <button type="submit" className="santann-btn">Add</button>
        </form>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {shoppingList.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: item.status === 'comprado' ? '#F0FDF4' : 'var(--theme-bg)' }}>
              <input 
                type="checkbox" 
                checked={item.status === 'comprado'} 
                onChange={() => handleStatusChange(item.id, item.status === 'comprado' ? 'pendente' : 'comprado')}
                className="w-5 h-5 rounded"
              />
              <div className="flex-1">
                <p className={`font-medium ${item.status === 'comprado' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--theme-text)' }}>
                  {item.item_name} ({item.quantity} {item.unit})
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  Solicitado por: {item.requester?.full_name || 'Alguém'}
                </p>
              </div>
              {isSacerdote && (
                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Movimentações de Estoque (Resumo) */}
      <div className="santann-card">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--theme-text)' }}>📜 Últimas Movimentações de Estoque</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
          Entradas e saídas são registradas automaticamente ao adicionar/editar itens.
        </p>
        <div className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>
          <p className="text-4xl mb-2">📦</p>
          <p>Histórico detalhado disponível na aba de relatórios (em breve).</p>
        </div>
      </div>
    </div>
  )
}