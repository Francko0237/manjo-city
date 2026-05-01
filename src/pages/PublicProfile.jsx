import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LeftSidebar from '../components/LeftSidebar';
import { ArrowLeft, MapPin, Calendar, Image as ImageIcon, Info, ThumbsUp, MessageSquare, Send, X, Heart } from 'lucide-react';

const REACTIONS = [
  { type: 'like',  icon: <ThumbsUp size={18} fill="#2d4a22" strokeWidth={2} color="#2d4a22" />, emoji: '👍', label: 'J\'aime', color: '#2d4a22' },
  { type: 'love',  icon: <Heart size={18} fill="#f33e58" color="#f33e58" />, emoji: '❤️', label: 'J\'adore', color: '#f33e58' },
  { type: 'haha',  emoji: '😂', label: 'Haha',    color: '#f7b928' },
  { type: 'wow',   emoji: '😲', label: 'Wouaou',  color: '#f7b928' },
  { type: 'sad',   emoji: '😢', label: 'Triste',  color: '#f7b928' },
  { type: 'angry', emoji: '😡', label: 'Grrr',    color: '#e23636' }
];

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentText, setCommentText] = useState({});

  const [shareModal, setShareModal] = useState(null);
  const [shareText, setShareText] = useState('');
  const [sharing, setSharing] = useState(false);

  const [reactionHoverPost, setReactionHoverPost] = useState(null);
  const reactionTimerPost = useRef({});

  const [reactionModal, setReactionModal] = useState(null);

  const groupReactions = (reactions) => {
    const counts = {};
    (reactions || []).forEach(r => {
      const t = r.reaction_type || 'like';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  };

  const showReactionPicker = (id) => {
    clearTimeout(reactionTimerPost.current[id]);
    setReactionHoverPost(id);
  };

  const hideReactionPicker = (id) => {
    reactionTimerPost.current[id] = setTimeout(() => setReactionHoverPost(prev => prev === id ? null : prev), 300);
  };

  const ReactionPicker = ({ onReact, id }) => (
    <div
      onMouseEnter={() => showReactionPicker(id)}
      onMouseLeave={() => hideReactionPicker(id)}
      style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        background: 'white', borderRadius: '40px', padding: '8px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', gap: '8px',
        zIndex: 100, marginBottom: '0px', border: '1px solid #e4e6eb',
        animation: 'fadeInUp 0.15s ease',
        paddingBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {REACTIONS.map(r => (
          <button key={r.type} onClick={() => onReact(r.type)} title={r.label} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.6rem',
            padding: '2px 4px', borderRadius: '50%', transition: 'transform 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >{r.icon || r.emoji}</button>
        ))}
      </div>
    </div>
  );

  const fetchUserProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles (username, full_name, avatar_url),
          post_likes ( user_id, reaction_type ),
          post_comments ( id, content, created_at, user_id, parent_id, profiles ( username, full_name, avatar_url ) )`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0); // Scroller en haut à l'ouverture du profil
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        supabase.from('profiles').select('avatar_url, full_name, username').eq('id', session.user.id).single()
          .then(({ data }) => setMyProfile(data));
      }
    });
    fetchUserProfile();
    fetchUserPosts();
  }, [userId]);

  const handleReactPost = async (postId, type = 'like') => {
    if (!session) return alert('Connectez-vous pour réagir.');
    
    // UI Optimiste
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        const existing = post.post_likes?.find(l => l.user_id === session.user.id);
        let newLikes = post.post_likes || [];
        if (existing) {
          if (existing.reaction_type === type) {
            newLikes = newLikes.filter(l => l.user_id !== session.user.id);
          } else {
            newLikes = newLikes.map(l => l.user_id === session.user.id ? { ...l, reaction_type: type } : l);
          }
        } else {
          newLikes = [...newLikes, { user_id: session.user.id, reaction_type: type }];
        }
        return { ...post, post_likes: newLikes };
      }
      return post;
    }));

    try {
      const post = posts.find(p => p.id === postId);
      const existing = post?.post_likes?.find(l => l.user_id === session.user.id);
      
      if (existing) {
        if (existing.reaction_type === type) {
          await supabase.from('post_likes').delete().match({ post_id: postId, user_id: session.user.id });
        } else {
          await supabase.from('post_likes').update({ reaction_type: type }).match({ post_id: postId, user_id: session.user.id });
        }
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: session.user.id, reaction_type: type });
      }
      fetchUserPosts();
    } catch (e) {
      console.error("Crash handleReactPost:", e);
      fetchUserPosts();
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const text = commentText[postId]?.trim();
    if (!text || !session) return;
    await supabase.from('post_comments').insert({ post_id: postId, user_id: session.user.id, content: text });
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    fetchUserPosts();
  };

  const handleShareToFeed = async () => {
    if (!session || !shareModal) return;
    setSharing(true);
    const { error } = await supabase.from('posts').insert({
      user_id: session.user.id,
      content: shareText.trim() || null,
      shared_from_post_id: shareModal.id
    });
    if (!error) { setShareModal(null); setShareText(''); fetchUserPosts(); }
    setSharing(false);
  };

  const handleCopyLink = async (post) => {
    const url = `${window.location.origin}/profile/${post.user_id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Profil de ' + (post.profiles?.full_name || post.profiles?.username || 'Utilisateur'),
          url: url
        });
        return;
      } catch (err) {
        console.log("Partage annulé ou erreur:", err);
      }
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        alert(`🔗 Lien copié :\n${url}`);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        el.style.top = '-9999px';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert(`🔗 Lien copié :\n${url}`);
      }
    } catch (err) {
      alert(`Veuillez copier ce lien manuellement :\n${url}`);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
    const date = new Date(hasTimezone ? dateStr : dateStr + 'Z');
    if (isNaN(date)) return '';
    const secs = Math.max(0, Math.floor((new Date() - date) / 1000));
    if (secs < 60) return "À l'instant";
    if (secs < 3600) return `${Math.floor(secs/60)} min`;
    if (secs < 86400) return `${Math.floor(secs/3600)} h`;
    return `${Math.floor(secs/86400)} j`;
  };

  const africanPattern = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

  if (loading) return <div className="main-content-wrapper" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner"></div></div>;

  if (!profile) return (
    <div className="main-content-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem', color: '#999' }}>
      <Info size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h2>Utilisateur introuvable</h2>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Retour à l'accueil</Link>
    </div>
  );

  const displayName = profile.full_name || profile.username;

  return (
    <div className="main-content-wrapper" style={{ paddingBottom: '2rem' }}>
      <div className="feed-layout">
        <LeftSidebar />
        <div className="feed-main" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>

          <Link to="/chat" className="btn-back-chat hidden-mobile" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
            <ArrowLeft size={18} /> Retour aux messages
          </Link>

          {/* Header profil */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
            <div style={{ height: '200px', background: profile.cover_url ? `url(${profile.cover_url}) center/cover` : `linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%), ${africanPattern}`, position: 'relative' }}></div>
            <div style={{ padding: '0 2rem 2rem', position: 'relative', marginTop: '-60px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} alt="Avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid white', objectFit: 'cover', background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                <div style={{ paddingBottom: '0.5rem', flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1a1a1a', fontFamily: 'var(--font-heading)' }}>{displayName}</h1>
                  <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>@{profile.username}</p>
                </div>
              </div>
              {profile.bio && (
                <div style={{ marginTop: '1.5rem', background: '#fef9f3', borderLeft: '4px solid var(--color-secondary)', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: '#4a4a4a', lineHeight: 1.6, fontStyle: 'italic' }}>"{profile.bio}"</p>
                </div>
              )}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem', background: '#f5f5f5', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                  <MapPin size={16} color="var(--color-primary)" /> Localité: Manjo
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem', background: '#f5f5f5', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                  <Calendar size={16} color="var(--color-secondary)" /> Inscrit(e) en {new Date(profile.created_at).getFullYear()}
                </div>
              </div>
            </div>
          </div>

          <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)' }}>
            <ImageIcon size={24} /> Mur de Publications
          </h3>

          {/* Posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {posts.length === 0 ? (
              <div className="glass-card text-center" style={{ padding: '4rem 1rem', color: '#999' }}>
                <Info size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--color-primary)' }} />
                <p style={{ fontSize: '1.1rem' }}>Cet utilisateur n'a pas encore publié de contenu.</p>
              </div>
            ) : posts.map(post => {
              const myLike = post.post_likes?.find(l => l.user_id === session?.user?.id);
              const likeCount = post.post_likes?.length || 0;
              const commentCount = (post.post_comments || []).filter(c => !c.parent_id).length;
              const isCommentsOpen = activeCommentPostId === post.id;

              return (
                <div key={post.id} className="glass-card" style={{ padding: '1rem', borderRadius: '16px' }}>
                  {/* Post header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <Link to={`/profile/${post.user_id}`}>
                      <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'U')}&background=random`} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                    </Link>
                    <div>
                      <Link to={`/profile/${post.user_id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontWeight: '700', color: '#050505' }}>{post.profiles?.full_name || post.profiles?.username}</div>
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: '#65676b' }}>{timeAgo(post.created_at)}</div>
                    </div>
                  </div>

                  {/* Contenu */}
                  {post.content && <p style={{ margin: '0 0 0.75rem', color: '#050505', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.content}</p>}
                  {post.image_url && <div style={{ margin: '0 -1rem 0.75rem', background: '#f0f2f5' }}><img src={post.image_url} alt="Post" style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} /></div>}

                  {/* Compteurs */}
                  {(likeCount > 0 || commentCount > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #e4e6eb', fontSize: '0.85rem', color: '#65676b' }}>
                      {likeCount > 0 && (
                        <div
                          onClick={() => setReactionModal({ reactions: post.post_likes, title: 'Réactions' })}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                          title="Voir les réactions"
                        >
                          {Object.entries(groupReactions(post.post_likes)).sort((a,b) => b[1]-a[1]).slice(0,3).map(([type]) => {
                            const r = REACTIONS.find(x => x.type === type);
                            return r ? <span key={type} style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', zIndex: 1, marginLeft: '-4px' }}>{r.icon || r.emoji}</span> : null;
                          })}
                          <span style={{ marginLeft: '4px' }}>{likeCount}</span>
                          {Object.entries(groupReactions(post.post_likes)).sort((a,b) => b[1]-a[1]).slice(0,3).map(([type, count]) => {
                            const r = REACTIONS.find(x => x.type === type);
                            if (!r || count === 0) return null;
                            return <span key={type} style={{ fontSize: '0.78rem', color: '#65676b' }}>{r.label} ({count})</span>;
                          })}
                        </div>
                      )}
                      {commentCount > 0 && (
                        <span style={{ cursor: 'pointer', marginLeft: 'auto' }} onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}>
                          {commentCount} commentaire{commentCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Boutons d'action — même style que Feed */}
                  <div style={{ display: 'flex', borderBottom: isCommentsOpen ? '1px solid #e4e6eb' : 'none', padding: '0.2rem 0', margin: '0.3rem 0' }}>
                    <div style={{ flex: 1, position: 'relative' }}
                      onMouseEnter={() => showReactionPicker(post.id)}
                      onMouseLeave={() => hideReactionPicker(post.id)}
                    >
                      {reactionHoverPost === post.id && <ReactionPicker onReact={(type) => handleReactPost(post.id, type)} id={post.id} />}
                      <button
                        onClick={() => handleReactPost(post.id, myLike?.reaction_type || 'like')}
                        className="post-action-btn"
                        style={{ width: '100%', background: 'none', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', fontWeight: '600', transition: 'background 0.2s',
                          color: myLike ? (REACTIONS.find(r => r.type === myLike.reaction_type)?.color || '#2d4a22') : '#65676b' 
                        }}
                      >
                        {myLike ? (
                          <span style={{ fontSize: '1.1rem' }}>
                            {REACTIONS.find(r => r.type === myLike.reaction_type)?.icon || REACTIONS.find(r => r.type === myLike.reaction_type)?.emoji || '👍'}
                          </span>
                        ) : (
                          <ThumbsUp size={20} strokeWidth={2} />
                        )}
                        <span>
                          {myLike ? (REACTIONS.find(r => r.type === myLike.reaction_type)?.label || 'J\'aime') : 'J\'aime'}
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                      className="post-action-btn"
                      style={{ flex: 1, background: 'none', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', color: '#65676b', fontWeight: '600', transition: 'background 0.2s' }}
                    >
                      <MessageSquare size={20} />
                      <span>Commenter {commentCount > 0 && `(${commentCount})`}</span>
                    </button>

                    <button
                      onClick={() => { setShareModal(post); setShareText(''); }}
                      className="post-action-btn"
                      style={{ flex: 1, background: 'none', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', color: '#65676b', fontWeight: '600', transition: 'background 0.2s' }}
                    >
                      <Send size={20} />
                      <span>Partager</span>
                    </button>
                  </div>

                  {/* Section commentaires — même style que Feed */}
                  {isCommentsOpen && (
                    <div style={{ paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                        {(post.post_comments || []).filter(c => !c.parent_id).map(comment => (
                          <div key={comment.id} style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link to={`/profile/${comment.user_id}`} style={{ textDecoration: 'none' }}>
                              <img src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.username || 'U')}`} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            </Link>
                            <div style={{ flex: 1 }}>
                              <div style={{ background: '#f0f2f5', padding: '0.5rem 0.8rem', borderRadius: '18px', display: 'inline-block', maxWidth: '100%' }}>
                                <Link to={`/profile/${comment.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <span style={{ fontWeight: '600', fontSize: '0.85rem', display: 'block', color: 'black' }}>{comment.profiles?.full_name || comment.profiles?.username}</span>
                                </Link>
                                <span style={{ fontSize: '0.9rem', color: '#050505' }}>{comment.content}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#8a8d91', paddingLeft: '8px', marginTop: '2px' }}>{timeAgo(comment.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {session ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <img src={myProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(myProfile?.full_name || 'Moi')}`} alt="Moi" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                          <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ flex: 1, display: 'flex', background: '#f0f2f5', borderRadius: '20px', padding: '0.2rem 0.5rem' }}>
                            <input
                              type="text"
                              placeholder="Écrire un commentaire public..."
                              value={commentText[post.id] || ''}
                              onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                              style={{ flex: 1, padding: '0.5rem', border: 'none', background: 'transparent', fontSize: '0.95rem', outline: 'none', color: '#050505' }}
                            />
                            <button type="submit" disabled={!commentText[post.id]?.trim()} style={{ background: 'none', border: 'none', color: commentText[post.id]?.trim() ? 'var(--color-primary)' : '#bcc0c4', cursor: commentText[post.id]?.trim() ? 'pointer' : 'default', padding: '0 0.5rem', display: 'flex', alignItems: 'center' }}>
                              <Send size={18} />
                            </button>
                          </form>
                        </div>
                      ) : (
                        <p style={{ color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>
                          <Link to="/auth" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Connectez-vous</Link> pour commenter.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modale partage — même design que Feed */}
      {shareModal && (
        <div onClick={() => { setShareModal(null); setShareText(''); }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e4e6eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#050505' }}>Partager la publication</h3>
              <button onClick={() => { setShareModal(null); setShareText(''); }} style={{ background: '#f0f2f5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Aperçu */}
            <div style={{ margin: '1rem 1.5rem', border: '1px solid #e4e6eb', borderRadius: '12px', padding: '1rem', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <img src={shareModal.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(shareModal.profiles?.full_name || 'U')}`} alt="Author" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#050505' }}>{shareModal.profiles?.full_name || shareModal.profiles?.username}</div>
                  <div style={{ fontSize: '0.75rem', color: '#65676b' }}>{timeAgo(shareModal.created_at)}</div>
                </div>
              </div>
              {shareModal.content && <p style={{ fontSize: '0.9rem', color: '#1c1e21', margin: '0 0 0.5rem 0', whiteSpace: 'pre-wrap' }}>{shareModal.content.slice(0, 150)}{shareModal.content.length > 150 ? '...' : ''}</p>}
              {shareModal.image_url && <img src={shareModal.image_url} alt="Preview" style={{ width: '100%', borderRadius: '8px', maxHeight: '180px', objectFit: 'cover' }} />}
            </div>

            <div style={{ padding: '0 1.5rem 1rem' }}>
              {session && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <img src={myProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(myProfile?.full_name || 'Moi')}`} alt="Me" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <textarea
                      placeholder="Ajouter quelque chose..."
                      value={shareText}
                      onChange={e => setShareText(e.target.value)}
                      style={{ flex: 1, padding: '0.6rem', border: '1px solid #e4e6eb', borderRadius: '8px', fontSize: '0.95rem', resize: 'none', outline: 'none', fontFamily: 'inherit', color: '#050505', minHeight: '60px' }}
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={handleShareToFeed}
                    disabled={sharing}
                    style={{ width: '100%', padding: '0.65rem', background: sharing ? '#bcc0c4' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.95rem', cursor: sharing ? 'not-allowed' : 'pointer', marginBottom: '0.75rem' }}
                  >
                    {sharing ? 'Partage en cours...' : '📢 Partager sur votre fil'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e4e6eb' }} />
                <span style={{ fontSize: '0.8rem', color: '#65676b' }}>ou</span>
                <div style={{ flex: 1, height: '1px', background: '#e4e6eb' }} />
              </div>

              <button
                onClick={() => handleCopyLink(shareModal)}
                style={{ width: '100%', padding: '0.65rem', background: '#f0f2f5', color: '#050505', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                🔗 Copier le lien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale liste des réactions */}
      {reactionModal && (
        <div onClick={() => setReactionModal(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '420px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e4e6eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#050505' }}>Réactions ({reactionModal.reactions.length})</h3>
              <button onClick={() => setReactionModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            
            {/* Tabs par type */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e4e6eb', overflowX: 'auto' }}>
              <button onClick={() => setReactionModal(prev => ({ ...prev, filter: null }))} style={{ padding: '0.7rem 1rem', border: 'none', borderBottom: `2px solid ${!reactionModal.filter ? '#2d4a22' : 'transparent'}`, background: 'none', cursor: 'pointer', fontWeight: '600', color: !reactionModal.filter ? '#2d4a22' : '#65676b', fontSize: '0.9rem', flexShrink: 0 }}>
                Tout ({reactionModal.reactions.length})
              </button>
              {Object.entries(groupReactions(reactionModal.reactions)).sort((a,b) => b[1]-a[1]).map(([type, count]) => {
                const r = REACTIONS.find(x => x.type === type);
                if (!r) return null;
                return (
                  <button key={type} onClick={() => setReactionModal(prev => ({ ...prev, filter: type }))} style={{ padding: '0.7rem 1rem', border: 'none', borderBottom: `2px solid ${reactionModal.filter === type ? r.color : 'transparent'}`, background: 'none', cursor: 'pointer', fontWeight: '600', color: reactionModal.filter === type ? r.color : '#65676b', fontSize: '0.9rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {r.icon || r.emoji} {count}
                  </button>
                );
              })}
            </div>

            {/* Liste des réagisseurs */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
              {(reactionModal.filter ? reactionModal.reactions.filter(r => r.reaction_type === reactionModal.filter) : reactionModal.reactions).map((reaction, i) => {
                const r = REACTIONS.find(x => x.type === (reaction.reaction_type || 'like')) || REACTIONS[0];
                const name = reaction.profiles?.full_name || reaction.profiles?.username || reaction.user_id?.slice(0,8) || '...';
                const avatar = reaction.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40&background=2d4a22&color=fff`;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.5rem' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={avatar} alt={name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: '0.85rem', background: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{r.icon || r.emoji}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#050505' }}>{name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#65676b' }}>{r.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
