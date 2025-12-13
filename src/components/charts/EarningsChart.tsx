'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface EarningsData {
  date: string
  earnings: number
  bookings: number
}

interface EarningsChartProps {
  data: EarningsData[]
  type?: 'line' | 'bar'
  title?: string
}

export default function EarningsChart({ data, type = 'line', title }: EarningsChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} name="Earnings ($)" />
            <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} name="Bookings" />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="earnings" fill="#10b981" name="Earnings ($)" />
            <Bar yAxisId="right" dataKey="bookings" fill="#3b82f6" name="Bookings" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
