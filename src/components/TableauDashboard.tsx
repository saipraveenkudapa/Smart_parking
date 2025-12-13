'use client'

import { useEffect, useRef } from 'react'

interface TableauDashboardProps {
  dashboardUrl: string
  userFilters?: Record<string, string>
  height?: string
  width?: string
  title?: string
  description?: string
}

export default function TableauDashboard({
  dashboardUrl,
  userFilters = {},
  height = '800px',
  width = '100%',
  title,
  description,
}: TableauDashboardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const buildEmbedUrl = () => {
    if (!dashboardUrl) return ''

    const url = new URL(dashboardUrl)
    
    // Add user-specific filters
    Object.entries(userFilters).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    // Add embed parameters
    url.searchParams.set(':embed', 'yes')
    url.searchParams.set(':showVizHome', 'no')
    url.searchParams.set(':toolbar', 'yes')
    url.searchParams.set(':tabs', 'no')
    url.searchParams.set(':display_count', 'no')
    url.searchParams.set(':showAppBanner', 'false')

    return url.toString()
  }

  const embedUrl = buildEmbedUrl()

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {(title || description) && (
        <div className="bg-green-600 text-white px-6 py-4">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {description && <p className="text-green-100 text-sm">{description}</p>}
        </div>
      )}
      <div className="p-4">
        {embedUrl ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            width={width}
            height={height}
            frameBorder="0"
            allowFullScreen
            className="rounded-lg w-full"
            title={title || 'Tableau Dashboard'}
          />
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 text-center" style={{ height }}>
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Dashboard URL Configured</h3>
            <p className="text-gray-600">
              Please configure the dashboard URL to display analytics
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
