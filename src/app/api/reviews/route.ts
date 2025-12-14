import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'USER' only

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Build the where clause based on the query parameters
    const whereClause: any = {
      reviewee_id: parseInt(userId),
      review_type: 'USER'
    }

    if (type) {
      whereClause.review_type = type
    }

    // Fetch reviews
    const reviews = await prisma.reviews.findMany({
      where: whereClause,
      include: {
        users_reviews_reviewer_idTousers: {
          select: {
            user_id: true,
            full_name: true,
            email: true
          }
        },
        users_reviews_reviewee_idTousers: {
          select: {
            user_id: true,
            full_name: true,
            email: true
          }
        }
      },
      orderBy: {
        review_date: 'desc'
      }
    })

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviews.length
      : 0

    // Format the response
    const formattedReviews = reviews.map((review: any) => ({
      reviewId: review.review_id,
      rating: review.rating,
      comments: review.comments,
      reviewDate: review.review_date,
      reviewType: review.review_type,
      reviewer: review.users_reviews_reviewer_idTousers ? {
        id: review.users_reviews_reviewer_idTousers.user_id,
        name: review.users_reviews_reviewer_idTousers.full_name,
        email: review.users_reviews_reviewer_idTousers.email
      } : null,
      reviewee: review.users_reviews_reviewee_idTousers ? {
        id: review.users_reviews_reviewee_idTousers.user_id,
        name: review.users_reviews_reviewee_idTousers.full_name,
        email: review.users_reviews_reviewee_idTousers.email
      } : null
    }))

    return NextResponse.json({
      success: true,
      reviews: formattedReviews,
      totalReviews: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
      ratingDistribution: {
        5: reviews.filter((r: any) => r.rating === 5).length,
        4: reviews.filter((r: any) => r.rating === 4).length,
        3: reviews.filter((r: any) => r.rating === 3).length,
        2: reviews.filter((r: any) => r.rating === 2).length,
        1: reviews.filter((r: any) => r.rating === 1).length,
      }
    })

  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
