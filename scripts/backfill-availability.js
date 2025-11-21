// Script to backfill availability records for parking spaces without them
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find all parking spaces
  const spaces = await prisma.parking_spaces.findMany({
    include: {
      availability: true,
    },
  })

  console.log(`Found ${spaces.length} parking space(s)`)

  // Filter spaces without availability records
  const spacesWithoutAvailability = spaces.filter(
    space => space.availability.length === 0
  )

  console.log(
    `${spacesWithoutAvailability.length} space(s) need availability records`
  )

  if (spacesWithoutAvailability.length === 0) {
    console.log('All spaces have availability records!')
    return
  }

  // Prompt for user ID
  const userId = process.env.OWNER_USER_ID
  if (!userId) {
    console.error('Please provide OWNER_USER_ID environment variable')
    console.error('Usage: OWNER_USER_ID=123 node scripts/backfill-availability.js')
    process.exit(1)
  }

  console.log(`Creating availability records for owner_id: ${userId}`)

  const now = new Date()
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  // Create availability records
  for (const space of spacesWithoutAvailability) {
    console.log(`Creating availability for space_id: ${space.space_id}`)

    await prisma.availability.create({
      data: {
        owner_id: parseInt(userId),
        space_id: space.space_id,
        available_start: now,
        available_end: oneYearFromNow,
        is_available: true,
        availability_reason: 'Backfilled from existing listing',
        created_at: now,
        updated_at: now,
      },
    })
  }

  console.log('✅ Successfully backfilled availability records!')
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
