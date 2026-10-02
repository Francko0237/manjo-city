import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Star, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Reviews = () => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setMessage("Veuillez sélectionner au moins une étoile.");
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const { error } = await supabase.from('site_reviews').insert([
        { 
          user_id: userId,
          rating: rating,
          comment: comment.trim()
        }
      ]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      setMessage("Erreur lors de l'envoi de l'avis : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container py-4 text-center" style={{ marginTop: '100px' }}>
        <div className="glass-card" style={{ padding: '3rem', maxWidth: '500px', margin: '0 auto' }}>
          <h2>Merci pour votre avis ! 🎉</h2>
          <p style={{ color: 'var(--color-text-light)' }}>Votre retour nous aide à améliorer ManjoCity.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '2rem' }}>Redirection vers l'accueil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ marginTop: '80px', maxWidth: '600px' }}>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Donnez votre avis</h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-light)', marginBottom: '2rem' }}>
          Que pensez-vous de la plateforme ManjoCity ?
        </p>

        {message && (
          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={40}
                strokeWidth={1.5}
                color={star <= (hoverRating || rating) ? "#fbbf24" : "#cbd5e1"}
                fill={star <= (hoverRating || rating) ? "#fbbf24" : "transparent"}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Commentaire (optionnel)</label>
            <textarea
              placeholder="Dites-nous ce que vous en pensez..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="4"
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}
          >
            {loading ? 'Envoi en cours...' : <><Send size={18} /> Envoyer l'avis</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Reviews;
