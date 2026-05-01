import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import LeftSidebar from '../components/LeftSidebar';
import imageCompression from 'browser-image-compression';
import ConfirmDialog from '../components/ConfirmDialog';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    cover_url: ''
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  // États pour l'upload (compression et barre de progression)
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // États pour les publications de l'utilisateur
  const [userPosts, setUserPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostImage, setEditPostImage] = useState(null);
  const [editPostImagePreview, setEditPostImagePreview] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showConfirm = (config) => new Promise(resolve => {
    setConfirmDialog({ ...config, onConfirm: () => { setConfirmDialog(null); resolve(true); }, onCancel: () => { setConfirmDialog(null); resolve(false); } });
  });

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        setEmail(user.email || '');
        const { data, error } = await supabase
          .from('profiles')
          .select(`username, full_name, bio, avatar_url, cover_url`)
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Erreur récupération profil:", error);
        } else if (data) {
          setProfile(data);
        }
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserPosts(userId) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUserPosts(data);
    }
  }

  // Hook séparé pour charger les posts une fois l'utilisateur connu
  useEffect(() => {
    if (user) {
      fetchUserPosts(user.id);
    }
  }, [user]);

  async function updateProfile() {
    try {
      setSaving(true);
      setMessage('');

      // Mise à jour du profil public
      const updates = {
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      // Mise à jour de l'email / mot de passe si changés
      let authMessage = '';
      const authUpdates = {};
      
      if (email && email !== user.email) {
        // Simple vérification d'email basique
        if (!email.includes('@')) throw new Error("Format d'email invalide.");
        authUpdates.email = email;
      } else if (!email && user.email) {
        throw new Error("L'adresse email ne peut pas être vide.");
      }

      if (password) {
        if (password.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        authUpdates.password = password;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) {
          // Ignorer l'erreur si le navigateur a juste auto-rempli l'ancien mot de passe
          if (!authError.message.includes('different from the old password')) {
            throw authError;
          }
        } else {
          authMessage = authUpdates.email ? ' (Vérifiez votre nouvelle adresse email si nécessaire)' : '';
        }
      }

      setMessage('Profil mis à jour avec succès !' + authMessage);
      setIsEditing(false);
      setPassword(''); // Vider le champ mot de passe par sécurité
      // Mettre à jour l'état local de l'utilisateur
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);

    } catch (error) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event) {
    try {
      setSaving(true);
      setMessage('');
      setUploadProgress(0);
      setUploadStatus('');

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image à uploader.');
      }

      let file = event.target.files[0];

      // 1. Compression si l'image dépasse 3 Mo
      if (file.size > 3 * 1024 * 1024) {
        alert("⚠️ Votre image dépasse 3 Mo. Elle va être compressée pour économiser de l'espace (max 2 Mo), ce qui peut réduire légèrement sa qualité.");
        setUploadStatus('Compression en cours...');

        const options = {
          maxSizeMB: 2,
          useWebWorker: true,
          onProgress: (progress) => {
            // La compression représente les premiers 50% de la barre
            setUploadProgress(Math.floor(progress / 2));
          }
        };

        file = await imageCompression(file, options);
      }

      setUploadProgress(uploadProgress > 0 ? 50 : 1);
      setUploadStatus('Envoi au serveur...');

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + 10;
          return next > 95 ? 95 : next;
        });
      }, 150);

      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('manjo-images')
        .upload(filePath, file, { upsert: true });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(100);
      setUploadStatus('Terminé !');

      const { data } = supabase.storage.from('manjo-images').getPublicUrl(filePath);

      setProfile({ ...profile, avatar_url: data.publicUrl });

      // Update the DB immediately (update, not upsert, to avoid erasing other fields)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);

      // Pause pour laisser l'utilisateur voir "100% Terminé !"
      await new Promise(r => setTimeout(r, 1500));

      setUploadProgress(0);
      setUploadStatus('');

    } catch (error) {
      setUploadProgress(0);
      setUploadStatus('');
      setMessage('Erreur upload avatar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(event) {
    try {
      setSaving(true);
      setMessage('');
      setUploadProgress(0);
      setUploadStatus('');

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image à uploader.');
      }

      let file = event.target.files[0];

      if (file.size > 3 * 1024 * 1024) {
        setUploadStatus('Compression en cours...');
        const options = { maxSizeMB: 2, useWebWorker: true, onProgress: (progress) => setUploadProgress(Math.floor(progress / 2)) };
        file = await imageCompression(file, options);
      }

      setUploadProgress(uploadProgress > 0 ? 50 : 1);
      setUploadStatus('Envoi au serveur...');

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + 10;
          return next > 95 ? 95 : next;
        });
      }, 150);

      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${user.id}-cover-${Math.random()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('manjo-images').upload(filePath, file, { upsert: true });
      clearInterval(progressInterval);
      if (uploadError) throw uploadError;

      setUploadProgress(100);
      setUploadStatus('Terminé !');

      const { data } = supabase.storage.from('manjo-images').getPublicUrl(filePath);
      setProfile({ ...profile, cover_url: data.publicUrl });
      await supabase.from('profiles').update({ cover_url: data.publicUrl }).eq('id', user.id);

      await new Promise(r => setTimeout(r, 1500));
      setUploadProgress(0);
      setUploadStatus('');

    } catch (error) {
      setUploadProgress(0);
      setUploadStatus('');
      setMessage('Erreur upload couverture: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  // Actions sur les publications
  const handleDeletePost = async (postId) => {
    const ok = await showConfirm({ title: 'Supprimer la publication ?', message: 'Cette action est irréversible.', confirmLabel: 'Oui, supprimer', type: 'danger' });
    if (ok) {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (!error) {
        fetchUserPosts(user.id);
      }
    }
  };

  const handleUpdatePost = async (postId) => {
    if (!editPostContent.trim() && !editPostImagePreview) return;
    
    setSaving(true);
    let finalImageUrl = editPostImagePreview;

    try {
      // 1. Si une nouvelle image a été sélectionnée, l'uploader
      if (editPostImage) {
        setUploadStatus('Compression image...');
        const options = { maxSizeMB: 2, useWebWorker: true };
        const compressedFile = await imageCompression(editPostImage, options);
        
        setUploadStatus('Envoi de l\'image...');
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${user.id}-post-${Date.now()}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('manjo-images')
          .upload(filePath, compressedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('manjo-images').getPublicUrl(filePath);
        finalImageUrl = data.publicUrl;
      }

      // 2. Mettre à jour le texte et l'URL de l'image
      const { data, error } = await supabase.from('posts').update({ 
        content: editPostContent,
        image_url: finalImageUrl
      }).eq('id', postId).select();

      if (error) {
        alert("Erreur lors de la modification : " + error.message);
      } else if (data && data.length === 0) {
        alert("La modification a été bloquée par le serveur (Politique de sécurité RLS manquante sur la table posts).");
      } else {
        setEditingPostId(null);
        setEditPostImage(null);
        setEditPostImagePreview(null);
        setUploadStatus('');
        fetchUserPosts(user.id);
      }
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ marginTop: '100px', textAlign: 'center' }}>Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="container" style={{ marginTop: '100px', textAlign: 'center' }}>Vous devez être connecté pour voir cette page.</div>;
  }

  return (
    <div className="main-content-wrapper" style={{ paddingBottom: '2rem' }}>
      <div className="feed-layout">
        <LeftSidebar />

        <div className="feed-main-content" style={{ marginTop: '2rem', flex: 1, maxWidth: '600px', margin: '2rem auto 0 auto', width: '100%' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0 }}>Mon Profil</h2>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={16} /> Modifier
                </button>
              )}
            </div>

            {message && (
              <div style={{ padding: '1rem', background: '#f0fdf4', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem' }}>
                {message}
              </div>
            )}

            {/* Wrapper relatif sans overflow:hidden pour laisser l'avatar déborder */}
            <div style={{ position: 'relative', marginBottom: '4rem' }}>

              {/* Cover Photo (overflow:hidden uniquement sur la cover) */}
              <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: profile.cover_url ? `url(${profile.cover_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  position: 'relative'
                }}>
                  {isEditing && (
                    <label style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(4px)', fontSize: '0.85rem' }}>
                      <Camera size={16} /> Modifier la couverture
                      <input type="file" accept="image/*" onChange={uploadCover} disabled={saving} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>

              {/* Avatar Container — en dehors du overflow:hidden pour ne pas être coupé */}
              <div style={{ position: 'absolute', bottom: '-50px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  <img
                    src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username || 'User')}&background=random`}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--color-bg)', background: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                  />
                  {isEditing && (
                    <label title="Modifier la photo de profil" style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'var(--color-primary)', color: 'white', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', border: '2px solid white', zIndex: 10 }}>
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={uploadAvatar} disabled={saving} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <h3 style={{ marginTop: '1rem', marginBottom: '0.2rem', fontSize: '1.4rem' }}>{profile.full_name || 'Anonyme'}</h3>
              <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem', margin: '0 0 1rem' }}>@{profile.username || 'utilisateur'}</p>
            </div>

            {/* Barre de progression */}
            {uploadProgress > 0 && (
              <div style={{ width: '100%', maxWidth: '300px', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#65676b', marginBottom: '0.3rem' }}>
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e4e6eb', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--color-primary)', width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <h4 style={{ margin: '1rem 0 0 0', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Informations Publiques</h4>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Nom complet</label>
                {isEditing ? (
                  <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                ) : (
                  <p style={{ margin: 0, padding: '0.8rem', background: '#f9fafb', borderRadius: '8px' }}>{profile.full_name || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Nom d'utilisateur</label>
                {isEditing ? (
                  <input type="text" value={profile.username || ''} onChange={(e) => setProfile({ ...profile, username: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                ) : (
                  <p style={{ margin: 0, padding: '0.8rem', background: '#f9fafb', borderRadius: '8px' }}>@{profile.username || 'Non renseigné'}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>À propos de moi</label>
                {isEditing ? (
                  <textarea value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows="4" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }} />
                ) : (
                  <p style={{ margin: 0, padding: '0.8rem', background: '#f9fafb', borderRadius: '8px', minHeight: '60px' }}>{profile.bio || 'Aucune biographie.'}</p>
                )}
              </div>

              <h4 style={{ margin: '1rem 0 0 0', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Sécurité et Connexion</h4>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Adresse Email</label>
                {isEditing ? (
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                ) : (
                  <p style={{ margin: 0, padding: '0.8rem', background: '#f9fafb', borderRadius: '8px' }}>{email}</p>
                )}
              </div>

              {isEditing && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                </div>
              )}

              {isEditing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                  <button onClick={updateProfile} disabled={saving} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                  <button onClick={() => { setIsEditing(false); getProfile(); setPassword(''); }} disabled={saving} className="btn btn-outline-danger" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <X size={18} /> Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section Mes Publications */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Mes Publications</h3>

            {userPosts.length === 0 ? (
              <div className="glass-card text-center" style={{ padding: '2rem', color: 'var(--color-text-light)' }}>
                Vous n'avez encore rien publié.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {userPosts.map(post => (
                  <div key={post.id} className="glass-card" style={{ padding: '1.5rem' }}>
                    {/* Mode Édition */}
                    {editingPostId === post.id ? (
                      <div>
                        <textarea
                          value={editPostContent}
                          onChange={(e) => setEditPostContent(e.target.value)}
                          style={{ width: '100%', minHeight: '100px', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', resize: 'vertical' }}
                        />
                        
                        {/* Prévisualisation de l'image en édition */}
                        {editPostImagePreview && (
                          <div style={{ position: 'relative', marginBottom: '1rem', borderRadius: '12px', overflow: 'hidden', display: 'inline-block' }}>
                            <img src={editPostImagePreview} alt="Preview" style={{ maxHeight: '200px', objectFit: 'contain', background: '#f0f2f5' }} />
                            <button
                              onClick={() => {
                                setEditPostImagePreview(null);
                                setEditPostImage(null);
                              }}
                              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500' }}>
                            <ImageIcon size={20} />
                            <span>Ajouter / Modifier l'image</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setEditPostImage(file);
                                  setEditPostImagePreview(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {uploadStatus && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>{uploadStatus}</span>}
                            <button onClick={() => handleUpdatePost(post.id)} disabled={saving} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                              {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button 
                              onClick={() => {
                                setEditingPostId(null);
                                setEditPostImage(null);
                                setEditPostImagePreview(null);
                                setUploadStatus('');
                              }} 
                              disabled={saving}
                              className="btn btn-outline-danger" style={{ padding: '0.5rem 1rem' }}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mode Affichage */
                      <div>
                        <p style={{ margin: '0 0 1rem 0', whiteSpace: 'pre-wrap', color: '#050505' }}>{post.content}</p>
                        {post.image_url && (
                          <div style={{ marginBottom: '1rem', borderRadius: '12px', overflow: 'hidden' }}>
                            <img src={post.image_url} alt="Post" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', background: '#f0f2f5' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                          <button
                            onClick={() => { 
                              setEditingPostId(post.id); 
                              setEditPostContent(post.content || '');
                              setEditPostImagePreview(post.image_url || null);
                              setEditPostImage(null);
                            }}
                            style={{ background: 'none', border: 'none', color: '#2d4a22', cursor: 'pointer', fontWeight: '600' }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="feed-sidebar-right"></div>
      </div>

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

export default Profile;

