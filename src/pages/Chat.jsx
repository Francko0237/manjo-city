import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Users, User, ArrowLeft, Search, Check, CheckCheck, MessageCircle, Paperclip, X, Info } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';

// ── Composant coches de statut WhatsApp ──
const MessageTicks = ({ isMe, isRead, isDelivered }) => {
  if (!isMe) return null;
  if (isRead) {
    // ✓✓ vert = lu
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}>
        <CheckCheck size={14} color="#22c55e" />
      </span>
    );
  }
  if (isDelivered) {
    // ✓✓ gris = livré (reçu)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}>
        <CheckCheck size={14} color="#999" />
      </span>
    );
  }
  // ✓ gris = envoyé
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}>
      <Check size={14} color="#999" />
    </span>
  );
};

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'J\'aime' },
  { type: 'love', emoji: '❤️', label: 'J\'adore' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wouaou' },
  { type: 'sad', emoji: '😢', label: 'Triste' },
  { type: 'angry', emoji: '😡', label: 'Grrr' }
];

// Barre de réactions flottante style Facebook
const ReactionBar = ({ msg, isMe, onReact, onClose, onMouseEnter, onMouseLeave }) => {
  return (
    <div
      style={{
        position: 'absolute',
        [isMe ? 'right' : 'left']: '0',
        bottom: 'calc(100% + 4px)',
        background: 'white',
        borderRadius: '24px',
        padding: '6px 12px',
        display: 'flex',
        gap: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        border: '1px solid #eee',
        zIndex: 100,
        animation: 'reactionBarIn 0.15s ease'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchEnd={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {REACTIONS.map(r => (
        <button
          key={r.type}
          title={r.label}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onReact(msg, r.type); onClose(); }}
          onClick={() => { onReact(msg, r.type); onClose(); }}
          style={{
            background: 'none', border: 'none', fontSize: '1.6rem',
            cursor: 'pointer', padding: '2px',
            transition: 'transform 0.15s',
            lineHeight: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.35) translateY(-5px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span>{r.emoji}</span>
        </button>
      ))}
    </div>
  );
};

const SwipeableMessage = ({ msg, isMe, onReply, onReact, children }) => {
  const [translateX, setTranslateX] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchMoved = useRef(false);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null); // Délai avant fermeture sur PC

  const openReactions = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShowReactions(true);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setShowReactions(false), 250);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMoved.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) touchMoved.current = true;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (isMe && diffX < 0 && diffX > -80) setTranslateX(diffX);
      else if (!isMe && diffX > 0 && diffX < 80) setTranslateX(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(translateX) > 50) {
      onReply(msg);
    } else if (!touchMoved.current) {
      setShowReactions(prev => !prev);
    }
    setTranslateX(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Fermer si on touche ailleurs (mobile)
  useEffect(() => {
    if (!showReactions) return;
    const close = () => setShowReactions(false);
    document.addEventListener('touchend', close, { once: true });
    document.addEventListener('click', close, { once: true });
    return () => {
      document.removeEventListener('touchend', close);
      document.removeEventListener('click', close);
    };
  }, [showReactions]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        paddingLeft: isMe ? '40px' : '0',
        paddingRight: isMe ? '0' : '40px'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { setTranslateX(0); touchStartX.current = null; touchStartY.current = null; }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Barre de réactions - reste ouverte pendant la transition souris bulle→barre */}
      {showReactions && (
        <ReactionBar
          msg={msg}
          isMe={isMe}
          onReact={onReact}
          onClose={() => setShowReactions(false)}
          onMouseEnter={openReactions}
          onMouseLeave={scheduleClose}
        />
      )}

      <div
        style={{ transform: `translateX(${translateX}px)`, transition: translateX === 0 ? 'transform 0.2s ease' : 'none', width: '100%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}
        onMouseEnter={openReactions}
        onMouseLeave={scheduleClose}
      >
        {children}
      </div>

      {/* Bouton Répondre - visible au survol sur PC (outside the bubble div to avoid clipping) */}
      {showReactions && (
        <button
          onClick={() => { onReply(msg); scheduleClose(); }}
          onMouseEnter={openReactions}
          onMouseLeave={scheduleClose}
          title="Répondre"
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [isMe ? 'left' : 'right']: '0px',
            background: 'white',
            border: '1px solid #e4e4e4',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            zIndex: 10,
            transition: 'background 0.15s',
            flexShrink: 0
          }}
          onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'}
          onMouseOut={e => e.currentTarget.style.background = 'white'}
        >
          <ArrowLeft size={15} color="#555" style={{ transform: isMe ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}

      {/* Icone de réponse lors du swipe (mobile) */}
      {Math.abs(translateX) > 5 && (
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isMe ? 'right' : 'left']: '-38px', opacity: Math.min(Math.abs(translateX) / 50, 1), pointerEvents: 'none' }}>
          <div style={{ background: 'var(--color-primary)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ArrowLeft size={14} style={{ transform: isMe ? 'rotate(180deg)' : 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
};

const Chat = () => {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({ user: {}, group: {} });
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [reactionHoverMsg, setReactionHoverMsg] = useState(null);
  // Toasts WhatsApp-style
  const [toasts, setToasts] = useState([]);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  // Logique de restauration au rechargement (F5) vs navigation SPA
  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sauvegarder uniquement lors d'un vrai rechargement (F5) ou fermeture d'onglet
      if (activeChatRef.current) {
        sessionStorage.setItem('manjo_restore_chat', JSON.stringify(activeChatRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Ce cleanup s'exécute quand on quitte la page via une navigation SPA (ex: Navbar)
    // On efface la sauvegarde pour repartir de la liste au prochain retour
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sessionStorage.removeItem('manjo_restore_chat');
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUsers(session.user.id);
        fetchGroups(session.user.id);
        fetchUnreadCounts(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUsers(session.user.id);
        fetchGroups(session.user.id);
        fetchUnreadCounts(session.user.id);
      }
    });
  }, []);

  const fetchUnreadCounts = async (userId) => {
    const { data: userMsgs } = await supabase.from('messages').select('sender_id').eq('receiver_id', userId).eq('is_read', false);
    if (userMsgs) {
       const userCounts = {};
       userMsgs.forEach(m => {
          userCounts[m.sender_id] = (userCounts[m.sender_id] || 0) + 1;
       });
       setUnreadCounts(prev => ({ ...prev, user: userCounts }));
    }
  };

  const fetchUsers = async (currentUserId) => {
    // Récupérer uniquement les utilisateurs avec qui on a échangé des messages
    const [{ data: sent }, { data: received }] = await Promise.all([
      supabase.from('messages').select('receiver_id').eq('sender_id', currentUserId),
      supabase.from('messages').select('sender_id').eq('receiver_id', currentUserId),
    ]);
    const partnerIds = [
      ...new Set([
        ...(sent || []).map(m => m.receiver_id),
        ...(received || []).map(m => m.sender_id),
      ])
    ];
    if (partnerIds.length === 0) { setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .in('id', partnerIds);
    if (data) setUsers(data);
  };

  const fetchGroups = async (currentUserId) => {
    // Fetch groups where the user is an APPROVED member
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups ( id, name, description, cover_url )
      `)
      .eq('user_id', currentUserId)
      .eq('status', 'approved');
      
    if (data) {
      const grps = data.map(d => d.groups);
      setGroups(grps);
      
      // Restaurer la conversation si elle était sauvegardée avant un rechargement F5
      const savedChat = sessionStorage.getItem('manjo_restore_chat');
      if (savedChat) {
        sessionStorage.removeItem('manjo_restore_chat'); // Lire une seule fois
        try {
          const parsed = JSON.parse(savedChat);
          if (parsed.type && parsed.data?.id) {
            setActiveChat(parsed);
          }
        } catch (e) { /* ignore */ }
      }
    }
    setLoading(false);
  };

  const selectChat = (type, data) => {
    setActiveChat({ type, data });
    fetchMessages(type, data.id);
    // Persister dans localStorage pour la restauration au rechargement
    localStorage.setItem('manjo_active_chat', JSON.stringify({ type, data }));
    
    // Clear unread counts for this chat
    setUnreadCounts(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [data.id]: 0
      }
    }));
    
    if (type === 'user' && session?.user?.id) {
      supabase.from('messages').update({ is_read: true })
        .match({ sender_id: data.id, receiver_id: session.user.id, is_read: false })
        .then(); // Fire and forget
    }
  };

  // Quand session est chargée et qu'un chat était sauvegardé, charger les messages
  useEffect(() => {
    if (session && activeChat && messages.length === 0) {
      fetchMessages(activeChat.type, activeChat.data.id);
    }
  }, [session, activeChat?.data?.id]);


  const fetchMessages = async (type, id) => {
    if (!session) return;
    
    if (type === 'user') {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(username, avatar_url, full_name)')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    } else {
      const { data } = await supabase
        .from('group_messages')
        .select('*, sender:profiles!group_messages_user_id_fkey(username, avatar_url, full_name)')
        .eq('group_id', id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    }
    scrollToBottom();
  };

  useEffect(() => {
    // Subscribe to ALL new messages to show unread badges
    if (!session) return;
    
    const notificationSub = supabase
      .channel('chat_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, payload => {
         const senderId = payload.new.sender_id;
         setActiveChat(currChat => {
           const isCurrentChat = currChat?.type === 'user' && currChat?.data.id === senderId;
           if (!isCurrentChat) {
             setUnreadCounts(prev => ({
               ...prev,
               user: { ...prev.user, [senderId]: (prev.user[senderId] || 0) + 1 }
             }));
             // Marquer comme delivered
             supabase.from('messages').update({ is_delivered: true }).match({ id: payload.new.id }).then();
             // Toast WhatsApp-style
             setUsers(currUsers => {
               const sender = currUsers.find(u => u.id === senderId);
               let preview = payload.new.content;
               try { const p = JSON.parse(payload.new.content); if (p.mediaUrl) preview = p.text || '📎 Média'; } catch {}
               addToast({
                 senderId,
                 senderName: sender?.full_name || sender?.username || 'Quelqu\'un',
                 avatar: sender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.full_name || 'U')}&background=2d4a22&color=fff`,
                 preview: preview.length > 60 ? preview.slice(0, 60) + '…' : preview,
               });
               // Rafraîchir la liste des contacts pour inclure ce nouveau contact si besoin
               if (!currUsers.find(u => u.id === senderId)) {
                 supabase.from('profiles').select('id, username, full_name, avatar_url, bio').eq('id', senderId).single()
                   .then(({ data }) => { if (data) setUsers(prev => [data, ...prev.filter(u => u.id !== data.id)]); });
               }
               return currUsers;
             });
           }
           return currChat;
         });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, payload => {
         const groupId = payload.new.group_id;
         if (payload.new.user_id !== session.user.id) {
           setActiveChat(currChat => {
             if (!(currChat?.type === 'group' && currChat?.data.id === groupId)) {
               setGroups(currGroups => {
                 const group = currGroups.find(g => g.id === groupId);
                 if (group) {
                   setUnreadCounts(prev => ({
                     ...prev,
                     group: { ...prev.group, [groupId]: (prev.group[groupId] || 0) + 1 }
                   }));
                   addToast({
                     senderId: groupId,
                     senderName: group.name,
                     avatar: null,
                     preview: payload.new.content.length > 60 ? payload.new.content.slice(0, 60) + '…' : payload.new.content,
                     isGroup: true,
                   });
                 }
                 return currGroups;
               });
             }
             return currChat;
           });
         }
      })
      // Écouter les mises à jour is_read et is_delivered pour rafraîchir les coches
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${session.user.id}` }, payload => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, is_read: payload.new.is_read, is_delivered: payload.new.is_delivered } : m));
      })
      .subscribe();

    return () => supabase.removeChannel(notificationSub);
  }, [session, addToast]);

  const replaceStateNoRefresh = () => {
     window.history.replaceState({}, document.title);
  };

  useEffect(() => {
    if (!location.state) return;

    if (location.state.selectedUser) {
      const u = location.state.selectedUser;
      
      setUsers(prevUsers => {
        if (!prevUsers.find(x => x.id === u.id)) {
          return [u, ...prevUsers];
        }
        return prevUsers;
      });

      // Utilisez une fonction pour ne pas dépendre de activeChat dans les dépendances
      setActiveChat(currChat => {
        if (!currChat || currChat.data.id !== u.id) {
          selectChat('user', u);
          replaceStateNoRefresh();
        }
        return currChat; // Wait, selectChat already sets activeChat inside. 
      });
    } else if (location.state.selectedGroupId && groups.length > 0) {
      const g = groups.find(x => x.id === location.state.selectedGroupId);
      if (g) {
        setActiveChat(currChat => {
          if (!currChat || currChat.data.id !== g.id) {
             selectChat('group', g);
             replaceStateNoRefresh();
          }
          return currChat;
        });
      }
    }
  }, [location.state, groups]);

  useEffect(() => {
    // Subscribe to new messages FOR ACTIVE CHAT
    if (!session || !activeChat) return;

    let subscription;

    if (activeChat.type === 'user') {
      subscription = supabase
        .channel(`chat_${activeChat.data.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${session.user.id}`
          }, 
          payload => {
            if (payload.new.sender_id === activeChat.data.id || payload.new.receiver_id === activeChat.data.id) {
               fetchMessages('user', activeChat.data.id);
               supabase.from('messages').update({ is_read: true }).match({ id: payload.new.id }).then();
            }
          }
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${session.user.id}` }, payload => {
            if (payload.new.receiver_id === activeChat.data.id) {
               fetchMessages('user', activeChat.data.id);
            }
        })
        // Temps réel pour les réactions
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
            if (payload.new.reactions !== undefined) {
              setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, reactions: payload.new.reactions } : m));
            }
        })
        .subscribe();
    } else {
      subscription = supabase
        .channel(`group_${activeChat.data.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'group_messages',
            filter: `group_id=eq.${activeChat.data.id}`
          }, 
          payload => {
            fetchMessages('group', activeChat.data.id);
          }
        )
        // Temps réel pour les réactions de groupe
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_messages' }, payload => {
            if (payload.new.reactions !== undefined) {
              setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, reactions: payload.new.reactions } : m));
            }
        })
        .subscribe();
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [activeChat, session]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaFile) || !session || !activeChat || uploadingMedia) return;

    setUploadingMedia(true);
    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
       const fileExt = mediaFile.name.split('.').pop();
       const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
       // Upload to chat folder in manjo-images bucket
       const { error: uploadError } = await supabase.storage
         .from('manjo-images')
         .upload(`chat/${fileName}`, mediaFile);
       
       if (!uploadError) {
         const { data: { publicUrl } } = supabase.storage
           .from('manjo-images')
           .getPublicUrl(`chat/${fileName}`);
         mediaUrl = publicUrl;
         mediaType = mediaFile.type;
       }
    }

    // construct JSON payload
    let finalContent = newMessage;
    if (mediaUrl) {
      finalContent = JSON.stringify({
         text: newMessage,
         mediaUrl,
         mediaType
      });
    }

    const tempMessage = newMessage;
    const currentReply = replyingToMessage;
    setNewMessage(''); // optimistic clear
    setMediaFile(null);
    setReplyingToMessage(null);

    if (activeChat.type === 'user') {
      const { error } = await supabase.from('messages').insert([{
        sender_id: session.user.id,
        receiver_id: activeChat.data.id,
        content: finalContent,
        reply_to_id: currentReply?.id || null
      }]);
      if (error) {
        console.error("Erreur d'envoi du message:", error);
      } else {
        fetchMessages('user', activeChat.data.id);
      }
    } else {
      const { error } = await supabase.from('group_messages').insert([{
        group_id: activeChat.data.id,
        user_id: session.user.id,
        content: finalContent,
        reply_to_id: currentReply?.id || null
      }]);
      if (error) {
        console.error("Erreur d'envoi du message de groupe:", error);
      } else {
        fetchMessages('group', activeChat.data.id);
      }
    }
    setUploadingMedia(false);
  };

  const handleReact = async (msg, type) => {
    if (!session) return;
    let newReaction = type;
    const currentReactions = msg.reactions || {};
    if (currentReactions[session.user.id] === type) {
      newReaction = null; // Toggle off
    }

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id === msg.id) {
        const newR = { ...m.reactions };
        if (newReaction) newR[session.user.id] = newReaction;
        else delete newR[session.user.id];
        return { ...m, reactions: newR };
      }
      return m;
    }));

    const rpcName = activeChat.type === 'user' ? 'react_to_message' : 'react_to_group_message';
    const { error } = await supabase.rpc(rpcName, { p_message_id: msg.id, p_user_id: session.user.id, p_reaction: newReaction });
    if (error) console.error("Erreur ajout réaction:", error);
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredGroups = groups.filter(group => 
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!session) {
    return (
      <div className="main-content-wrapper">
        <div className="container text-center" style={{ paddingTop: '2rem', minHeight: '60vh' }}>
          <h3>Connectez-vous pour voir vos messages</h3>
          <p>Connectez-vous pour parler avec vos amis et vos groupes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── TOASTS DE NOTIFICATION WHATSAPP-STYLE ── */}
      <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', width: '90%', maxWidth: '400px', pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', animation: 'fadeInDown 0.3s ease forwards', pointerEvents: 'auto', cursor: 'pointer' }} onClick={() => { selectChat(toast.isGroup ? 'group' : 'user', { id: toast.senderId, name: toast.senderName }); }}>
            {toast.avatar ? (
              <img src={toast.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{toast.senderName?.charAt(0).toUpperCase()}</div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#050505', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{toast.senderName}</div>
              <div style={{ fontSize: '0.85rem', color: '#65676b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{toast.preview}</div>
            </div>
          </div>
        ))}
      </div>

    <div className="main-content-wrapper">
      <div className="feed-layout chat-feed-layout" style={{ maxWidth: '1400px' }}>
        <LeftSidebar />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          
          <div className="chat-container" style={{ height: 'calc(100dvh - 116px)', display: 'flex' }}>
        
        {/* ── SIDEBAR (Contacts & Groups) ── */}
        <div className={`glass-card chat-sidebar ${activeChat ? 'hidden-mobile' : ''}`} style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Discussions</h2>
        </div>
        
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 40px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Groups Section */}
          <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-light)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={14} /> Mes Groupes
          </div>
          {loading ? (
             <div style={{ padding: '0 1rem', fontSize: '0.9rem', color: '#999' }}>Chargement...</div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ padding: '0 1rem', fontSize: '0.9rem', color: '#999' }}>Aucun groupe.</div>
          ) : (
             filteredGroups.map(group => (
              <div 
                key={group.id} 
                onClick={() => selectChat('group', group)}
                style={{ 
                  padding: '0.8rem 1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.8rem', 
                  cursor: 'pointer',
                  position: 'relative',
                  background: activeChat?.data?.id === group.id ? 'var(--color-bg-alt)' : 'transparent',
                  borderLeft: activeChat?.data?.id === group.id ? '3px solid var(--color-primary)' : '3px solid transparent'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', position: 'relative' }}>
                  {group.name.charAt(0).toUpperCase()}
                  {unreadCounts.group[group.id] > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', border: '2px solid white' }}>
                      {unreadCounts.group[group.id]}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: '500' }}>{group.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Groupe</div>
                </div>
              </div>
            ))
          )}

          {/* Users Section */}
          <div style={{ padding: '1.5rem 1rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-light)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={14} /> Contacts
          </div>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '0 1rem', fontSize: '0.9rem', color: '#999' }}>Aucun contact.</div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id} 
                onClick={() => selectChat('user', user)}
                style={{ 
                  padding: '0.8rem 1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.8rem', 
                  cursor: 'pointer',
                  position: 'relative',
                  background: activeChat?.data?.id === user.id ? 'var(--color-bg-alt)' : 'transparent',
                  borderLeft: activeChat?.data?.id === user.id ? '3px solid var(--color-primary)' : '3px solid transparent'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}`} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  {unreadCounts.user[user.id] > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', border: '2px solid white' }}>
                      {unreadCounts.user[user.id]}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: '500' }}>{user.full_name || user.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>@{user.username}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── CHAT WINDOW ── */}
      <div className={`glass-card chat-window ${!activeChat ? 'hidden-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '1rem', overflow: 'hidden' }}>
        {activeChat ? (
          <>
            {/* EN-TÊTE CHAT : CLIQUABLE POUR VOIR PROFIL SI USER */}
            <div className="chat-header" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.5rem 1rem', borderBottom: '1px solid #eee', background: 'white', minHeight: '60px' }}>
              <button 
                className="chat-back-btn btn-icon hidden-desktop" 
                onClick={() => setActiveChat(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', marginRight: '0.2rem', display: 'flex', alignItems: 'center' }}
              >
                <ArrowLeft size={24} />
              </button>
              
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: activeChat.type === 'user' ? 'pointer' : 'default', flex: 1 }} 
                onClick={() => activeChat.type === 'user' ? navigate(`/profile/${activeChat.data.id}`) : null}
              >
                {activeChat.type === 'user' ? (
                  <img src={activeChat.data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.data.full_name || 'U')}`} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {activeChat.data.name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{activeChat.type === 'user' ? (activeChat.data.full_name || activeChat.data.username) : activeChat.data.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                    {activeChat.type === 'user' ? `@${activeChat.data.username}` : activeChat.data.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="chat-messages-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fafafa', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                   Commencez la discussion...
                </div>
              ) : (
                (() => {
                  let lastDateString = null;
                  
                  return messages.map(msg => {
                    const isMe = activeChat.type === 'user' ? msg.sender_id === session.user.id : msg.user_id === session.user.id;
                    let payload = { text: msg.content };
                    try {
                      const parsed = JSON.parse(msg.content);
                      if (parsed.mediaUrl) payload = parsed;
                    } catch(e) {}

                    const msgDate = new Date(msg.created_at);
                    const dateString = msgDate.toDateString();
                    const showDateHeader = lastDateString !== dateString;
                    lastDateString = dateString;

                    let dateHeaderText = "";
                    if (showDateHeader) {
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      if (dateString === today.toDateString()) {
                        dateHeaderText = "Aujourd'hui";
                      } else if (dateString === yesterday.toDateString()) {
                        dateHeaderText = "Hier";
                      } else {
                        dateHeaderText = msgDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                      }
                    }

                    const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
                    const msgReactions = Object.entries(msg.reactions || {}).reduce((acc, [uid, rtype]) => {
                       acc[rtype] = (acc[rtype] || 0) + 1;
                       return acc;
                    }, {});

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateHeader && (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                            <span style={{ background: '#e5e7eb', color: '#4b5563', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500', textTransform: 'capitalize' }}>
                              {dateHeaderText}
                            </span>
                          </div>
                        )}
                        <SwipeableMessage msg={msg} isMe={isMe} onReply={setReplyingToMessage} onReact={handleReact}>
                          {!isMe && activeChat.type === 'group' && (
                            <span style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{msg.sender?.username}</span>
                          )}
                          
                          <div style={{ 
                            maxWidth: '75%', 
                            padding: payload.mediaUrl ? '0.5rem' : '0.8rem 1rem', 
                            borderRadius: '16px', 
                            background: isMe ? 'var(--color-primary)' : 'white', 
                            color: isMe ? 'white' : 'var(--color-text)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            borderBottomRightRadius: isMe ? '4px' : '16px',
                            borderBottomLeftRadius: isMe ? '16px' : '4px',
                            position: 'relative'
                          }}>
                            {/* Replying block inside message bubble */}
                            {repliedMsg && (
                              <div 
                                style={{
                                  background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '8px',
                                  marginBottom: '0.5rem',
                                  fontSize: '0.8rem',
                                  borderLeft: `4px solid ${isMe ? 'white' : 'var(--color-primary)'}`,
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ fontWeight: 'bold', color: isMe ? 'white' : 'var(--color-primary)', marginBottom: '2px' }}>
                                  {repliedMsg.sender_id === session.user.id || repliedMsg.user_id === session.user.id ? 'Vous' : (repliedMsg.sender?.full_name || repliedMsg.sender?.username || 'Utilisateur')}
                                </div>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.9 }}>
                                  {(() => {
                                     let t = repliedMsg.content;
                                     try { const p = JSON.parse(t); if(p.text) t = p.text; else if (p.mediaUrl) t = '📎 Média'; } catch(e){}
                                     return t;
                                  })()}
                                </div>
                              </div>
                            )}

                            {payload.mediaUrl && (
                              <div style={{ marginBottom: payload.text ? '0.5rem' : '0' }}>
                                {payload.mediaType?.startsWith('image/') ? (
                                   <img src={payload.mediaUrl} alt="Media" style={{ width: '100%', borderRadius: '8px', cursor: 'pointer' }} onClick={() => window.open(payload.mediaUrl, '_blank')} />
                                ) : payload.mediaType?.startsWith('video/') ? (
                                   <video src={payload.mediaUrl} controls style={{ width: '100%', borderRadius: '8px', outline: 'none' }} />
                                ) : payload.mediaType?.startsWith('audio/') ? (
                                   <audio src={payload.mediaUrl} controls style={{ width: '100%', outline: 'none' }} />
                                ) : (
                                   <a href={payload.mediaUrl} target="_blank" rel="noreferrer" style={{ color: isMe ? 'white' : 'var(--color-primary)', textDecoration: 'underline' }}>Fichier joint</a>
                                )}
                              </div>
                            )}
                            {payload.text && <div style={{ padding: payload.mediaUrl ? '0 0.5rem 0.3rem' : '0' }}>{payload.text}</div>}
                            
                            {/* Réactions badge sous la bulle */}
                            {Object.keys(msgReactions).length > 0 && (
                              <div style={{ position: 'absolute', bottom: '-16px', [isMe ? 'right' : 'left']: '8px', background: 'white', borderRadius: '12px', padding: '2px 7px', display: 'flex', gap: '3px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', border: '1px solid #eee', zIndex: 1, fontSize: '0.9rem' }}>
                                {Object.entries(msgReactions).map(([type, count]) => {
                                  const r = REACTIONS.find(x => x.type === type);
                                  return r ? (
                                    <span key={type}>{r.emoji}{count > 1 && <span style={{ fontSize: '0.68rem', color: '#555', marginLeft: '1px' }}>{count}</span>}</span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>

                          {/* Heure + coches */}
                          <span style={{ fontSize: '0.72rem', color: '#999', marginTop: Object.keys(msgReactions).length > 0 ? '1.2rem' : '0.35rem', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <MessageTicks isMe={isMe} isRead={msg.is_read} isDelivered={msg.is_delivered} />
                          </span>
                        </SwipeableMessage>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </div>

            {/* Reply preview block */}
            {replyingToMessage && (
              <div style={{ padding: '0.5rem 1rem', background: '#f0f2f5', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--color-primary)' }}>
                 <div style={{ overflow: 'hidden' }}>
                   <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '2px' }}>
                     Réponse à {replyingToMessage.sender_id === session.user.id || replyingToMessage.user_id === session.user.id ? 'vous-même' : (replyingToMessage.sender?.full_name || replyingToMessage.sender?.username || 'Utilisateur')}
                   </div>
                   <div style={{ fontSize: '0.85rem', color: '#65676b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                     {(() => {
                       let text = replyingToMessage.content;
                       try { const p = JSON.parse(text); if(p.text) text = p.text; else if (p.mediaUrl) text = '📎 Média'; } catch(e){}
                       return text;
                     })()}
                   </div>
                 </div>
                 <button type="button" onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.5rem' }}>
                   <X size={18}/>
                 </button>
              </div>
            )}

            {/* Media preview block */}
            {mediaFile && (
              <div style={{ padding: '0.5rem 1rem', background: '#f5f5f5', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: '0.8rem', background: 'white', padding: '0.4rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #ddd' }}>
                   📎 {mediaFile.name} 
                   <button type="button" onClick={() => setMediaFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><X size={14}/></button>
                 </div>
              </div>
            )}

            {/* Chat Input */}
            <div style={{ padding: '1rem', borderTop: '1px solid #eee', background: 'white' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                   <Paperclip size={24} />
                </button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*,audio/*" onChange={(e) => setMediaFile(e.target.files[0])} />
                
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez un message..." 
                  style={{ flex: 1, padding: '0.8rem 1.2rem', borderRadius: '24px', border: '1px solid #ddd', outline: 'none' }}
                  disabled={uploadingMedia}
                />
                <button type="submit" disabled={(!newMessage.trim() && !mediaFile) || uploadingMedia} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', minWidth: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: ((!newMessage.trim() && !mediaFile) || uploadingMedia) ? 0.5 : 1 }}>
                  {uploadingMedia ? <div className="spinner" style={{width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div> : <Send size={18} style={{ marginLeft: '-2px' }} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            <MessageCircle size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3>Vos Messages</h3>
            <p>Sélectionnez un contact ou un groupe pour démarrer une discussion.</p>
          </div>
        )}
      </div>

      </div>
        </div>
      </div>


    </div>
    </>
  );
};

export default Chat;
