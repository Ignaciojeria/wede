import { useState, useCallback, useEffect } from 'react'

const API = '/api'

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('wede_token'))
  const [authEnabled, setAuthEnabled] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState(null)
  const [locked, setLocked] = useState(false)
  const [remaining, setRemaining] = useState(3)

  const logout = useCallback(() => {
    localStorage.removeItem('wede_token')
    setToken(null)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API}/auth/check`)
        const data = await res.json()
        if (data.authEnabled === false) {
          setAuthEnabled(false)
          return
        }
        setAuthEnabled(true)
        if (!data.authenticated) {
          logout()
        }
      } catch {
        setError('Cannot connect to server')
      } finally {
        setAuthReady(true)
      }
    }
    checkAuth()
  }, [logout])

  const login = useCallback(async (password) => {
    setError(null)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.error === 'locked') {
        setLocked(true)
        setError(data.message)
        return false
      }
      if (data.error === 'wrong_password') {
        setRemaining(data.remaining)
        setError(`Wrong password. ${data.remaining} attempt${data.remaining !== 1 ? 's' : ''} remaining.`)
        return false
      }
      if (data.token) {
        localStorage.setItem('wede_token', data.token)
        setToken(data.token)
        return true
      }
      setError('Unknown error')
      return false
    } catch {
      setError('Cannot connect to server')
      return false
    }
  }, [])

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers }
    if (token) {
      headers.Authorization = token
    }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      logout()
      throw new Error('unauthorized')
    }
    return res
  }, [token, logout])

  return { token, authEnabled, authReady, login, logout, error, locked, remaining, authFetch }
}
