import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isFetchingRef = useRef(false)

  const fetchProfile = useCallback(async (userId) => {
    // Previne requisições duplicadas
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Erro ao buscar perfil:', error)
        return
      }
      
      setProfile(data)
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let subscription = null

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (mounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
        setLoading(false)
      }
    }

    initializeAuth()

    subscription = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      if (subscription) {
        subscription.data?.subscription?.unsubscribe()
      }
    }
  }, [fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)