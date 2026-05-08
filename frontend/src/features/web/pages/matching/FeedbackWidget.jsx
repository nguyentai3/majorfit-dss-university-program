import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Star, MessageSquare } from 'lucide-react';
import { submitMatchFeedback } from '@frontend/api/services';
import toast from 'react-hot-toast';

export default function FeedbackWidget({ matchResultId }) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const mutation = useMutation({
        mutationFn: (data) => submitMatchFeedback(data),
        onSuccess: () => {
            setSubmitted(true);
            toast.success('Feedback saved! Your input improves the AI algorithm.');
        },
        onError: () => {
            toast.error('Failed to submit feedback.');
        }
    });

    if (!matchResultId) return null;

    if (submitted) {
        return (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center mt-4">
                <span className="text-sm font-semibold text-emerald-700">Thank you for your feedback! ✅</span>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-500" />
                Rate this suggestion
            </h4>
            <p className="text-xs text-slate-500 mb-3">Help the system learn by rating how relevant this program is to your goals.</p>
            
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => {
                            setRating(star);
                            mutation.mutate({ matchResultId, rating: star, isRelevant: star >= 3 });
                        }}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(rating)}
                        disabled={mutation.isPending}
                        className="transition-transform hover:scale-110 disabled:opacity-50"
                    >
                        <Star 
                            className={`h-6 w-6 ${star <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
