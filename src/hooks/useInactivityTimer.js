import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos

export const useInactivityTimer = (user) => {
  const timerRef = useRef(null)

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!user) return

    timerRef.current = setTimeout(async () => {
      console.log('Sessão expirada por inatividade')
      alert('Sua sessão expirou por inatividade. Faça login novamente.')
      await supabase.auth.signOut()
      window.location.href = '/login'
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user])
}