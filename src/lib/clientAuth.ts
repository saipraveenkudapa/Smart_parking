// Client-side auth utilities

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  document.cookie = 'token=; path=/; max-age=0' // Clear cookie
  window.location.href = '/login'
}

export function requireAuth(redirectUrl?: string) {
  if (!isAuthenticated()) {
    const redirect = redirectUrl || window.location.pathname
    window.location.href = `/login?redirect=${redirect}&message=Please login to continue`
    return false
  }
  return true
}
