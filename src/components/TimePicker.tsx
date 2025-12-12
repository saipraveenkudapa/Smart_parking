'use client'

import { useState, useEffect } from 'react'

interface TimePickerProps {
  value: string // Format: "HH:MM"
  onChange: (time: string) => void
  disabled?: boolean
}

export default function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const [hours, setHours] = useState('12')
  const [minutes, setMinutes] = useState('00')
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM')

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      const hour24 = parseInt(h)
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
      setHours(hour12.toString().padStart(2, '0'))
      setMinutes(m.padStart(2, '0'))
      setPeriod(hour24 >= 12 ? 'PM' : 'AM')
    }
  }, [value])

  const updateTime = (newHours: string, newMinutes: string, newPeriod: 'AM' | 'PM') => {
    let hour24 = parseInt(newHours)
    if (newPeriod === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (newPeriod === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinutes}`
    onChange(timeString)
  }

  const handleHourChange = (newHours: string) => {
    const h = parseInt(newHours)
    if (h >= 1 && h <= 12) {
      setHours(newHours.padStart(2, '0'))
      updateTime(newHours, minutes, period)
    }
  }

  const handleMinuteChange = (newMinutes: string) => {
    const m = parseInt(newMinutes)
    if (m >= 0 && m <= 59) {
      setMinutes(newMinutes.padStart(2, '0'))
      updateTime(hours, newMinutes, period)
    }
  }

  const handlePeriodToggle = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM'
    setPeriod(newPeriod)
    updateTime(hours, minutes, newPeriod)
  }

  const incrementHours = () => {
    const h = parseInt(hours)
    const newHours = h === 12 ? 1 : h + 1
    handleHourChange(newHours.toString())
  }

  const decrementHours = () => {
    const h = parseInt(hours)
    const newHours = h === 1 ? 12 : h - 1
    handleHourChange(newHours.toString())
  }

  const incrementMinutes = () => {
    const m = parseInt(minutes)
    const newMinutes = m === 59 ? 0 : m + 1
    handleMinuteChange(newMinutes.toString())
  }

  const decrementMinutes = () => {
    const m = parseInt(minutes)
    const newMinutes = m === 0 ? 59 : m - 1
    handleMinuteChange(newMinutes.toString())
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Clock Display */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-48 h-48 rounded-full border-4 border-green-600 bg-linear-to-br from-green-50 to-white shadow-lg">
          {/* Clock center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-green-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"></div>
          
          {/* Hour hand */}
          <div
            className="absolute top-1/2 left-1/2 w-1 bg-gray-800 rounded-full origin-bottom transform -translate-x-1/2"
            style={{
              height: '35%',
              transform: `translate(-50%, -100%) rotate(${(parseInt(hours) % 12) * 30 + parseInt(minutes) * 0.5}deg)`,
            }}
          ></div>
          
          {/* Minute hand */}
          <div
            className="absolute top-1/2 left-1/2 w-0.5 bg-green-600 rounded-full origin-bottom transform -translate-x-1/2"
            style={{
              height: '42%',
              transform: `translate(-50%, -100%) rotate(${parseInt(minutes) * 6}deg)`,
            }}
          ></div>

          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const angle = (i + 1) * 30
            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-1 h-3 bg-gray-400 transform origin-bottom"
                style={{
                  transform: `translate(-50%, -85px) rotate(${angle}deg)`,
                }}
              ></div>
            )
          })}
        </div>
      </div>

      {/* Time Input Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementHours}
            disabled={disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <input
            type="text"
            value={hours}
            onChange={(e) => handleHourChange(e.target.value)}
            disabled={disabled}
            className="w-16 text-center text-2xl font-bold border-2 border-green-600 rounded-lg py-2 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            maxLength={2}
          />
          <button
            type="button"
            onClick={decrementHours}
            disabled={disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <span className="text-3xl font-bold text-gray-600 mt-8">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementMinutes}
            disabled={disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <input
            type="text"
            value={minutes}
            onChange={(e) => handleMinuteChange(e.target.value)}
            disabled={disabled}
            className="w-16 text-center text-2xl font-bold border-2 border-green-600 rounded-lg py-2 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            maxLength={2}
          />
          <button
            type="button"
            onClick={decrementMinutes}
            disabled={disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col items-center ml-2">
          <button
            type="button"
            onClick={handlePeriodToggle}
            disabled={disabled}
            className={`
              w-16 py-3 rounded-lg font-bold text-sm transition-all mt-8
              ${period === 'AM' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }
              disabled:opacity-50
            `}
          >
            {period}
          </button>
        </div>
      </div>

      {/* Quick time buttons */}
      <div className="mt-6 grid grid-cols-4 gap-2">
        {['09:00', '12:00', '15:00', '18:00'].map((time) => {
          const [h, m] = time.split(':')
          const hour = parseInt(h)
          const hour12 = hour > 12 ? hour - 12 : hour
          const periodLabel = hour >= 12 ? 'PM' : 'AM'
          
          return (
            <button
              key={time}
              type="button"
              onClick={() => {
                setHours(hour12.toString().padStart(2, '0'))
                setMinutes(m)
                setPeriod(periodLabel)
                updateTime(hour12.toString(), m, periodLabel)
              }}
              disabled={disabled}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-600 transition-colors disabled:opacity-50"
            >
              {hour12}:{m} {periodLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
