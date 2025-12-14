import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    // Get and verify JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const reviewerId = parseInt(decoded.userId)

    const body = await request.json()
    const { revieweeId, rating, comments, reviewType, bookingId } = body

    // Validate required fields
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!reviewType || !['SPACE', 'USER'].includes(reviewType)) {
      return NextResponse.json(
        { error: 'Review type must be either SPACE or USER' },
        { status: 400 }
      )
    }

    if (reviewType === 'USER' && !revieweeId) {
      return NextResponse.json(
        { error: 'Reviewee ID is required for user reviews' },
        { status: 400 }
      )
    }

    // Prevent self-review for users
    if (reviewType === 'USER' && reviewerId === revieweeId) {
      return NextResponse.json(
        { error: 'You cannot review yourself' },
        { status: 400 }
      )
    }

    // Check if user exists (for user reviews)
    if (reviewType === 'USER') {
      const user = await prisma.users.findUnique({
        where: { user_id: parseInt(revieweeId) }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Create the review
    const review = await prisma.reviews.create({
      data: {
        booking_id: parseInt(bookingId),
        reviewer_id: reviewerId,
        reviewee_id: parseInt(revieweeId),
        review_type: reviewType,
        rating: parseInt(rating),
        comments: comments || '',
        review_date: new Date()
      },
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
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        reviewId: review.review_id,
        rating: review.rating,
        comments: review.comments,
        reviewDate: review.review_date,
        reviewer: {
          id: review.users_reviews_reviewer_idTousers.user_id,
          name: review.users_reviews_reviewer_idTousers.full_name
        },
        reviewee: {
          id: review.users_reviews_reviewee_idTousers.user_id,
          name: review.users_reviews_reviewee_idTousers.full_name
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
