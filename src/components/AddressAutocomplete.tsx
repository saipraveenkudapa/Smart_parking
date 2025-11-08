'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsScript } from '@/lib/googleMaps'

interface AddressComponents {
  fullAddress: string
  streetAddress: string
  city: string
  state: string
  zipCode: string
  latitude?: number
  longitude?: number
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void
  defaultValue?: string
  placeholder?: string
  className?: string
  required?: boolean
}

export default function AddressAutocomplete({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Start typing an address...',
  className = '',
  required = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true)
      return
    }

    // Check if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      setError('Google Maps API key not configured')
      return
    }

    // Load Google Maps script using global loader
    loadGoogleMapsScript(apiKey)
      .then(() => setIsLoaded(true))
      .catch((err) => {
        console.error('Failed to load Google Maps:', err)
        setError('Failed to load Google Maps')
      })
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    try {
      // Initialize autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
      })

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (!place || !place.address_components) {
          return
        }

        // Extract address components
        const addressComponents: AddressComponents = {
          fullAddress: place.formatted_address || '',
          streetAddress: '',
          city: '',
          state: '',
          zipCode: '',
        }

        // Get latitude and longitude
        if (place.geometry && place.geometry.location) {
          addressComponents.latitude = place.geometry.location.lat()
          addressComponents.longitude = place.geometry.location.lng()
        }

        // Parse address components
        for (const component of place.address_components) {
          const types = component.types

          if (types.includes('street_number')) {
            addressComponents.streetAddress = component.long_name
          }

          if (types.includes('route')) {
            addressComponents.streetAddress += ' ' + component.long_name
          }

          if (types.includes('locality')) {
            addressComponents.city = component.long_name
          }

          if (types.includes('administrative_area_level_1')) {
            addressComponents.state = component.short_name
          }

          if (types.includes('postal_code')) {
            addressComponents.zipCode = component.short_name
          }
        }

        // Trim street address
        addressComponents.streetAddress = addressComponents.streetAddress.trim()

        // Call parent callback with parsed data
        onAddressSelect(addressComponents)
      })
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err)
      setError('Failed to initialize autocomplete')
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, onAddressSelect])

  if (error) {
    return (
      <div>
        <input
          type="text"
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={className}
          required={required}
        />
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
      className={className}
      required={required}
      disabled={!isLoaded}
    />
  )
}
