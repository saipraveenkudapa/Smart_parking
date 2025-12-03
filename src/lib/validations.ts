import { z } from 'zod'

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
      'Password must include uppercase, lowercase, number, and symbol'
    ),
  phoneNumber: z.string().min(10, 'Phone number is required').regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  role: z.enum(['RENTER', 'HOST']),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5,6}$/, 'Invalid ZIP code'),
  spaceType: z.enum(['GARAGE', 'DRIVEWAY', 'CARPORT', 'STREET', 'LOT']),
  accessInstructions: z.string().min(10, 'Access instructions are required'),
  monthlyPrice: z.number().min(1, 'Price must be greater than 0'),
  securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
  availableFrom: z.string().or(z.date()),
  hasCCTV: z.boolean().optional(),
  hasEVCharging: z.boolean().optional(),
})

export const bookingSchema = z.object({
  listingId: z.string(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
  vehicleDetails: z.string().min(5, 'Vehicle details are required'),
})
