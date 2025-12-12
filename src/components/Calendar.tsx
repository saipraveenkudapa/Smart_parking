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
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const disabled = isDateDisabled(day)
          const selected = isDateSelected(day)
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={disabled}
              className={`
                aspect-square p-2 text-sm rounded-lg transition-all
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
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded line-through"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
      </div>
    </div>
  )
}
