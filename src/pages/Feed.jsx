import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';
import { Image as ImageIcon, Send, Clock, PlusCircle, Heart, ThumbsUp, MessageSquare, X, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ConfirmDialog from '../components/ConfirmDialog';

const BACKGROUNDS = [
  // 7 Solid
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#a855f7', '#ec4899',
  // 7 Gradients
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #ff9a9e, #fecfef)',
  'linear-gradient(135deg, #fbc2eb, #a6c1ee)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #ff0844, #ffb199)',
  // 7 New Gen
  'radial-gradient(circle at 50% 50%, #2b1055, #7597de)',
  'linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)',
  'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
  'radial-gradient(circle at top right, #38ef7d, #11998e)',
  'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)',
  'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  // 1 Gamer
  'linear-gradient(45deg, #ff0000, #000000, #0000ff)',
  // 1 Dev
  '#282a36'
];

const Feed = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [postUploadProgress, setPostUploadProgress] = useState(0);
  const [postUploadStatus, setPostUploadStatus] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Interactions state
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [statusReply, setStatusReply] = useState('');
  const [reactionHoverPost, setReactionHoverPost] = useState(null);
  const [reactionHoverComment, setReactionHoverComment] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [reactionModal, setReactionModal] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [shareModal, setShareModal] = useState(null);
  const [shareText, setShareText] = useState('');
  const [sharing, setSharing] = useState(false);
  // Story viewer : { userId, storyIndex }
  const [storyViewer, setStoryViewer] = useState(null);
  const reactionTimerPost = useRef({});
  const reactionTimerComment = useRef({});

  const showReactionPicker = (id, type) => {
    if (type === 'post') {
      clearTimeout(reactionTimerPost.current[id]);
      setReactionHoverPost(id);
    } else {
      clearTimeout(reactionTimerComment.current[id]);
      setReactionHoverComment(id);
    }
  };

  const hideReactionPicker = (id, type) => {
    if (type === 'post') {
      reactionTimerPost.current[id] = setTimeout(() => setReactionHoverPost(prev => prev === id ? null : prev), 300);
    } else {
      reactionTimerComment.current[id] = setTimeout(() => setReactionHoverComment(prev => prev === id ? null : prev), 300);
    }
  };

  const REACTIONS = [
    { type: 'like',  icon: <ThumbsUp size={18} fill="#2d4a22" strokeWidth={2} color="#2d4a22" />, emoji: '👍', label: 'J\'aime', color: '#2d4a22' },
    { type: 'love',  icon: <Heart size={18} fill="#f33e58" color="#f33e58" />, emoji: '❤️', label: 'J\'adore', color: '#f33e58' },
    { type: 'haha',  emoji: '😂', label: 'Haha',    color: '#f7b928' },
    { type: 'wow',   emoji: '😲', label: 'Wouaou',  color: '#f7b928' },
    { type: 'crazy', emoji: '🤪', label: 'Zinzin',  color: '#a855f7' },
  ];
  
  // Status creation state
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusMedia, setStatusMedia] = useState(null);
  const [creatingStatus, setCreatingStatus] = useState(false);
  const [storyUploadProgress, setStoryUploadProgress] = useState(0);
  const [storyUploadStatus, setStoryUploadStatus] = useState('');
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showConfirm = (config) => new Promise(resolve => {
    setConfirmDialog({ ...config, onConfirm: () => { setConfirmDialog(null); resolve(true); }, onCancel: () => { setConfirmDialog(null); resolve(false); } });
  });

  // Grouper les stories par utilisateur
  const storiesByUser = React.useMemo(() => {
    const map = {};
    statuses.forEach(s => {
      const uid = s.user_id || s.profiles?.id;
      if (!map[uid]) map[uid] = { profile: s.profiles, stories: [] };
      map[uid].stories.push(s);
    });
    // Trier les stories de chaque user par date
    Object.values(map).forEach(u => u.stories.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    return Object.values(map);
  }, [statuses]);

  // Navigation dans les stories d'un user
  const currentUserStories = storyViewer ? storiesByUser.find(u => u.stories[0]?.user_id === storyViewer.userId || u.stories[0]?.profiles?.id === storyViewer.userId) : null;
  const currentStory = currentUserStories?.stories[storyViewer?.storyIndex ?? 0] ?? null;

  const openStoryViewer = (userId) => {
    setStoryViewer({ userId, storyIndex: 0 });
  };

  const goNextStory = React.useCallback((e) => {
    e?.stopPropagation();
    if (!storyViewer || !currentUserStories) return;
    const nextIdx = storyViewer.storyIndex + 1;
    if (nextIdx < currentUserStories.stories.length) {
      setStoryViewer(prev => ({ ...prev, storyIndex: nextIdx }));
    } else {
      // Passer à l'utilisateur suivant
      const userIdx = storiesByUser.findIndex(u => (u.stories[0]?.user_id || u.stories[0]?.profiles?.id) === storyViewer.userId);
      if (userIdx >= 0 && userIdx < storiesByUser.length - 1) {
        const nextUser = storiesByUser[userIdx + 1];
        setStoryViewer({ userId: nextUser.stories[0]?.user_id || nextUser.stories[0]?.profiles?.id, storyIndex: 0 });
      } else {
        setStoryViewer(null);
      }
    }
  }, [storyViewer, currentUserStories, storiesByUser]);

  const goPrevStory = React.useCallback((e) => {
    e?.stopPropagation();
    if (!storyViewer) return;
    const prevIdx = storyViewer.storyIndex - 1;
    if (prevIdx >= 0) {
      setStoryViewer(prev => ({ ...prev, storyIndex: prevIdx }));
    } else {
      const userIdx = storiesByUser.findIndex(u => (u.stories[0]?.user_id || u.stories[0]?.profiles?.id) === storyViewer.userId);
      if (userIdx > 0) {
        const prevUser = storiesByUser[userIdx - 1];
        setStoryViewer({ userId: prevUser.stories[0]?.user_id || prevUser.stories[0]?.profiles?.id, storyIndex: prevUser.stories.length - 1 });
      }
    }
  }, [storyViewer, storiesByUser]);

  // Compat ancienne logique
  const viewingStatus = currentStory;
  const setViewingStatus = (s) => { if (!s) setStoryViewer(null); };
  const currentStatusIndex = storyViewer?.storyIndex ?? 0;
  const handlePrevStatus = goPrevStory;
  const handleNextStatus = goNextStory;

  // Auto-avancement des stories (5 secondes par story)
  useEffect(() => {
    if (!storyViewer) return;
    const timer = setTimeout(() => { goNextStory(); }, 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyViewer?.userId, storyViewer?.storyIndex]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        deleteExpiredStatuses(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      }
    });

    fetchPosts();
    fetchStatuses();

    // Subscribe to real-time changes
    const postsSubscription = supabase
      .channel('public:posts_and_interactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, payload => {
        fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, payload => {
        fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, payload => {
        fetchStatuses();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_likes' }, payload => {
        fetchStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
    };
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const fetchPosts = async () => {
    try {
      let { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles ( username, full_name, avatar_url ),
          post_likes ( user_id, reaction_type, profiles ( username, full_name, avatar_url ) ),
          post_comments ( id, content, created_at, user_id, parent_id, profiles ( username, full_name, avatar_url ), comment_reactions ( user_id, reaction_type ) ),
          shared_post:shared_from_post_id ( id, content, image_url, created_at, profiles ( username, full_name, avatar_url ) )
        `)
        .order('created_at', { ascending: false });
      
      // Fallback 2 : sans shared_post
      if (error) {
        ({ data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles ( username, full_name, avatar_url ),
            post_likes ( user_id, reaction_type, profiles ( username, full_name, avatar_url ) ),
            post_comments ( id, content, created_at, user_id, parent_id, profiles ( username, full_name, avatar_url ), comment_reactions ( user_id, reaction_type ) )
          `)
          .order('created_at', { ascending: false }));
      }

      // Fallback 3 : sans parent_id
      if (error) {
        ({ data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles ( username, full_name, avatar_url ),
            post_likes ( user_id, reaction_type, profiles ( username, full_name, avatar_url ) ),
            post_comments ( id, content, created_at, user_id, profiles ( username, full_name, avatar_url ) )
          `)
          .order('created_at', { ascending: false }));
      }

      // Fallback 4 : ultra-minimal
      if (error) {
        ({ data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles ( username, full_name, avatar_url ),
            post_likes ( user_id ),
            post_comments ( id, content, created_at, user_id, profiles ( username, full_name, avatar_url ) )
          `)
          .order('created_at', { ascending: false }));
      }

      if (error) {
        console.error("Erreur lors du chargement des publications:", error);
      } else if (data) {
        setPosts(data);
      }
    } catch (err) {
      console.error("Exception lors du chargement des publications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    const { data, error } = await supabase
      .from('statuses')
      .select(`
        *,
        profiles ( id, username, full_name, avatar_url ),
        status_likes ( user_id )
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Filtre côté client : garder les stories sans expires_at (pas de limite) ou pas encore expirées
      const now = new Date().toISOString();
      const active = data.filter(s => !s.expires_at || s.expires_at > now);
      setStatuses(active);
      setViewingStatus(current => {
        if (!current) return null;
        const updatedStatus = active.find(s => s.id === current.id);
        return updatedStatus || current;
      });
    } else if (error) {
      console.error('Erreur fetchStatuses:', error.message);
    }
  };

  const deleteExpiredStatuses = async (userId) => {
    const { data: expired } = await supabase
      .from('statuses')
      .select('*')
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());

    if (expired && expired.length > 0) {
      for (const st of expired) {
        if (st.image_url) {
          const pathMatch = st.image_url.match(/manjo-images\/(statuses\/.*)/);
          if (pathMatch) await supabase.storage.from('manjo-images').remove([pathMatch[1]]);
        }
        await supabase.from('statuses').delete().eq('id', st.id);
      }
    }
  };

  const handleCreatePost = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!newPost.trim() && !postImage) return;
    setPublishing(true);
    setPostUploadProgress(0);
    setPostUploadStatus('');

    let imageUrl = null;
    if (postImage) {
      let file = postImage;
      
      if (file.size > 3 * 1024 * 1024) {
        alert("⚠️ Votre image dépasse 3 Mo. Elle va être compressée pour économiser de l'espace (max 2 Mo), ce qui peut réduire légèrement sa qualité.");
        setPostUploadStatus('Compression en cours...');
        const options = { maxSizeMB: 2, useWebWorker: true, onProgress: (p) => setPostUploadProgress(Math.floor(p / 2)) };
        file = await imageCompression(file, options);
      }

      setPostUploadProgress(postUploadProgress > 0 ? 50 : 1);
      setPostUploadStatus('Envoi au serveur...');
      
      const progressInterval = setInterval(() => {
        setPostUploadProgress(prev => {
          const next = prev + 10;
          return next > 95 ? 95 : next;
        });
      }, 150);

      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `posts/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('manjo-images')
        .upload(filePath, file);
        
      clearInterval(progressInterval);

      if (!uploadError) {
        setPostUploadProgress(100);
        setPostUploadStatus('Terminé !');
        const { data } = supabase.storage.from('manjo-images').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
        
        // Pause pour laisser l'utilisateur voir "100% Terminé !"
        await new Promise(r => setTimeout(r, 700));
      } else {
        setPostUploadProgress(0);
        setPostUploadStatus('');
      }
    }

    const { error } = await supabase.from('posts').insert([
      { user_id: session.user.id, content: newPost, image_url: imageUrl }
    ]);

    if (!error) {
      setNewPost('');
      setPostImage(null);
      setShowCreatePost(false);
      await fetchPosts();
    } else {
      console.error("Erreur lors de la publication :", error);
      alert("Une erreur s'est produite lors de la publication.");
    }
    setPublishing(false);
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    if (!statusText.trim() && !statusMedia) return;
    setCreatingStatus(true);
    setStoryUploadProgress(0);
    setStoryUploadStatus('');

    let mediaUrl = null;
    if (statusMedia) {
      let file = statusMedia;

      if (file.size > 3 * 1024 * 1024) {
        alert("⚠️ Votre fichier dépasse 3 Mo. Il va être compressé (max 2 Mo), ce qui peut réduire légèrement sa qualité.");
        setStoryUploadStatus('Compression en cours...');
        const options = { maxSizeMB: 2, useWebWorker: true, onProgress: (p) => setStoryUploadProgress(Math.floor(p / 2)) };
        file = await imageCompression(file, options);
      }

      setStoryUploadProgress(storyUploadProgress > 0 ? 50 : 1);
      setStoryUploadStatus('Envoi au serveur...');
      
      const progressInterval = setInterval(() => {
        setStoryUploadProgress(prev => {
          const next = prev + 10;
          return next > 95 ? 95 : next;
        });
      }, 150);

      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `statuses/${session.user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('manjo-images')
        .upload(fileName, file, { upsert: true });
        
      clearInterval(progressInterval);

      if (uploadError) {
        setStoryUploadProgress(0);
        setStoryUploadStatus('');
        console.error('Erreur upload story:', uploadError);
        alert('Impossible d\'uploader le média. Vérifiez que le bucket "manjo-images" existe dans Supabase Storage.');
        setCreatingStatus(false);
        return;
      }

      setStoryUploadProgress(100);
      setStoryUploadStatus('Terminé !');
      const { data: urlData } = supabase.storage.from('manjo-images').getPublicUrl(fileName);
      mediaUrl = urlData.publicUrl;
      
      // Pause pour laisser l'utilisateur voir "100% Terminé !"
      await new Promise(r => setTimeout(r, 700));
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Essai complet avec toutes les colonnes
    let { error } = await supabase.from('statuses').insert([{
      user_id: session.user.id,
      content: statusText || null,
      image_url: mediaUrl,
      bg_color: selectedBg,
      expires_at: expiresAt
    }]);

    // Fallback sans bg_color si la colonne n'existe pas encore
    if (error && error.code === 'PGRST204' && error.message.includes('bg_color')) {
      ({ error } = await supabase.from('statuses').insert([{
        user_id: session.user.id,
        content: statusText || null,
        image_url: mediaUrl,
        expires_at: expiresAt
      }]));
    }

    // Fallback ultra-minimal (sans expires_at non plus)
    if (error && error.code === 'PGRST204') {
      ({ error } = await supabase.from('statuses').insert([{
        user_id: session.user.id,
        content: statusText || null,
        image_url: mediaUrl,
      }]));
    }

    if (!error) {
      setShowCreateStatus(false);
      setStatusText('');
      setStatusMedia(null);
      setSelectedBg(BACKGROUNDS[0]);
      fetchStatuses();
    } else {
      console.error('Erreur publication story:', error);
      alert(`Erreur : ${error.message}`);
    }
    setCreatingStatus(false);
  };

  const handleDeleteStatus = async (statusId) => {
    const ok = await showConfirm({ title: 'Supprimer la story ?', message: 'Cette action est irréversible. La story sera définitivement supprimée.', confirmLabel: 'Oui, supprimer', type: 'danger' });
    if (!ok) return;
    const statusToDelete = statuses.find(s => s.id === statusId);
    if (statusToDelete && statusToDelete.image_url) {
        const pathMatch = statusToDelete.image_url.match(/manjo-images\/(statuses\/.*)/);
        if (pathMatch) await supabase.storage.from('manjo-images').remove([pathMatch[1]]);
    }
    await supabase.from('statuses').delete().match({ id: statusId, user_id: session.user.id });
    setViewingStatus(null);
    fetchStatuses();
  };

  const handleReactPost = async (postId, reactionType) => {
    if (!session) return;
    setReactionHoverPost(null);
    const existing = (posts.find(p => p.id === postId)?.post_likes || []).find(l => l.user_id === session.user.id);
    if (existing) {
      if (existing.reaction_type === reactionType) {
        await supabase.from('post_likes').delete().match({ post_id: postId, user_id: session.user.id });
      } else {
        await supabase.from('post_likes').update({ reaction_type: reactionType }).match({ post_id: postId, user_id: session.user.id });
      }
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: session.user.id, reaction_type: reactionType });
    }
    fetchPosts();
  };

  const handleReactComment = async (commentId, reactionType) => {
    if (!session) return;
    setReactionHoverComment(null);
    // Chercher dans les données locales d'abord (pour eviter un appel DB si table inexistante)
    let existingReaction = null;
    for (const p of posts) {
      const c = (p.post_comments || []).find(c => c.id === commentId);
      if (c) {
        existingReaction = (c.comment_reactions || []).find(r => r.user_id === session.user.id);
        break;
      }
    }

    try {
      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          await supabase.from('comment_reactions').delete().match({ comment_id: commentId, user_id: session.user.id });
        } else {
          await supabase.from('comment_reactions').update({ reaction_type: reactionType }).match({ comment_id: commentId, user_id: session.user.id });
        }
      } else {
        await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: session.user.id, reaction_type: reactionType });
      }
    } catch (e) {
      console.warn('comment_reactions table may not exist yet. Run advanced_social_features.sql first.', e);
    }
    fetchPosts();
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!session || !commentText[postId]?.trim()) return;
    
    await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      content: commentText[postId]
    });
    
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    fetchPosts();
  };

  const handleReplySubmit = async (e, postId, parentId) => {
    e.preventDefault();
    const key = `reply_${parentId}`;
    if (!session || !replyText[key]?.trim()) return;
    
    await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      content: replyText[key],
      parent_id: parentId
    });
    
    setReplyText(prev => ({ ...prev, [key]: '' }));
    setReplyingTo(null);
    fetchPosts();
  };

  // Helper: calcule les réactions groupées d'une liste de likes/réactions
  const groupReactions = (reactions) => {
    const counts = {};
    (reactions || []).forEach(r => {
      const t = r.reaction_type || 'like';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  };

  // Composant inline ReactionPicker
  const ReactionPicker = ({ onReact, id, pickerType }) => (
    <div
      onMouseEnter={() => showReactionPicker(id, pickerType)}
      onMouseLeave={() => hideReactionPicker(id, pickerType)}
      style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        background: 'white', borderRadius: '40px', padding: '8px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', gap: '8px',
        zIndex: 100, marginBottom: '0px', border: '1px solid #e4e6eb',
        animation: 'fadeInUp 0.15s ease',
        paddingBottom: '16px', /* Comble le gap pour que la souris ne quitte pas le composant */
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

  const handleLikeStatus = async (statusId, hasLiked) => {
    if (!session) return;
    if (hasLiked) {
      await supabase.from('status_likes').delete().match({ status_id: statusId, user_id: session.user.id });
    } else {
      await supabase.from('status_likes').insert({ status_id: statusId, user_id: session.user.id });
    }
    fetchStatuses();
  };

  const handleReplyStatus = async (e) => {
    e.preventDefault();
    if (!session || !viewingStatus || !statusReply.trim()) return;
    
    await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: viewingStatus.user_id,
      content: `[Réponse au Statut] ${statusReply}`,
      status_id: viewingStatus.id
    });
    
    setStatusReply('');
    setViewingStatus(null);
  };

  const handleShareToFeed = async () => {
    if (!session || !shareModal) return;
    setSharing(true);
    const { error } = await supabase.from('posts').insert({
      user_id: session.user.id,
      content: shareText.trim() || null,
      shared_from_post_id: shareModal.id
    });
    if (!error) {
      setShareModal(null);
      setShareText('');
      fetchPosts();
    }
    setSharing(false);
  };

  const handleCopyLink = async (post) => {
    const baseUrl = window.location.origin;
    const copyText = `${baseUrl}/profile/${post.user_id}`;
    
    // Essayer l'API de partage native en premier (très utile sur mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Profil de ' + (post.profiles?.full_name || post.profiles?.username || 'Utilisateur'),
          url: copyText
        });
        return; // Partage réussi
      } catch (err) {
        console.log("Partage annulé ou erreur:", err);
      }
    }

    // Fallback de copie
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copyText);
        alert(`🔗 Lien copié :\n${copyText}`);
      } else {
        const el = document.createElement('textarea');
        el.value = copyText;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        el.style.top = '-9999px';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert(`🔗 Lien copié :\n${copyText}`);
      }
    } catch (err) {
      alert(`Veuillez copier ce lien manuellement :\n${copyText}`);
    }
  };

  const handleNativeShare = (post) => {
    // Toujours ouvrir le modal de partage (navigator.share ne marche qu'en HTTPS)
    setShareModal(post);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    // Si la date a déjà un fuseau horaire (Z ou +HH:MM), on parse directement
    // Sinon on ajoute Z pour forcer l'interprétation UTC (format Supabase cloud)
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
    const date = new Date(hasTimezone ? dateStr : dateStr + 'Z');
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const seconds = Math.max(0, Math.floor((now - date) / 1000));

    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} sem`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mois`;
    return `${Math.floor(months / 12)} an`;
  };


  
  return (
    <div className="main-content-wrapper" style={{ paddingBottom: '2rem' }}>
      <div className="feed-layout">
        
        {/* LEFT SIDEBAR (PC) */}
        <LeftSidebar />

        {/* MAIN FEED (CENTER) */}
        <div className="feed-main">
          
          {/* ── STATUS / STORIES SECTION ── Style Facebook */}
          <div style={{
            display: 'flex', gap: '0.6rem', overflowX: 'auto', padding: '0 0 1rem 0',
            marginBottom: '1rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
          }}>

            {/* Carte : Créer une story */}
            {session && (
              <div
                onClick={() => setShowCreateStatus(true)}
                style={{
                  flex: '0 0 auto', width: '110px', height: '185px', borderRadius: '14px',
                  overflow: 'hidden', position: 'relative', cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid #e4e6eb',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                {/* Zone image du haut */}
                <div style={{ flex: 1, background: '#f0f2f5', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=2d4a22&color=fff&size=110`}
                    alt="Mon profil"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85)' }}
                  />
                </div>
                {/* Bouton + */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'var(--color-primary)', borderRadius: '50%',
                  width: '34px', height: '34px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: '3px solid white', color: 'white',
                  fontSize: '1.3rem', fontWeight: '700', lineHeight: 1
                }}>+</div>
                {/* Label du bas */}
                <div style={{
                  background: 'white', padding: '0.5rem 0.4rem 0.6rem',
                  textAlign: 'center', fontSize: '0.72rem', fontWeight: '700',
                  color: '#050505', borderTop: '1px solid #e4e6eb'
                }}>
                  Créer une story
                </div>
              </div>
            )}

            {/* Cartes des stories — UNE carte par utilisateur */}
            {storiesByUser.map(userGroup => {
              const lastStory = userGroup.stories[userGroup.stories.length - 1];
              const count = userGroup.stories.length;
              const userId = lastStory.user_id || lastStory.profiles?.id;
              const bgStyle = lastStory.image_url
                ? { backgroundImage: `url(${lastStory.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: lastStory.bg_color || 'linear-gradient(135deg, var(--color-primary), #f5d08a)' };

              return (
                <div
                  key={userId}
                  onClick={() => openStoryViewer(userId)}
                  style={{
                    flex: '0 0 auto', width: '110px', height: '185px', borderRadius: '14px',
                    overflow: 'hidden', position: 'relative', cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                    ...bgStyle,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  {/* Overlay gradient */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)',
                    pointerEvents: 'none'
                  }} />

                  {/* Avatar en haut + badge nombre de stories */}
                  <div style={{ padding: '0.5rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={userGroup.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userGroup.profile?.full_name || 'U')}&size=40`}
                        alt={userGroup.profile?.username}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', display: 'block' }}
                      />
                      {count > 1 && (
                        <div style={{
                          position: 'absolute', top: -4, right: -4, background: '#2d4a22',
                          color: 'white', borderRadius: '50%', width: '16px', height: '16px',
                          fontSize: '0.6rem', fontWeight: '700', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', border: '1.5px solid white'
                        }}>{count}</div>
                      )}
                    </div>
                  </div>

                  {/* Texte si pas d'image */}
                  {!lastStory.image_url && lastStory.content && (
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', padding: '0 0.5rem', textAlign: 'center', zIndex: 1 }}>
                      <span style={{ color: 'white', fontSize: '0.82rem', fontWeight: '700', textShadow: '0 1px 4px rgba(0,0,0,0.5)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lastStory.content}</span>
                    </div>
                  )}

                  {/* Nom en bas */}
                  <div style={{ padding: '0 0.5rem 0.55rem', position: 'relative', zIndex: 1 }}>
                    <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: '700', textShadow: '0 1px 3px rgba(0,0,0,0.7)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {userGroup.profile?.full_name || userGroup.profile?.username}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>



        {/* ── MAIN FEED ── */}
          {/* Create Post — Déclencheur compact */}
          {session ? (
            <div
              onClick={() => setShowCreatePost(true)}
              style={{
                marginBottom: '1.5rem', padding: '0.85rem 1.1rem',
                borderRadius: '12px', background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                cursor: 'pointer', border: '1px solid #e4e6eb',
                transition: 'box-shadow 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'}
            >
              <img
                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=2d4a22&color=fff`}
                alt="Avatar"
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ flex: 1, color: '#8a8d91', fontSize: '1rem', fontWeight: '400', userSelect: 'none' }}>
                Quoi de neuf, {profile?.full_name?.split(' ')[0] || profile?.username} ?
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ background: '#e7f3ff', color: '#2d4a22', padding: '0.35rem 0.7rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ImageIcon size={15} /> Photo
                </span>
              </div>
            </div>
          ) : (
            <div className="glass-card text-center" style={{ marginBottom: '2rem', padding: '2rem' }}>
              <h3>Connectez-vous pour participer</h3>
              <p style={{ color: 'var(--color-text-light)', marginBottom: '1rem' }}>Rejoignez la discussion avec la communauté de Manjo.</p>
              <Link to="/auth" className="btn btn-primary">Se Connecter / S'inscrire</Link>
            </div>
          )}

          {/* ── MODAL DE CRÉATION DE PUBLICATION ── */}
          {showCreatePost && (
            <>
              {/* Overlay */}
              <div
                onClick={() => { setShowCreatePost(false); setNewPost(''); setPostImage(null); }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, backdropFilter: 'blur(2px)' }}
              />
              {/* Modal */}
              <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '520px',
                background: 'white', borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                zIndex: 2001, overflow: 'hidden',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              }}>
                {/* Header */}
                <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid #e4e6eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#050505' }}>Créer une publication</h3>
                  <button
                    onClick={() => { setShowCreatePost(false); setNewPost(''); setPostImage(null); }}
                    style={{ background: '#e4e6eb', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505', flexShrink: 0 }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Author row */}
                <div style={{ padding: '1rem 1.4rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=2d4a22&color=fff`}
                    alt="Avatar"
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#050505' }}>{profile?.full_name || profile?.username}</div>
                    <div style={{ fontSize: '0.78rem', color: '#65676b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                      <span style={{ background: '#e4e6eb', padding: '1px 8px', borderRadius: '4px' }}>🌍 Public</span>
                    </div>
                  </div>
                </div>

                {/* Body — scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.4rem' }}>
                  <textarea
                    autoFocus
                    placeholder={`Quoi de neuf, ${profile?.full_name?.split(' ')[0] || profile?.username} ?`}
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    style={{
                      width: '100%', minHeight: postImage ? '80px' : '140px',
                      border: 'none', outline: 'none', resize: 'none',
                      fontSize: newPost.length > 80 ? '1rem' : '1.4rem',
                      color: '#050505', background: 'transparent',
                      fontFamily: 'inherit', lineHeight: '1.5',
                      transition: 'font-size 0.2s ease',
                    }}
                  />

                  {/* Image preview */}
                  {postImage && (
                    <div style={{ position: 'relative', marginTop: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e4e6eb', background: '#f0f2f5' }}>
                      <img
                        src={URL.createObjectURL(postImage)}
                        alt="Aperçu"
                        style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                      />
                      <button
                        onClick={() => setPostImage(null)}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                      >
                        <X size={16} />
                      </button>
                      {/* Caption zone si image */}
                    </div>
                  )}
                </div>

                {/* Toolbar + Publish */}
                <div style={{ padding: '0.85rem 1.4rem', borderTop: '1px solid #e4e6eb' }}>
                  {/* Ajouter à votre publication */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', padding: '0.6rem 0.9rem', border: '1px solid #e4e6eb', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#050505' }}>Ajouter à votre publication</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label title="Photo / Vidéo" style={{ cursor: 'pointer', display: 'flex', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e7f3e8'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <ImageIcon size={26} color="#45bd62" />
                        <input type="file" accept="image/*,video/*" onChange={e => setPostImage(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>

                  {/* Barre de progression (Posts) */}
                  {postUploadProgress > 0 && (
                    <div style={{ width: '100%', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#65676b', marginBottom: '0.3rem' }}>
                        <span>{postUploadStatus}</span>
                        <span>{postUploadProgress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#e4e6eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--color-primary)', width: `${postUploadProgress}%`, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCreatePost}
                    disabled={publishing || (!newPost.trim() && !postImage)}
                    style={{
                      width: '100%', padding: '0.75rem',
                      background: (!newPost.trim() && !postImage) ? '#bcc0c4' : 'var(--color-primary)',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '1rem', fontWeight: '700', cursor: (!newPost.trim() && !postImage) ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {publishing ? 'Publication...' : 'Publier'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Posts List */}
          {loading ? (
            <div className="text-center" style={{ padding: '2rem', color: 'var(--color-text-light)' }}>Chargement...</div>
          ) : posts.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: '3rem' }}>
              <p style={{ color: 'var(--color-text-light)', fontWeight: '500' }}>Aucune publication.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {posts.map(post => (
                <div key={post.id} className="glass-card post-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Link to={`/profile/${post.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                      <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'U')}`} alt={post.profiles?.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>{post.profiles?.full_name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                          <span>@{post.profiles?.username}</span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12} /> {timeAgo(post.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Texte du partage (optionnel) */}
                  {post.content && <p style={{ whiteSpace: 'pre-wrap', marginBottom: post.image_url || post.shared_post ? '1rem' : '0' }}>{post.content}</p>}
                  
                  {/* Image directe */}
                  {post.image_url && (
                    <div style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', marginBottom: '1rem' }}>
                      <img src={post.image_url} alt="Post attachment" style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }} />
                    </div>
                  )}

                  {/* Post partagé — carte intégrée */}
                  {post.shared_post && (
                    <div style={{ border: '1px solid #e4e6eb', borderRadius: '12px', padding: '1rem', background: '#f9fafb', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <Link to={`/profile/${post.shared_post.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: 'inherit' }}>
                          <img
                            src={post.shared_post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.shared_post.profiles?.full_name || 'U')}`}
                            alt="Original author"
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#050505' }}>{post.shared_post.profiles?.full_name || post.shared_post.profiles?.username}</div>
                            <div style={{ fontSize: '0.75rem', color: '#65676b' }}>{timeAgo(post.shared_post.created_at)}</div>
                          </div>
                        </Link>
                      </div>
                      {post.shared_post.content && <p style={{ fontSize: '0.92rem', color: '#1c1e21', whiteSpace: 'pre-wrap', marginBottom: post.shared_post.image_url ? '0.5rem' : 0 }}>{post.shared_post.content}</p>}
                      {post.shared_post.image_url && (
                        <img src={post.shared_post.image_url} alt="Shared" style={{ width: '100%', borderRadius: '8px', maxHeight: '260px', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}

                  {/* Résumé des réactions sur la publication - clic pour voir détail */}
                  {post.post_likes?.length > 0 && (() => {
                    const grouped = groupReactions(post.post_likes);
                    const topReactions = Object.entries(grouped).sort((a,b) => b[1]-a[1]);
                    return (
                      <div
                        onClick={() => setReactionModal({ reactions: post.post_likes, title: 'Réactions' })}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0 8px 0', borderBottom: '1px solid #e4e6eb', cursor: 'pointer' }}
                        title="Voir les réactions"
                      >
                        {topReactions.slice(0,3).map(([type]) => {
                          const r = REACTIONS.find(x => x.type === type);
                          return r ? <span key={type} style={{ fontSize: '1rem', background: '#fff', border: '1px solid #e4e6eb', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{r.icon || r.emoji}</span> : null;
                        })}
                        <span style={{ fontSize: '0.85rem', color: '#65676b' }}>{post.post_likes.length}</span>
                        {topReactions.slice(0,3).map(([type, count]) => {
                          const r = REACTIONS.find(x => x.type === type);
                          if (!r || count === 0) return null;
                          return <span key={type} style={{ fontSize: '0.78rem', color: '#65676b' }}>{r.label} ({count})</span>;
                        })}
                      </div>
                    );
                  })()}

                  {/* Actions (Réactions, Commentaires) */}
                  <div style={{ display: 'flex', borderBottom: activeCommentPostId === post.id ? '1px solid #e4e6eb' : 'none', padding: '0.2rem 0', margin: '0.3rem 0' }}>
                    
                    {/* Bouton Réactions Post */}
                    <div style={{ flex: 1, position: 'relative' }}
                      onMouseEnter={() => showReactionPicker(post.id, 'post')}
                      onMouseLeave={() => hideReactionPicker(post.id, 'post')}
                    >
                      {reactionHoverPost === post.id && <ReactionPicker onReact={(type) => handleReactPost(post.id, type)} id={post.id} pickerType="post" />}
                      <button
                        onClick={() => handleReactPost(post.id, (post.post_likes?.find(l => l.user_id === session?.user?.id)?.reaction_type) || 'like')}
                        className="post-action-btn"
                        style={{ width: '100%', background: 'none', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', fontWeight: '600', transition: 'background 0.2s',
                          color: post.post_likes?.find(l => l.user_id === session?.user?.id)
                            ? (REACTIONS.find(r => r.type === post.post_likes.find(l => l.user_id === session?.user?.id)?.reaction_type)?.color || '#2d4a22')
                            : '#65676b'
                        }}
                      >
                        {post.post_likes?.find(l => l.user_id === session?.user?.id)
                          ? <span style={{ fontSize: '1.1rem' }}>{REACTIONS.find(r => r.type === post.post_likes.find(l => l.user_id === session?.user?.id)?.reaction_type)?.icon || REACTIONS.find(r => r.type === post.post_likes.find(l => l.user_id === session?.user?.id)?.reaction_type)?.emoji || '👍'}</span>
                          : <ThumbsUp size={20} strokeWidth={2} />
                        }
                        <span>{post.post_likes?.find(l => l.user_id === session?.user?.id)
                          ? (REACTIONS.find(r => r.type === post.post_likes.find(l => l.user_id === session?.user?.id)?.reaction_type)?.label || 'J\'aime')
                          : 'J\'aime'
                        }</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="post-action-btn"
                      style={{ flex: 1, background: 'none', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', color: '#65676b', fontWeight: '600', transition: 'background 0.2s' }}
                    >
                      <MessageSquare size={20} />
                      <span>Commenter {post.post_comments?.length > 0 && `(${post.post_comments.length})`}</span>
                    </button>
                    <button 
                      onClick={() => handleNativeShare(post)}
                      className="post-action-btn"
                      style={{ flex: 1, background: 'none', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', color: '#65676b', fontWeight: '600', transition: 'background 0.2s' }}
                    >
                      <Send size={20} />
                      <span>Partager</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {activeCommentPostId === post.id && (
                    <div style={{ paddingTop: '0.5rem' }}>
                      {/* List Comments (top-level only) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                        {(post.post_comments || []).filter(c => !c.parent_id).map(comment => (
                          <div key={comment.id}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Link to={`/profile/${comment.user_id}`} style={{ display: 'flex', textDecoration: 'none', color: 'inherit' }}>
                                <img src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.username || 'U')}`} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              </Link>
                              <div style={{ flex: 1 }}>
                                <div style={{ background: '#f0f2f5', padding: '0.5rem 0.8rem', borderRadius: '18px', display: 'inline-block', maxWidth: '100%' }}>
                                  <Link to={`/profile/${comment.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.85rem', display: 'block', color: 'black' }}>{comment.profiles?.full_name || comment.profiles?.username}</span>
                                  </Link>
                                  <span style={{ fontSize: '0.9rem', color: '#050505' }}>{comment.content}</span>
                                </div>
                                
                                {/* Actions sous le commentaire */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '2px 0 2px 8px', marginTop: '2px' }}>
                                  {/* Réaction commentaire avec toggle intelligent */}
                                  <div style={{ position: 'relative' }}
                                    onMouseEnter={() => showReactionPicker(comment.id, 'comment')}
                                    onMouseLeave={() => hideReactionPicker(comment.id, 'comment')}
                                  >
                                    {reactionHoverComment === comment.id && <ReactionPicker onReact={(type) => handleReactComment(comment.id, type)} id={comment.id} pickerType="comment" />}
                                    {(() => {
                                      const myCommentReaction = (comment.comment_reactions || []).find(r => r.user_id === session?.user?.id);
                                      const totalReactions = (comment.comment_reactions || []).length;
                                      const myR = myCommentReaction ? REACTIONS.find(x => x.type === myCommentReaction.reaction_type) : null;
                                      return (
                                        <button
                                          onClick={() => handleReactComment(comment.id, myCommentReaction?.reaction_type || 'like')}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700',
                                            color: myR ? myR.color : '#65676b', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        >
                                          <span>{myR ? (myR.icon || myR.emoji) : <ThumbsUp size={14} strokeWidth={2} />}</span>
                                          <span>{myR ? myR.label : 'J\'aime'}</span>
                                          {totalReactions > 0 && <span style={{ marginLeft: '2px', color: '#65676b', fontWeight: '400' }}>({totalReactions})</span>}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                  
                                  {/* Répondre */}
                                  {session && (
                                    <button
                                      onClick={() => setReplyingTo(replyingTo?.commentId === comment.id ? null : { commentId: comment.id, username: comment.profiles?.username })}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', color: '#65676b', padding: '2px 4px' }}
                                    >Répondre</button>
                                  )}
                                  <span style={{ fontSize: '0.75rem', color: '#65676b' }}>{timeAgo(comment.created_at)}</span>
                                </div>

                                {/* Zone de réponse */}
                                {replyingTo?.commentId === comment.id && (
                                  <form onSubmit={(e) => handleReplySubmit(e, post.id, comment.id)} style={{ display: 'flex', gap: '0.5rem', marginTop: '6px', alignItems: 'center' }}>
                                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}`} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', background: '#f0f2f5', borderRadius: '20px', padding: '0.2rem 0.5rem' }}>
                                      <input
                                        autoFocus
                                        type="text"
                                        placeholder={`Répondre à @${replyingTo.username}...`}
                                        value={replyText[`reply_${comment.id}`] || ''}
                                        onChange={(e) => setReplyText(prev => ({ ...prev, [`reply_${comment.id}`]: e.target.value }))}
                                        style={{ flex: 1, padding: '0.4rem', border: 'none', background: 'transparent', fontSize: '0.9rem', outline: 'none', color: '#050505' }}
                                      />
                                      <button type="submit" style={{ background: 'none', border: 'none', color: '#2d4a22', cursor: 'pointer', padding: '0 0.4rem', display: 'flex', alignItems: 'center' }}><Send size={16} /></button>
                                    </div>
                                  </form>
                                )}

                                {/* Réponses imbriquées avec toggle */}
                                {(() => {
                                  const replies = (post.post_comments || []).filter(r => r.parent_id === comment.id);
                                  if (replies.length === 0) return null;
                                  const isExpanded = !!expandedReplies[comment.id];
                                  return (
                                    <div style={{ marginTop: '6px' }}>
                                      {/* Bouton voir/masquer réponses */}
                                      <button
                                        onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: '#2d4a22', padding: '2px 0 4px 32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <span style={{ fontSize: '0.9rem' }}>{isExpanded ? '▲' : '▼'}</span>
                                        {isExpanded ? 'Masquer les réponses' : `Voir ${replies.length} réponse${replies.length > 1 ? 's' : ''}`}
                                      </button>

                                      {/* Liste des réponses */}
                                      {isExpanded && (
                                        <div style={{ position: 'relative', marginLeft: '12px', paddingLeft: '20px', borderLeft: '2px solid #e4e6eb' }}>
                                          {replies.map(reply => (
                                            <div key={reply.id} style={{ display: 'flex', gap: '0.5rem', marginTop: '10px' }}>
                                              <img
                                                src={reply.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.profiles?.username || 'U')}&size=28`}
                                                alt="User"
                                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                              />
                                              <div>
                                                <div style={{ background: '#f0f2f5', padding: '0.4rem 0.9rem', borderRadius: '18px', display: 'inline-block', maxWidth: '100%' }}>
                                                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#050505', display: 'block' }}>
                                                    {reply.profiles?.full_name || reply.profiles?.username}
                                                  </span>
                                                  <span style={{ fontSize: '0.88rem', color: '#1c1e21' }}>{reply.content}</span>
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: '#8a8d91', paddingLeft: '8px', marginTop: '2px' }}>
                                                  {timeAgo(reply.created_at)}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Write Comment */}
                      {session && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}`} alt="My Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                          <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ flex: 1, display: 'flex', background: '#f0f2f5', borderRadius: '20px', padding: '0.2rem 0.5rem' }}>
                            <input 
                              type="text" 
                              placeholder="Écrire un commentaire public..." 
                              value={commentText[post.id] || ''}
                              onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                              style={{ flex: 1, padding: '0.5rem', border: 'none', background: 'transparent', fontSize: '0.95rem', outline: 'none', color: '#050505' }}
                            />
                            <button type="submit" disabled={!commentText[post.id]?.trim()} style={{ background: 'none', border: 'none', color: commentText[post.id]?.trim() ? '#2d4a22' : '#bcc0c4', cursor: commentText[post.id]?.trim() ? 'pointer' : 'default', padding: '0 0.5rem', display: 'flex', alignItems: 'center' }}>
                              <Send size={18} />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (PC) */}
        <div className="feed-sidebar-right">
           <h4 style={{ color: '#65676b', fontSize: '1.05rem', margin: '0 0 1rem 0', padding: '0.5rem' }}>Contacts</h4>
           <div style={{ padding: '0.5rem', color: '#999', fontSize: '0.85rem' }}>
             Vos amis apparaîtront ici.
           </div>
        </div>

      </div>

      {/* ── STATUS VIEWER MODAL ── */}
      {viewingStatus && storyViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000, background: viewingStatus.image_url ? 'rgba(0,0,0,0.95)' : (viewingStatus.bg_color || 'rgba(0,0,0,0.95)'), display: 'flex', flexDirection: 'column' }}>
          
          {/* Barre de progression des stories */}
          <div style={{ display: 'flex', gap: '3px', padding: '0.5rem 1rem 0' }}>
            {currentUserStories?.stories.map((_, idx) => {
              const isPast = idx < storyViewer.storyIndex;
              const isCurrent = idx === storyViewer.storyIndex;
              return (
                <div key={idx} style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                  <div key={isCurrent ? 'current' : (isPast ? 'past' : 'future')} style={{
                    height: '100%', background: 'white',
                    width: isPast ? '100%' : '0%',
                    animation: isCurrent ? 'fillProgress 5s linear forwards' : 'none'
                  }} />
                </div>
              );
            })}
          </div>

          <div style={{ padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
               <img src={viewingStatus.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingStatus.profiles?.full_name || 'U')}`} alt="Auteur" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid white' }} />
               <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{viewingStatus.profiles?.full_name}</h3>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{timeAgo(viewingStatus.created_at)}{currentUserStories && currentUserStories.stories.length > 1 && ` · ${storyViewer.storyIndex + 1}/${currentUserStories.stories.length}`}</span>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {viewingStatus.user_id === session?.user?.id && (
                <button onClick={() => handleDeleteStatus(viewingStatus.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Supprimer la story">
                  <Trash2 size={24} />
                </button>
              )}
              <button onClick={() => setStoryViewer(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={28} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
             
             {/* Nav Zones */}
             <div onClick={handlePrevStatus} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', display: 'flex', alignItems: 'center', paddingLeft: '1rem', cursor: 'pointer', zIndex: 10, WebkitTapHighlightColor: 'transparent' }}>
               {currentStatusIndex > 0 && <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}><ChevronLeft size={32} color="white" /></div>}
             </div>
             <div onClick={handleNextStatus} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '1rem', cursor: 'pointer', zIndex: 10, WebkitTapHighlightColor: 'transparent' }}>
               <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}><ChevronRight size={32} color="white" /></div>
             </div>

             {viewingStatus.image_url && (
               (String(viewingStatus.image_url).toLowerCase().match(/\.(mp4|webm|ogg|mov)$/i) || String(viewingStatus.image_url).includes('video')) ? (
                 <video src={viewingStatus.image_url} controls autoPlay muted style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '12px' }} />
               ) : (
                 <img src={viewingStatus.image_url} alt="Status" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '12px', objectFit: 'contain' }} />
               )
             )}
             {viewingStatus.content && (
               <div style={{ 
                 color: 'white', 
                 textAlign: 'center', 
                 maxWidth: '600px', 
                 margin: '0',
                 padding: '0 1rem',
                 ...(viewingStatus.image_url 
                   ? { fontSize: '1rem', position: 'absolute', bottom: '1.5rem', left: 0, right: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '0.8rem', borderRadius: '12px', width: 'max-content', maxWidth: '90%', margin: '0 auto' } 
                   : { fontSize: '1.5rem', margin: '1rem 0' }
                 )
               }}>
                 {viewingStatus.content}
               </div>
             )}
          </div>

          <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => handleLikeStatus(viewingStatus.id, viewingStatus.status_likes?.some(l => l.user_id === session?.user?.id))}
              style={{ background: 'none', border: 'none', color: viewingStatus.status_likes?.some(l => l.user_id === session?.user?.id) ? '#ef4444' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Heart size={28} fill={viewingStatus.status_likes?.some(l => l.user_id === session?.user?.id) ? '#ef4444' : 'none'} />
              <span style={{ fontSize: '1rem' }}>{viewingStatus.status_likes?.length || 0}</span>
            </button>
            <form onSubmit={handleReplyStatus} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Envoyer un message..." 
                value={statusReply}
                onChange={(e) => setStatusReply(e.target.value)}
                style={{ flex: 1, padding: '0.8rem 1.2rem', borderRadius: '24px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', outline: 'none' }}
              />
              <button type="submit" disabled={!statusReply.trim()} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Send size={18} style={{ marginLeft: '-2px' }} />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ── CREATE STATUS MODAL ── */}
      {showCreateStatus && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000, background: statusMedia ? 'linear-gradient(135deg, #111827, #1f2937)' : selectedBg, display: 'flex', flexDirection: 'column', transition: 'background 0.3s ease' }}>
          
          {/* Header */}
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <button onClick={() => setShowCreateStatus(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}>
              <X size={28} />
            </button>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Créer une Story</h3>
            <button 
               onClick={handleCreateStatus} 
               disabled={creatingStatus || (!statusText.trim() && !statusMedia)}
               style={{ background: 'white', color: 'black', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', cursor: (!statusText.trim() && !statusMedia) ? 'not-allowed' : 'pointer', opacity: (!statusText.trim() && !statusMedia) ? 0.5 : 1 }}
            >
              {creatingStatus ? 'Envoi...' : 'Partager'}
            </button>
          </div>

          {/* Barre de progression (Stories) */}
          {storyUploadProgress > 0 && (
            <div style={{ width: '100%', padding: '0 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem' }}>
                <span>{storyUploadStatus}</span>
                <span>{storyUploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'white', width: `${storyUploadProgress}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}
          
          {/* Main Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
            {statusMedia ? (
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {statusMedia.type.startsWith('video') ? (
                  <video src={URL.createObjectURL(statusMedia)} controls autoPlay muted style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                ) : (
                  <img src={URL.createObjectURL(statusMedia)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', objectFit: 'contain' }} />
                )}
                <button 
                  type="button" 
                  onClick={() => setStatusMedia(null)} 
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                >
                  <X size={20} />
                </button>
                <textarea 
                  placeholder="Ajouter une légende..." 
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  style={{ width: '100%', maxWidth: '400px', marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', textAlign: 'center', resize: 'none', outline: 'none' }}
                  rows="2"
                />
              </div>
            ) : (
              <>
                <textarea 
                  placeholder="Tapez quelque chose ici..." 
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  style={{ width: '100%', maxWidth: '600px', padding: '1rem', border: 'none', background: 'transparent', color: 'white', fontSize: '2rem', textAlign: 'center', resize: 'none', outline: 'none', fontWeight: '500', minHeight: '150px' }}
                  autoFocus
                />
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '400px', marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
                   {BACKGROUNDS.map((bg, idx) => (
                     <button
                       key={idx}
                       onClick={() => setSelectedBg(bg)}
                       style={{ width: '32px', height: '32px', borderRadius: '50%', background: bg, border: selectedBg === bg ? '3px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', flexShrink: 0, transition: 'transform 0.2s' }}
                     />
                   ))}
                </div>
                
                <div style={{ position: 'absolute', bottom: '2rem', display: 'flex', gap: '1.5rem' }}>
                  <label style={{ cursor: 'pointer', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '1rem 1.5rem', borderRadius: '16px', transition: 'background 0.2s' }} className="story-media-btn">
                    <ImageIcon size={32} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Ajouter Photo/Vidéo</span>
                    <input type="file" accept="image/*,video/*" onChange={(e) => setStatusMedia(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── MODALE REACTIONS ── */}
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
      {/* ── MODALE PARTAGE ── */}
      {shareModal && (
        <div onClick={() => { setShareModal(null); setShareText(''); }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e4e6eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#050505' }}>Partager la publication</h3>
              <button onClick={() => { setShareModal(null); setShareText(''); }} style={{ background: '#f0f2f5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Aperçu du post original */}
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

            {/* Options de partage */}
            <div style={{ padding: '0 1.5rem 1rem' }}>
              {/* Partager sur le fil */}
              {session && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}`} alt="Me" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
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

              {/* Séparateur */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e4e6eb' }} />
                <span style={{ fontSize: '0.8rem', color: '#65676b' }}>ou</span>
                <div style={{ flex: 1, height: '1px', background: '#e4e6eb' }} />
              </div>

              {/* Copier le lien */}
              <button
                onClick={() => handleCopyLink(shareModal)}
                style={{ width: '100%', padding: '0.65rem', background: '#f0f2f5', color: '#050505', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
              >
                🔗 Copier le lien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG STYLÉ ── */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel="Annuler"
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
};

export default Feed;
