'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'

interface Review {
  reviewId: number
  rating: number
  comments: string | null
  reviewDate: string
  reviewer: {
    id: number
    name: string
    email: string
  } | null
}

interface ReviewsProps {
  targetId: number
  targetType: 'SPACE' | 'USER'
  allowNewReview?: boolean
  bookingId?: number
}

export default function Reviews({ targetId, targetType, allowNewReview = true, bookingId }: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [ratingDistribution, setRatingDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  
  // Review form state
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [targetId, targetType])

  const fetchReviews = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reviews?userId=${targetId}`)
      const data = await response.json()

      if (data.success) {
        setReviews(data.reviews)
        setAverageRating(data.averageRating)
        setTotalReviews(data.totalReviews)
        setRatingDistribution(data.ratingDistribution)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)
    setIsSubmitting(true)

    try {
      if (!allowNewReview) {
        setSubmitError('Review submission is not available here')
        return
      }

      if (!bookingId) {
        setSubmitError('Booking ID is required to submit a review')
        return
      }

      const token = localStorage.getItem('token')
      if (!token) {
        setSubmitError('Please log in to submit a review')
        return
      }

      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId,
          revieweeId: targetId,
          rating,
          comments,
          reviewType: 'USER'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitSuccess(true)
        setRating(0)
        setComments('')
        setShowReviewForm(false)
        // Refresh reviews
        fetchReviews()
      } else {
        setSubmitError(data.error || 'Failed to submit review')
      }
    } catch (error) {
      setSubmitError('An error occurred while submitting your review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (count: number, interactive = false, size = 'w-5 h-5') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= (interactive ? (hoveredRating || rating) : count)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer' : ''}`}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading reviews...</div>
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Reviews & Ratings</h3>
        
        {totalReviews > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900">{averageRating}</div>
                <div className="flex justify-center mt-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-sm text-gray-600 mt-1">{totalReviews} reviews</p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm w-3">{stars}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${totalReviews > 0 ? (ratingDistribution[stars as keyof typeof ratingDistribution] / totalReviews) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {ratingDistribution[stars as keyof typeof ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to review!</p>
        )}
      </div>

      {/* Add Review Button */}
      {allowNewReview && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold mb-4">Write Your Review</h4>
          
          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              Review submitted successfully!
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating *
              </label>
              {renderStars(rating, true, 'w-8 h-8')}
              {rating === 0 && (
                <p className="text-sm text-red-500 mt-1">Please select a rating</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewForm(false)
                  setRating(0)
                  setComments('')
                  setSubmitError('')
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">All Reviews</h4>
          {reviews.map((review) => (
            <div key={review.reviewId} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {review.reviewer?.name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(review.reviewDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {renderStars(review.rating)}
              </div>
              {review.comments && (
                <p className="text-gray-700 mt-2">{review.comments}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
