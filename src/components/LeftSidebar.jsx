import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Calendar, Home, User, Info, BookOpen, MessageCircle, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

const LeftSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
  const [profile, setProfile] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => { if (data) setProfile(data); });
      }
    });
  }, []);

  return (
    <div className="feed-sidebar-left">
      {profile && (
        <Link to="/profile" className="sidebar-link" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit', borderRadius: '8px', background: isActive('/profile') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username || 'U')}`} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          <h4 style={{ margin: 0, fontWeight: '600', fontSize: '1rem', color: 'var(--color-primary)' }}>{profile.full_name || profile.username}</h4>
        </Link>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
        <Link to="/" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <Home size={28} color="var(--color-primary)" /> Accueil
        </Link>
        <Link to="/users" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/users') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <Users size={28} color="#2d4a22" /> Amis
        </Link>
        <Link to="/groups" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/groups') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <Users size={28} color="#2bca53" /> Groupes
        </Link>
        <Link to="/chat" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/chat') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <MessageCircle size={28} color="#0ea5e9" /> Discussions
        </Link>
        <Link to="/events" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/events') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <Calendar size={28} color="#f5533d" /> Événements
        </Link>
        
        <div style={{ height: '1px', background: '#e4e6eb', margin: '0.5rem 1rem' }}></div>
        
        <Link to="/info" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/info') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <Info size={28} color="#94a3b8" /> Infos Ville
        </Link>
        <Link to="/about" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', textDecoration: 'none', color: '#050505', borderRadius: '8px', fontWeight: '500', background: isActive('/about') ? 'var(--color-bg-alt)' : 'transparent' }}>
          <BookOpen size={28} color="#d97706" /> Histoire
        </Link>
        
        <div style={{ height: '1px', background: '#e4e6eb', margin: '0.5rem 1rem' }}></div>
        
        <button onClick={handleLogout} className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '8px', fontWeight: '500' }}>
          <LogOut size={28} color="#ef4444" /> Déconnexion
        </button>
      </div>
    </div>
  );
};

export default LeftSidebar;
