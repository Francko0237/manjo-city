import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, ShieldCheck, LogIn, MessageCircle, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';

const Groups = () => {
  const [session, setSession] = useState(null);
  const [groups, setGroups] = useState([]);
  const [myMemberships, setMyMemberships] = useState({}); // groupId -> status
  const [pendingRequests, setPendingRequests] = useState({}); // groupId -> array of pending users
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  
  // Create form
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchMyMemberships(session.user.id);
        fetchPendingRequests(session.user.id);
      }
      fetchAllGroups();
    });
  }, []);

  const fetchMyMemberships = async (userId) => {
    const { data } = await supabase.from('group_members').select('group_id, status').eq('user_id', userId);
    if (data) {
      const ms = {};
      data.forEach(d => ms[d.group_id] = d.status);
      setMyMemberships(ms);
    }
  };

  const fetchPendingRequests = async (userId) => {
    // Admins need to see pending requests for their groups
    // Find groups I own
    const { data: myOwnedGroups } = await supabase.from('groups').select('id').eq('creator_id', userId);
    if (myOwnedGroups && myOwnedGroups.length > 0) {
      const ownedIds = myOwnedGroups.map(g => g.id);
      const { data: pendingMem } = await supabase
        .from('group_members')
        .select('*, profiles!group_members_user_id_fkey(username, full_name)')
        .in('group_id', ownedIds)
        .eq('status', 'pending');
      
      if (pendingMem) {
         const reqs = {};
         pendingMem.forEach(p => {
           if (!reqs[p.group_id]) reqs[p.group_id] = [];
           reqs[p.group_id].push(p);
         });
         setPendingRequests(reqs);
      }
    }
  };

  const fetchAllGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('groups')
      .select('*, creator:profiles!groups_creator_id_fkey(username)')
      .order('created_at', { ascending: false });
      
    if (data) setGroups(data);
    setLoading(false);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setMessage('');
    
    // First insert the group
    const { data, error } = await supabase.from('groups').insert([{
      name,
      description: desc,
      creator_id: session.user.id
    }]).select();

    if (error) {
       setMessage('Erreur: ' + error.message);
    } else {
       // Automatic membership triggers 'approved' status now via SQL
       setMessage('Groupe créé avec succès !');
       setName(''); setDesc(''); setShowCreate(false);
       fetchAllGroups();
       fetchMyMemberships(session.user.id);
    }
    setCreating(false);
  };

  const joinGroup = async (groupId) => {
    if (!session) return;
    const { error } = await supabase.from('group_members').insert([{
      group_id: groupId,
      user_id: session.user.id,
      role: 'member',
      status: 'pending' // Force pending for joins
    }]);

    if (!error) {
      alert('Demande d\'adhésion envoyée à l\'administrateur.');
      fetchMyMemberships(session.user.id);
    } else {
      alert('Erreur: ' + error.message);
    }
  };

  const approveMember = async (groupId, userId) => {
    const { error } = await supabase
      .from('group_members')
      .update({ status: 'approved' })
      .match({ group_id: groupId, user_id: userId });
      
    if (!error) {
      fetchPendingRequests(session.user.id);
    } else {
      alert('Erreur: ' + error.message);
    }
  };

  const goToChat = (groupId) => {
    navigate('/chat', { state: { selectedGroupId: groupId } });
  };

  return (
    <div className="main-content-wrapper" style={{ paddingBottom: '2rem' }}>
      <div className="feed-layout">
        <LeftSidebar />
        
        <div className="feed-main-content" style={{ marginTop: '2rem', flex: 1, maxWidth: '800px', margin: '2rem auto 0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2><Users size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-primary)' }}/> Groupes de Discussion</h2>
        {session && (
           <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             {showCreate ? 'Annuler' : <><Plus size={18} /> Créer un groupe</>}
           </button>
        )}
      </div>

      {showCreate && (
         <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
            <h3 style={{ marginTop: 0 }}>Nouveau Groupe</h3>
            {message && <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}
            
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Nom du groupe" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
              <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows="3" style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
              <button type="submit" disabled={creating} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {creating ? 'Création...' : 'Créer le groupe'}
              </button>
            </form>
         </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Chargement des groupes...</div>
      ) : groups.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '3rem' }}>Aucun groupe n'a été créé pour le moment.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {groups.map(group => {
            const membershipStatus = myMemberships[group.id]; // 'approved' | 'pending' | undefined
            const isCreator = session && group.creator_id === session.user.id;
            const pendings = pendingRequests[group.id] || [];
            
            return (
              <div key={group.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {group.name} {isCreator && <ShieldCheck size={16} color="var(--color-primary)" title="Vous êtes l'administrateur" />}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Créé par @{group.creator?.username}</span>
                  </div>
                </div>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', flex: 1, minHeight: '3rem' }}>{group.description || 'Aucune description fournie.'}</p>
                
                {/* Admin Area: Pending Requests */}
                {isCreator && pendings.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                     <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <UserCheck size={16} /> Demandes d'adhésion ({pendings.length})
                     </h4>
                     {pendings.map(req => (
                        <div key={req.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span>{req.profiles?.full_name || req.profiles?.username}</span>
                          <button onClick={() => approveMember(group.id, req.user_id)} className="btn btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>Accepter</button>
                        </div>
                     ))}
                  </div>
                )}

                <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  {membershipStatus === 'approved' ? (
                     <button onClick={() => goToChat(group.id)} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                       <MessageCircle size={16} /> Discuter
                     </button>
                  ) : membershipStatus === 'pending' ? (
                     <div style={{ color: '#d97706', fontWeight: 'bold', textAlign: 'center', padding: '0.5rem', background: '#fef3c7', borderRadius: '8px' }}>
                       Demande en attente...
                     </div>
                  ) : session ? (
                     <button onClick={() => joinGroup(group.id)} className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                       <LogIn size={16} /> Rejoindre
                     </button>
                  ) : (
                     <div style={{ fontSize: '0.85rem', color: '#999', textAlign: 'center' }}>Connectez-vous pour rejoindre</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
        
        <div className="feed-sidebar-right"></div>
      </div>
    </div>
  );
};

export default Groups;
