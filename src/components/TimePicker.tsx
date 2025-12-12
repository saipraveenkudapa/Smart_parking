'use client'

import { useEffect } from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  disabled?: boolean
  label?: string
}

export default function TimePicker({ value, onChange, disabled = false, label }: TimePickerProps) {
  // Convert 24-hour format to 12-hour format for display
  const convertTo12Hour = (time24: string) => {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':')
    const h = parseInt(hours)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12.toString().padStart(2, '0')}:${minutes} ${period}`
  }

  // Convert 12-hour format input to 24-hour format
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value // This will be in HH:MM format from input type="time"
    if (inputValue) {
      onChange(inputValue)
    }
  }

  return (
    <div>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Regular HTML5 time input */}
      <input
        type="time"
        value={value || '12:00'}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:opacity-50"
      />
    </div>
  )
}
