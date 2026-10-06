import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Users, User, ArrowLeft, Search, Check, CheckCheck, MessageCircle, Paperclip, X, Info, Phone, Video } from 'lucide-react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';
import { useVoiceCall } from '../context/VoiceCallContext';
import { useAuth } from '../context/AuthContext';

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
  // ── Session : source unique de vérité via AuthContext (fix PC disconnect) ──
  const { session, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false); // loading = chargement des données chat uniquement
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({ user: {}, group: {} });
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [reactionHoverMsg, setReactionHoverMsg] = useState(null);
  // Toasts WhatsApp-style
  const [toasts, setToasts] = useState([]);
  // Messages en échec d'envoi
  const [failedMessages, setFailedMessages] = useState(new Set());
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, groupId } = useParams();
  const { startCall } = useVoiceCall();

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

  // pagehide : sauvegarde au vrai départ (F5, fermeture d'onglet) sans beforeunload
  // (beforeunload peut casser le cache arrière / bfcache sur mobile et provoquer rechargements bizarres)
  useEffect(() => {
    const handlePageHide = () => {
      if (activeChatRef.current) {
        sessionStorage.setItem('manjo_restore_chat', JSON.stringify(activeChatRef.current));
      }
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      sessionStorage.removeItem('manjo_restore_chat');
    };
  }, []);

  // Chargement des données chat quand la session est disponible
  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    Promise.all([
      fetchUsers(session.user.id),
      fetchGroups(session.user.id),
      fetchUnreadCounts(session.user.id),
    ]).finally(() => setLoading(false));
  }, [session?.user?.id]); // se déclenche uniquement quand l'ID change

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
    navigate(`/chat/${type}/${data.id}`);
    
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

  // Synchronisation avec les paramètres d'URL (ex: /chat/user/:userId ou /chat/group/:groupId)
  useEffect(() => {
    if (!session) return;

    if (userId) {
      if (activeChat?.type === 'user' && activeChat?.data?.id === userId) return;
      const existingUser = users.find(u => u.id === userId);
      if (existingUser) {
        setActiveChat({ type: 'user', data: existingUser });
        fetchMessages('user', userId);
      } else {
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio')
          .eq('id', userId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setActiveChat({ type: 'user', data });
              fetchMessages('user', userId);
              setUsers(prev => prev.some(u => u.id === data.id) ? prev : [data, ...prev]);
            }
          });
      }
    } else if (groupId) {
      if (activeChat?.type === 'group' && activeChat?.data?.id === groupId) return;
      const existingGroup = groups.find(g => g.id === groupId);
      if (existingGroup) {
        setActiveChat({ type: 'group', data: existingGroup });
        fetchMessages('group', groupId);
      } else {
        supabase
          .from('groups')
          .select('id, name, description, cover_url')
          .eq('id', groupId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setActiveChat({ type: 'group', data });
              fetchMessages('group', groupId);
              setGroups(prev => prev.some(g => g.id === data.id) ? prev : [data, ...prev]);
            }
          });
      }
    } else {
      if (!location.state?.selectedUser && !location.state?.selectedGroup) {
        setActiveChat(null);
      }
    }
  }, [userId, groupId, session, users.length, groups.length]);

  // Support de location.state pour redirection immédiate vers l'URL dédiée
  useEffect(() => {
    if (location.state?.selectedUser?.id) {
      navigate(`/chat/user/${location.state.selectedUser.id}`, { replace: true });
    } else if (location.state?.selectedGroup?.id) {
      navigate(`/chat/group/${location.state.selectedGroup.id}`, { replace: true });
    }
  }, [location.state]);


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
    // scrollToBottom() est géré par useEffect([messages]) — pas besoin ici
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

  // ── Helper : insérer un message reçu directement dans le state (évite double requête) ──
  const addIncomingMessage = useCallback((msg) => {
    setMessages(prev => {
      // Éviter les doublons (idempotent)
      if (prev.find(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

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
            if (payload.new.sender_id === activeChat.data.id) {
              // Message entrant : on le récupère avec les infos du sender
              supabase
                .from('messages')
                .select('*, sender:profiles!messages_sender_id_fkey(username, avatar_url, full_name)')
                .eq('id', payload.new.id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    addIncomingMessage(data);
                    // Marquer comme lu immédiatement
                    supabase.from('messages').update({ is_read: true }).match({ id: data.id }).then();
                  }
                });
            }
          }
        )
        // Temps réel pour les réactions + statuts is_read/is_delivered
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
            setMessages(prev => prev.map(m =>
              m.id === payload.new.id
                ? { ...m, reactions: payload.new.reactions, is_read: payload.new.is_read, is_delivered: payload.new.is_delivered }
                : m
            ));
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
            if (payload.new.user_id !== session.user.id) {
              // Message d'un autre membre du groupe
              supabase
                .from('group_messages')
                .select('*, sender:profiles!group_messages_user_id_fkey(username, avatar_url, full_name)')
                .eq('id', payload.new.id)
                .single()
                .then(({ data }) => { if (data) addIncomingMessage(data); });
            }
          }
        )
        // Temps réel pour les réactions de groupe
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_messages' }, payload => {
            setMessages(prev => prev.map(m =>
              m.id === payload.new.id ? { ...m, reactions: payload.new.reactions } : m
            ));
        })
        .subscribe();
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [activeChat, session, addIncomingMessage]);

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

    let finalContent = newMessage.trim();
    if (mediaUrl) {
      finalContent = JSON.stringify({ text: newMessage.trim(), mediaUrl, mediaType });
    }

    const currentReply = replyingToMessage;
    setNewMessage('');
    setMediaFile(null);
    setReplyingToMessage(null);

    // ── OPTIMISTIC UI : afficher le message immédiatement ──
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender_id: session.user.id,
      user_id: session.user.id, // pour les groupes
      receiver_id: activeChat.type === 'user' ? activeChat.data.id : null,
      group_id: activeChat.type === 'group' ? activeChat.data.id : null,
      content: finalContent,
      reply_to_id: currentReply?.id || null,
      created_at: new Date().toISOString(),
      is_read: false,
      is_delivered: false,
      reactions: {},
      _pending: true, // marqueur temporaire
      sender: {
        username: session.user.email?.split('@')[0],
        full_name: session.user.user_metadata?.full_name || '',
        avatar_url: session.user.user_metadata?.avatar_url || null,
      }
    };
    setMessages(prev => [...prev, optimisticMsg]);

    if (activeChat.type === 'user') {
      const { data: inserted, error } = await supabase.from('messages').insert([{
        sender_id: session.user.id,
        receiver_id: activeChat.data.id,
        content: finalContent,
        reply_to_id: currentReply?.id || null
      }]).select('*, sender:profiles!messages_sender_id_fkey(username, avatar_url, full_name)').single();

      if (error) {
        console.error("Erreur d'envoi du message:", error);
        // Supprimer le message optimiste et marquer comme échoué
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setFailedMessages(prev => new Set([...prev, tempId]));
        addToast({
          senderId: 'error',
          senderName: '❌ Erreur d\'envoi',
          avatar: null,
          preview: 'Votre message n\'a pas pu être envoyé. Vérifiez votre connexion.',
          isError: true,
        });
      } else if (inserted) {
        // Remplacer le message optimiste par le vrai message
        setMessages(prev => prev.map(m => m.id === tempId ? inserted : m));
      }
    } else {
      const { data: inserted, error } = await supabase.from('group_messages').insert([{
        group_id: activeChat.data.id,
        user_id: session.user.id,
        content: finalContent,
        reply_to_id: currentReply?.id || null
      }]).select('*, sender:profiles!group_messages_user_id_fkey(username, avatar_url, full_name)').single();

      if (error) {
        console.error("Erreur d'envoi du message de groupe:", error);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        addToast({
          senderId: 'error',
          senderName: '❌ Erreur d\'envoi',
          avatar: null,
          preview: 'Votre message n\'a pas pu être envoyé. Vérifiez votre connexion.',
          isError: true,
        });
      } else if (inserted) {
        setMessages(prev => prev.map(m => m.id === tempId ? inserted : m));
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

  // Attendre que AuthContext ait terminé de restaurer la session
  // (évite le flash "non connecté" sur PC lors du refresh de token)
  if (authLoading) {
    return (
      <div className="main-content-wrapper">
        <div className="container text-center" style={{ paddingTop: '4rem', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#94a3b8' }}>Chargement...</p>
        </div>
      </div>
    );
  }

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
      {/* ── TOASTS ── */}
      <div style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', width: 'min(92vw, 380px)', pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => { if (!toast.isError) selectChat(toast.isGroup ? 'group' : 'user', { id: toast.senderId, name: toast.senderName }); }}
            style={{
              background: toast.isError ? '#ef4444' : 'rgba(255,255,255,0.97)',
              borderRadius: '14px', padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
              border: toast.isError ? 'none' : '1px solid rgba(0,0,0,0.06)',
              animation: 'fadeInDown 0.25s ease',
              pointerEvents: toast.isError ? 'none' : 'auto',
              cursor: toast.isError ? 'default' : 'pointer'
            }}
          >
            {toast.isError
              ? <span style={{ fontSize: '1.2rem' }}>❌</span>
              : toast.avatar
                ? <img src={toast.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{toast.senderName?.[0]?.toUpperCase()}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: toast.isError ? 'white' : '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.senderName}</div>
              <div style={{ fontSize: '0.8rem', color: toast.isError ? 'rgba(255,255,255,0.85)' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.preview}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="main-content-wrapper">
        <div className="feed-layout chat-feed-layout" style={{ maxWidth: '1400px', padding: 0 }}>
          <LeftSidebar />

          {/* ── CHAT LAYOUT ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', height: 'calc(100dvh - 116px)', overflow: 'hidden' }}>

            {/* ══════════════════════════════════
                SIDEBAR — Liste des conversations
                ══════════════════════════════════ */}
            <div
              className={`chat-sidebar-wrapper ${activeChat ? 'hidden-mobile' : ''}`}
            >

              {/* Barre de recherche */}
              <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.9rem 0.55rem 34px', borderRadius: 12, border: '1.5px solid #eee', outline: 'none', fontSize: '0.88rem', background: '#fafafa', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#eee'; e.target.style.background = '#fafafa'; }}
                  />
                </div>
              </div>

              {/* Liste scrollable */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '1.5rem 1rem', color: '#aaa', fontSize: '0.88rem', textAlign: 'center' }}>Chargement...</div>
                ) : (
                  <>
                    {/* Groupes */}
                    {filteredGroups.length > 0 && (
                      <>
                        <div style={{ padding: '0.75rem 1.2rem 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Groupes</div>
                        {filteredGroups.map(group => {
                          const isActive = activeChat?.data?.id === group.id;
                          const unread = unreadCounts.group[group.id] || 0;
                          return (
                            <div
                              key={group.id}
                              onClick={() => selectChat('group', group)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.7rem 1.2rem',
                                cursor: 'pointer',
                                background: isActive ? '#f0f7ec' : 'transparent',
                                borderLeft: `3px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                                transition: 'background 0.15s',
                              }}
                            >
                              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#2d4a22,#446b36)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0, position: 'relative' }}>
                                {group.name[0].toUpperCase()}
                                {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 8, border: '2px solid #fff', fontWeight: 700 }}>{unread}</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: unread > 0 ? 700 : 500, fontSize: '0.9rem', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
                                <div style={{ fontSize: '0.76rem', color: unread > 0 ? 'var(--color-primary)' : '#aaa', marginTop: 1 }}>Groupe · {unread > 0 ? `${unread} non lu${unread > 1 ? 's' : ''}` : 'Tap pour ouvrir'}</div>
                              </div>
                              <Users size={14} color="#ccc" style={{ flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Contacts */}
                    {filteredUsers.length > 0 && (
                      <>
                        <div style={{ padding: '0.75rem 1.2rem 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contacts</div>
                        {filteredUsers.map(user => {
                          const isActive = activeChat?.data?.id === user.id;
                          const unread = unreadCounts.user[user.id] || 0;
                          return (
                            <div
                              key={user.id}
                              onClick={() => selectChat('user', user)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.7rem 1.2rem',
                                cursor: 'pointer',
                                background: isActive ? '#f0f7ec' : 'transparent',
                                borderLeft: `3px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                                transition: 'background 0.15s',
                              }}
                            >
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <img
                                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username || 'U')}&background=2d4a22&color=fff&size=80`}
                                  alt=""
                                  style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }}
                                />
                                {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 8, border: '2px solid #fff', fontWeight: 700 }}>{unread}</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: unread > 0 ? 700 : 500, fontSize: '0.9rem', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.username}</div>
                                <div style={{ fontSize: '0.76rem', color: unread > 0 ? 'var(--color-primary)' : '#aaa', marginTop: 1 }}>@{user.username}</div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {filteredGroups.length === 0 && filteredUsers.length === 0 && (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#bbb', fontSize: '0.88rem' }}>
                        <MessageCircle size={32} style={{ opacity: 0.25, marginBottom: 8 }} />
                        <div>Aucune conversation</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════
                FENÊTRE DE CHAT
                ══════════════════════════════════ */}
            <div
              className={`chat-main-window ${!activeChat ? 'hidden-mobile' : 'mobile-fullscreen'}`}
            >
              {activeChat ? (
                <>
                  {/* ── Header ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', background: '#fff', borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0, minHeight: 58 }}>
                    {/* Bouton retour mobile */}
                    <button
                      className="hidden-desktop"
                      onClick={() => navigate('/chat')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--color-primary)', marginLeft: -4, flexShrink: 0 }}
                    >
                      <ArrowLeft size={22} />
                    </button>

                    {/* Avatar + infos — cliquable vers profil */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flex: 1, minWidth: 0, cursor: activeChat.type === 'user' ? 'pointer' : 'default' }}
                      onClick={() => activeChat.type === 'user' && navigate(`/profile/${activeChat.data.id}`)}
                    >
                      {activeChat.type === 'user' ? (
                        <img
                          src={activeChat.data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.data.full_name || 'U')}&background=2d4a22&color=fff&size=80`}
                          alt=""
                          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'linear-gradient(135deg,#2d4a22,#446b36)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                          {activeChat.data.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeChat.type === 'user' ? (activeChat.data.full_name || activeChat.data.username) : activeChat.data.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeChat.type === 'user' ? `@${activeChat.data.username}` : (activeChat.data.description || 'Groupe')}
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'Appel Vocal et Vidéo */}
                    {activeChat.type === 'user' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
                        <button
                          onClick={() => startCall(activeChat.data, 'audio')}
                          title="Appeler en vocal"
                          style={{
                            background: '#f0f7ec',
                            border: '1px solid rgba(45,74,34,0.15)',
                            borderRadius: '50%',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--color-primary)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Phone size={18} />
                        </button>
                        <button
                          onClick={() => startCall(activeChat.data, 'video')}
                          title="Appeler en vidéo"
                          style={{
                            background: '#f0f7ec',
                            border: '1px solid rgba(45,74,34,0.15)',
                            borderRadius: '50%',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--color-primary)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Video size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Zone messages ── */}
                  <div
                    ref={messagesContainerRef}
                    className="chat-messages-scroll"
                    style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {messages.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bbb', gap: '0.5rem' }}>
                        <MessageCircle size={36} style={{ opacity: 0.25 }} />
                        <span style={{ fontSize: '0.88rem' }}>Commencez la discussion…</span>
                      </div>
                    ) : (() => {
                      let lastDateStr = null;
                      return messages.map(msg => {
                        const isMe = activeChat.type === 'user' ? msg.sender_id === session.user.id : msg.user_id === session.user.id;
                        let payload = { text: msg.content };
                        try { const p = JSON.parse(msg.content); if (p.mediaUrl) payload = p; } catch {}

                        const msgDate = new Date(msg.created_at);
                        const dateStr = msgDate.toDateString();
                        const showDate = lastDateStr !== dateStr;
                        lastDateStr = dateStr;

                        let dateLabel = '';
                        if (showDate) {
                          const today = new Date();
                          const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                          if (dateStr === today.toDateString()) dateLabel = "Aujourd'hui";
                          else if (dateStr === yesterday.toDateString()) dateLabel = 'Hier';
                          else dateLabel = msgDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                        }

                        const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
                        const msgReactions = Object.entries(msg.reactions || {}).reduce((acc, [, rt]) => { acc[rt] = (acc[rt] || 0) + 1; return acc; }, {});

                        return (
                          <React.Fragment key={msg.id}>
                            {/* Séparateur de date */}
                            {showDate && (
                              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0 0.25rem' }}>
                                <span style={{ background: 'rgba(0,0,0,0.12)', color: '#fff', padding: '2px 10px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 500, backdropFilter: 'blur(4px)', textTransform: 'capitalize' }}>{dateLabel}</span>
                              </div>
                            )}

                            {/* Message */}
                            <SwipeableMessage msg={msg} isMe={isMe} onReply={setReplyingToMessage} onReact={handleReact}>
                              {/* Nom de l'envoyeur dans les groupes */}
                              {!isMe && activeChat.type === 'group' && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2, marginLeft: 4, display: 'block' }}>{msg.sender?.full_name || msg.sender?.username}</span>
                              )}

                              {/* Bulle */}
                              <div style={{
                                maxWidth: '78%',
                                padding: payload.mediaUrl ? '0.4rem' : '0.55rem 0.9rem',
                                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isMe ? 'linear-gradient(135deg,#2d4a22,#3d6030)' : '#fff',
                                color: isMe ? '#fff' : '#111',
                                boxShadow: isMe ? '0 2px 8px rgba(45,74,34,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                                position: 'relative',
                                opacity: msg._pending ? 0.72 : 1,
                                transition: 'opacity 0.2s',
                              }}>
                                {/* Bloc de réponse */}
                                {repliedMsg && (
                                  <div style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)', borderLeft: `3px solid ${isMe ? '#fff' : 'var(--color-primary)'}`, borderRadius: 6, padding: '0.3rem 0.6rem', marginBottom: '0.4rem', fontSize: '0.78rem' }}>
                                    <div style={{ fontWeight: 700, color: isMe ? '#fff' : 'var(--color-primary)', marginBottom: 1 }}>
                                      {repliedMsg.sender_id === session.user.id || repliedMsg.user_id === session.user.id ? 'Vous' : (repliedMsg.sender?.full_name || repliedMsg.sender?.username || '…')}
                                    </div>
                                    <div style={{ opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {(() => { let t = repliedMsg.content; try { const p = JSON.parse(t); t = p.text || (p.mediaUrl ? '📎 Média' : t); } catch {} return t; })()}
                                    </div>
                                  </div>
                                )}

                                {/* Média */}
                                {payload.mediaUrl && (
                                  <div style={{ marginBottom: payload.text ? '0.4rem' : 0 }}>
                                    {payload.mediaType?.startsWith('image/') && <img src={payload.mediaUrl} alt="Media" style={{ width: '100%', maxWidth: 240, borderRadius: 10, cursor: 'pointer', display: 'block' }} onClick={() => window.open(payload.mediaUrl, '_blank')} />}
                                    {payload.mediaType?.startsWith('video/') && <video src={payload.mediaUrl} controls style={{ width: '100%', maxWidth: 240, borderRadius: 10 }} />}
                                    {payload.mediaType?.startsWith('audio/') && <audio src={payload.mediaUrl} controls style={{ width: '100%' }} />}
                                    {!payload.mediaType?.match(/^(image|video|audio)\//) && <a href={payload.mediaUrl} target="_blank" rel="noreferrer" style={{ color: isMe ? '#fff' : 'var(--color-primary)', textDecoration: 'underline', fontSize: '0.85rem' }}>📎 Fichier joint</a>}
                                  </div>
                                )}

                                {/* Texte */}
                                {payload.text && <div style={{ fontSize: '0.92rem', lineHeight: 1.45, wordBreak: 'break-word' }}>{payload.text}</div>}

                                {/* Réactions badge */}
                                {Object.keys(msgReactions).length > 0 && (
                                  <div style={{ position: 'absolute', bottom: -14, [isMe ? 'right' : 'left']: 6, background: '#fff', borderRadius: 10, padding: '1px 6px', display: 'flex', gap: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.14)', border: '1px solid #f0f0f0', zIndex: 1, fontSize: '0.82rem' }}>
                                    {Object.entries(msgReactions).map(([type, count]) => {
                                      const r = REACTIONS.find(x => x.type === type);
                                      return r ? <span key={type}>{r.emoji}{count > 1 && <span style={{ fontSize: '0.65rem', color: '#555', marginLeft: 1 }}>{count}</span>}</span> : null;
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Heure + statut */}
                              <span style={{ fontSize: '0.68rem', color: '#999', marginTop: Object.keys(msgReactions).length > 0 ? '1.1rem' : '0.25rem', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                {msg._pending ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#bbb' }}>
                                    envoi…
                                    <span style={{ width: 9, height: 9, border: '1.5px solid #bbb', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                  </span>
                                ) : (
                                  <>{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<MessageTicks isMe={isMe} isRead={msg.is_read} isDelivered={msg.is_delivered} /></>
                                )}
                              </span>
                            </SwipeableMessage>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>

                  {/* ── Barre de réponse ── */}
                  {replyingToMessage && (
                    <div style={{ padding: '0.5rem 1rem', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '3px solid var(--color-primary)', flexShrink: 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 1 }}>
                          Réponse à {replyingToMessage.sender_id === session.user.id || replyingToMessage.user_id === session.user.id ? 'vous-même' : (replyingToMessage.sender?.full_name || replyingToMessage.sender?.username || '…')}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(() => { let t = replyingToMessage.content; try { const p = JSON.parse(t); t = p.text || (p.mediaUrl ? '📎 Média' : t); } catch {} return t; })()}
                        </div>
                      </div>
                      <button onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 4, flexShrink: 0 }}><X size={16} /></button>
                    </div>
                  )}

                  {/* ── Aperçu fichier ── */}
                  {mediaFile && (
                    <div style={{ padding: '0.45rem 1rem', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.8rem', color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {mediaFile.name}</span>
                      <button onClick={() => setMediaFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', flexShrink: 0, display: 'flex', alignItems: 'center' }}><X size={15} /></button>
                    </div>
                  )}

                  {/* ── Input ── */}
                  <div style={{ padding: '0.6rem 0.85rem', background: '#fff', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Bouton fichier */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', color: '#aaa', borderRadius: '50%', transition: 'color 0.15s', flexShrink: 0 }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'}
                        onMouseOut={e => e.currentTarget.style.color = '#aaa'}
                      >
                        <Paperclip size={20} />
                      </button>
                      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*,audio/*" onChange={e => setMediaFile(e.target.files[0])} />

                      {/* Input texte */}
                      <input
                        className="chat-input"
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Message…"
                        disabled={uploadingMedia}
                        style={{ flex: 1 }}
                      />

                      {/* Bouton envoyer */}
                      <button
                        type="submit"
                        disabled={(!newMessage.trim() && !mediaFile) || uploadingMedia}
                        className="chat-send-btn"
                        style={{ flexShrink: 0 }}
                      >
                        {uploadingMedia
                          ? <span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'block', animation: 'spin 0.8s linear infinite' }} />
                          : <Send size={17} style={{ marginLeft: -1 }} />}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                /* Écran d'accueil desktop */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#bbb' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#eae4d3,#f0ede6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={34} color="var(--color-primary)" style={{ opacity: 0.45 }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)', marginBottom: 4 }}>Vos Messages</div>
                    <div style={{ fontSize: '0.84rem', maxWidth: 240, lineHeight: 1.5 }}>Sélectionnez une conversation à gauche pour commencer.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;
