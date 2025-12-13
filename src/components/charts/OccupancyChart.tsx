'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface OccupancyData {
  listing: string
  occupancyRate: number
  totalBookings: number
}

interface OccupancyChartProps {
  data: OccupancyData[]
  title?: string
}

export default function OccupancyChart({ data, title }: OccupancyChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis dataKey="listing" type="category" width={150} />
          <Tooltip />
          <Legend />
          <Bar dataKey="occupancyRate" fill="#10b981" name="Occupancy Rate (%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
