'use client'

import { useState } from 'react'

interface CalendarProps {
  selectedDate: string | null
  onDateSelect: (date: string) => void
  disabledDates?: Set<string>
  minDate?: string
  maxDate?: string
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  disabledDates = new Set(),
  minDate,
  maxDate,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate)
    }
    return new Date()
  })

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const isDateDisabled = (day: number | null) => {
    if (day === null) return true
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    
    if (disabledDates.has(dateStr)) return true
    
    if (minDate) {
      const min = new Date(minDate)
      const current = new Date(year, month, day)
      if (current < min) return true
    }
    
    if (maxDate) {
      const max = new Date(maxDate)
      const current = new Date(year, month, day)
      if (current > max) return true
    }
    
    return false
  }

  const getDisabledReason = (day: number | null) => {
    if (day === null) return ''

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]

    if (disabledDates.has(dateStr)) return 'Already booked'

    if (minDate) {
      const min = new Date(minDate)
      const current = new Date(year, month, day)
      if (current < min) return 'Outside host availability'
    }

    if (maxDate) {
      const max = new Date(maxDate)
      const current = new Date(year, month, day)
      if (current > max) return 'Outside host availability'
    }

    return ''
  }

  const isDateSelected = (day: number | null) => {
    if (day === null || !selectedDate) return false
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    
    return dateStr === selectedDate
  }

  const handleDateClick = (day: number | null) => {
    if (day === null || isDateDisabled(day)) return
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    
    onDateSelect(dateStr)
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-sm font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-600 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          const disabled = isDateDisabled(day)
          const selected = isDateSelected(day)
          
          return (
            <button
              key={index}
              type="button"
              title={disabled ? getDisabledReason(day) : undefined}
              onClick={() => handleDateClick(day)}
              disabled={disabled}
              className={`
                aspect-square p-1 text-xs rounded transition-all
                ${day === null ? 'invisible' : ''}
                ${disabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' 
                  : 'hover:bg-green-50 text-gray-700 hover:text-green-700'
                }
                ${selected 
                  ? 'bg-green-600 text-white font-bold hover:bg-green-700 hover:text-white' 
                  : ''
                }
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-600 rounded"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded line-through"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
      </div>
    </div>
  )
}
