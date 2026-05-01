import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, ArrowLeft, BarChart2, Star, Edit, Calendar as CalendarIcon, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Admin = () => {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // 'content', 'stats', 'reviews'
  const navigate = useNavigate();
  
  // Forms state
  const [type, setType] = useState('events'); // 'events' ou 'projects'
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('en_cours');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  // Stats state
  const [visitsCount, setVisitsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // today, week, month, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    const checkAdminRole = async (sessionData) => {
      if (sessionData?.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', sessionData.user.id).single();
        const adminRole = profile?.role === 'admin';
        setIsAdmin(adminRole);
        if (adminRole) {
          fetchStats('today');
          fetchReviews();
        }
      } else {
        setIsAdmin(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAdminRole(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkAdminRole(session);
    });
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'stats' && dateFilter !== 'custom') {
      fetchStats(dateFilter);
    }
  }, [dateFilter, isAdmin, activeTab]);

  const fetchStats = async (filter) => {
    setStatsLoading(true);
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (filter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (filter === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (filter === 'custom') {
      if (!customStart || !customEnd) {
        setStatsLoading(false);
        return;
      }
      startDate = new Date(customStart);
      startDate.setHours(0,0,0,0);
      endDate = new Date(customEnd);
      endDate.setHours(23,59,59,999);
    }

    try {
      const { count, error } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startDate.toISOString())
        .lte('visited_at', endDate.toISOString());

      if (!error) {
        setVisitsCount(count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_reviews')
        .select('*, profiles:user_id(username, full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    let imageUrl = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('manjo-images')
        .upload(filePath, file);
        
      if (uploadError) {
        setMessage('Erreur upload image: ' + uploadError.message);
        setLoading(false);
        return;
      }
      
      const { data } = supabase.storage.from('manjo-images').getPublicUrl(filePath);
      imageUrl = data.publicUrl;
    }

    const payload = { title, description: desc, image_url: imageUrl };
    if (type === 'events') {
       payload.date = date;
       payload.date_fin = endDate || null;
    }
    if (type === 'projects') {
       payload.status = status;
    }

    const { error } = await supabase.from(type).insert([payload]);

    if (error) {
       setMessage('Erreur: ' + error.message);
    } else {
       setMessage('Ajouté avec succès!');
       setTitle(''); setDesc(''); setDate(''); setEndDate(''); setFile(null); setStatus('en_cours');
    }
    setLoading(false);
  };

  if (!session) {
    return (
      <div className="container py-4 text-center" style={{marginTop: '100px'}}>
        <div className="glass-card" style={{padding: '3rem', maxWidth: '500px', margin: '0 auto'}}>
          <h2>Espace Restreint</h2>
          <p className="mb-2">Vous devez être administrateur pour accéder à cette page.</p>
          <Link to="/auth" className="btn btn-primary">Se connecter</Link>
        </div>
      </div>
    );
  }

  if (session && !isAdmin) {
     return (
        <div className="container py-4 text-center" style={{marginTop: '100px'}}>
          <div className="glass-card" style={{padding: '3rem', maxWidth: '500px', margin: '0 auto'}}>
            <h2>Accès Refusé</h2>
            <p className="mb-2" style={{color: 'var(--color-secondary)'}}>Votre compte ne possède pas les droits administrateur pour la mairie.</p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
               <Link to="/" className="btn btn-outline" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><ArrowLeft size={16}/> Retour</Link>
               <button onClick={handleLogout} className="btn btn-secondary">Changer de compte</button>
            </div>
          </div>
        </div>
     );
  }

  return (
    <div className="container py-4" style={{marginTop: '80px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}} className="mb-2">
         <h2>Outils d'Administrateur</h2>
         <button onClick={handleLogout} className="btn btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <LogOut size={16}/> Déconnexion
         </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('stats')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <BarChart2 size={18} /> Statistiques Visiteurs
        </button>
        <button 
          className={`btn ${activeTab === 'content' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('content')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Edit size={18} /> Gérer le contenu
        </button>
        <button 
          className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setActiveTab('reviews'); fetchReviews(); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Star size={18} /> Avis des Utilisateurs
        </button>
      </div>
      
      {activeTab === 'stats' && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={24} /> Trafic du site</h3>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button className={`btn ${dateFilter === 'today' ? 'btn-secondary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setDateFilter('today')}>Aujourd'hui</button>
            <button className={`btn ${dateFilter === 'week' ? 'btn-secondary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setDateFilter('week')}>Cette Semaine</button>
            <button className={`btn ${dateFilter === 'month' ? 'btn-secondary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setDateFilter('month')}>Ce Mois</button>
            <button className={`btn ${dateFilter === 'custom' ? 'btn-secondary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setDateFilter('custom')}>Personnalisé</button>
          </div>

          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Du</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Au</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }} />
              </div>
              <button onClick={() => fetchStats('custom')} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Rechercher</button>
            </div>
          )}

          <div style={{ background: 'var(--color-primary-light)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            {statsLoading ? (
              <p>Chargement...</p>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text)' }}>Nombre de sessions</p>
                <h1 style={{ margin: 0, fontSize: '4rem', color: 'var(--color-primary)' }}>{visitsCount}</h1>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="glass-card" style={{maxWidth: '800px', margin: '0 auto'}}>
          <h3 className="mb-2">Ajouter un élément</h3>
          
          {message && <div style={{padding: '1rem', backgroundColor: 'var(--color-bg-alt)', marginBottom: '1rem', borderRadius: '8px'}}>{message}</div>}

          <form onSubmit={handleSubmitItem} style={{display: 'flex', flexDirection: 'column', gap: '1.2rem'}}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{padding: '0.8rem', borderRadius: '8px'}}>
              <option value="events">Événement</option>
              <option value="projects">Projet</option>
            </select>
            
            <input type="text" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required style={{padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc'}} />
            
            {type === 'events' && (
               <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                 <div>
                   <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Date de début</label>
                   <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc'}} />
                 </div>
                 <div>
                   <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Date de fin (optionnel)</label>
                   <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc'}} />
                 </div>
               </div>
            )}
            
            {type === 'projects' && (
               <div>
                 <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Statut du projet</label>
                 <select value={status} onChange={(e) => setStatus(e.target.value)} style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc'}}>
                   <option value="bientot">Bientôt</option>
                   <option value="en_cours">En cours</option>
                   <option value="termine">Terminé</option>
                 </select>
               </div>
            )}
            
            <textarea placeholder="Description détaillée" value={desc} onChange={(e) => setDesc(e.target.value)} required rows="4" style={{padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc'}} />
            
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Image illustrative (optionnel)</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Publier'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star fill="var(--color-primary)" size={24} color="var(--color-primary)" /> Avis des Utilisateurs</h3>
          
          {reviewsLoading ? (
            <p>Chargement des avis...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: 'var(--color-text-light)' }}>Aucun avis pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map(review => (
                <div key={review.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', background: '#f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={16} fill={s <= review.rating ? '#fbbf24' : 'transparent'} color={s <= review.rating ? '#fbbf24' : '#cbd5e1'} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(review.created_at).toLocaleDateString()} à {new Date(review.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {review.comment && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>"{review.comment}"</p>}
                  {review.profiles && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Par: {review.profiles.full_name || review.profiles.username}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Admin;
