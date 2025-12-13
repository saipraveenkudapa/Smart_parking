// Tableau Dashboard Configuration
// Update these settings with your actual Tableau Server/Online URLs

export const tableauConfig = {
  // Tableau Server or Tableau Online base URL
  // Example for Tableau Public: 'https://public.tableau.com/views'
  // Example for Tableau Server: 'https://your-server.com/views'
  // Example for Tableau Online: 'https://online.tableau.com/#/site/your-site/views'
  baseUrl: 'https://public.tableau.com/views',

  // Dashboard paths (relative to baseUrl)
  // Format: 'WorkbookName/DashboardName'
  dashboards: {
    // Host Dashboards
    hostOverview: {
      path: 'ParkingHostDashboard/Overview',
      name: 'Host Overview',
      description: 'Your listing performance and earnings overview',
    },
    hostEarnings: {
      path: 'ParkingHostDashboard/Earnings',
      name: 'Earnings Analytics',
      description: 'Detailed revenue trends and forecasts',
    },
    hostBookings: {
      path: 'ParkingHostDashboard/Bookings',
      name: 'Booking Analytics',
      description: 'Booking patterns and occupancy rates',
    },

    // Renter Dashboards
    renterActivity: {
      path: 'ParkingRenterDashboard/Activity',
      name: 'My Parking History',
      description: 'Your parking usage and spending analysis',
    },
    renterSpending: {
      path: 'ParkingRenterDashboard/Spending',
      name: 'Spending Analytics',
      description: 'Track your parking expenses over time',
    },

    // Admin Dashboards (if applicable)
    systemOverview: {
      path: 'ParkingSystemDashboard/Overview',
      name: 'System Overview',
      description: 'Platform-wide metrics and performance',
    },
  },

  // Filter parameter names in Tableau
  // These should match the parameter names in your Tableau workbooks
  filterParameters: {
    userId: 'User ID',
    email: 'Email',
    userName: 'User Name',
    dateFrom: 'Date From',
    dateTo: 'Date To',
  },

  // Embedding options
  embedOptions: {
    hideTabs: true,
    hideToolbar: false,
    width: '100%',
    height: '800px',
  },

  // Authentication type
  // 'public' - Tableau Public (no authentication)
  // 'trusted' - Trusted authentication with Tableau Server
  // 'connectedapps' - Connected Apps authentication
  authType: 'public',
}

// Helper function to build full dashboard URL
export function getDashboardUrl(dashboardKey: keyof typeof tableauConfig.dashboards): string {
  const dashboard = tableauConfig.dashboards[dashboardKey]
  if (!dashboard) return ''
  return `${tableauConfig.baseUrl}/${dashboard.path}`
}

// Helper function to build URL with user filters
export function getDashboardUrlWithFilters(
  dashboardKey: keyof typeof tableauConfig.dashboards,
  userFilters: Record<string, string>
): string {
  const baseUrl = getDashboardUrl(dashboardKey)
  if (!baseUrl) return ''

  const url = new URL(baseUrl)
  
  // Add user filters
  Object.entries(userFilters).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  // Add embed parameters
  url.searchParams.set(':embed', 'yes')
  url.searchParams.set(':showVizHome', 'no')
  url.searchParams.set(':toolbar', tableauConfig.embedOptions.hideToolbar ? 'no' : 'yes')
  url.searchParams.set(':tabs', tableauConfig.embedOptions.hideTabs ? 'no' : 'yes')

  return url.toString()
}

export default tableauConfig
