// Global flag to track if Google Maps is loading or loaded
let isLoading = false
let isLoaded = false
const callbacks: (() => void)[] = []

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isLoaded && window.google && window.google.maps) {
      resolve()
      return
    }

    // If currently loading, add callback to queue
    if (isLoading) {
      callbacks.push(resolve)
      return
    }

    // Check if API key is configured
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      reject(new Error('Google Maps API key not configured'))
      return
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    )
    
    if (existingScript) {
      // Script exists but might not be loaded yet
      if (window.google && window.google.maps) {
        isLoaded = true
        resolve()
      } else {
        // Wait for existing script to load
        isLoading = true
        callbacks.push(resolve)
        existingScript.addEventListener('load', () => {
          isLoaded = true
          isLoading = false
          resolve()
          callbacks.forEach(cb => cb())
          callbacks.length = 0
        })
      }
      return
    }

    // Start loading
    isLoading = true

    // Create and append script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      isLoaded = true
      isLoading = false
      resolve()
      // Resolve all queued callbacks
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }
    
    script.onerror = () => {
      isLoading = false
      const error = new Error('Failed to load Google Maps')
      reject(error)
      callbacks.forEach(() => reject(error))
      callbacks.length = 0
    }
    
    document.head.appendChild(script)
  })
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps
}
