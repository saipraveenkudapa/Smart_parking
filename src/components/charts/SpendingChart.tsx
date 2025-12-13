'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface SpendingData {
  date: string
  amount: number
  bookings: number
}

interface SpendingChartProps {
  data: SpendingData[]
  title?: string
}

export default function SpendingChart({ data, title }: SpendingChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="amount" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Spending ($)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
