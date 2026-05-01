import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, UserPlus, MessageCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchUsers(session?.user?.id);
    });
  }, []);

  const fetchUsers = async (currentUserId) => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('username', { ascending: true });
    
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data } = await query;
    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
    (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  const startChat = (user) => {
    if (!session) {
      navigate('/auth');
      return;
    }
    navigate('/chat', { state: { selectedUser: user } });
  };

  return (
    <div className="main-content-wrapper" style={{ paddingBottom: '2rem' }}>
      <div className="feed-layout">
        <LeftSidebar />
        
        <div className="feed-main-content" style={{ marginTop: '2rem', flex: 1, maxWidth: '800px', margin: '2rem auto 0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Communauté Manjo</h2>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', top: '10px', left: '12px', color: '#999' }} />
          <input 
            type="text" 
            placeholder="Rechercher un habitant..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '24px', border: '1px solid #ddd', outline: 'none' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Chargement des profils...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#999' }}>Aucun utilisateur trouvé.</div>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Link to={`/profile/${user.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <img 
                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username || 'U')}&background=random`} 
                    alt="Avatar" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} 
                  />
                  <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', color: 'var(--color-primary)' }}>{user.full_name || user.username}</h3>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', fontWeight: '500', marginBottom: '0.5rem' }}>@{user.username}</span>
                </Link>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', minHeight: '3rem', opacity: 0.8 }}>
                  {user.bio ? (user.bio.length > 60 ? user.bio.substring(0, 60) + '...' : user.bio) : 'Aucune bio renseignée.'}
                </p>
                
                <button 
                  onClick={() => startChat(user)}
                  className="btn btn-outline" 
                  style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                >
                  <MessageCircle size={16} /> Contacter
                </button>
              </div>
            ))
          )}
        </div>
      )}
        </div>
        
        <div className="feed-sidebar-right"></div>
      </div>
    </div>
  );
};

export default UsersList;
