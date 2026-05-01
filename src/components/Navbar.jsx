import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Home, Users, MessageCircle, Info, Calendar, BookOpen, Smartphone, Star, Settings } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async (sessionData) => {
      if (sessionData?.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', sessionData.user.id).single();
        setIsAdmin(profile?.role === 'admin');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    setIsOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Top Navbar - Logo & Menu & Tabs (Mobile Only) */}
      <nav className="mobile-top-navbar hidden-desktop">
        <div className="mobile-top-row">
          <Link to="/" className="navbar-logo" onClick={() => setIsOpen(false)}>
            🐘 ManjoCity
          </Link>
          <button
            className={`menu-btn ${isOpen ? 'active' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div className="mobile-tab-bar">
          <Link to="/" className={`tab-icon ${isActive('/') ? 'active' : ''}`}><Home size={26} /></Link>
          <Link to="/users" className={`tab-icon ${isActive('/users') ? 'active' : ''}`}><Users size={26} /></Link>
          <Link to="/groups" className={`tab-icon ${isActive('/groups') ? 'active' : ''}`}>
            <span style={{ position: 'relative', display: 'flex' }}>
              <Users size={26} />
              <div style={{ position: 'absolute', top: -2, right: -6, fontSize: '0.6rem', background: 'var(--color-primary)', color: 'white', borderRadius: '4px', padding: '0 2px' }}>Gr</div>
            </span>
          </Link>
          <Link to="/chat" className={`tab-icon ${isActive('/chat') ? 'active' : ''}`}><MessageCircle size={26} /></Link>
        </div>
      </nav>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', top: '116px', left: 0, width: '100%', height: 'calc(100vh - 116px)',
              background: 'rgba(0,0,0,0.5)', zIndex: 998
            }}
          />
          <div className="mobile-dropdown" style={{ zIndex: 999, top: '116px' }}>
            <Link to="/info" onClick={() => setIsOpen(false)}><Info size={18} /> Infos Ville</Link>
            <Link to="/about" onClick={() => setIsOpen(false)}><BookOpen size={18} /> Histoire</Link>
            <Link to="/events" onClick={() => setIsOpen(false)}><Calendar size={18} /> Événements</Link>
            <Link to="/devinfo" onClick={() => setIsOpen(false)} style={{ color: 'var(--color-secondary)', fontWeight: '600' }}><Smartphone size={18} /> Infos App</Link>
            <Link to="/avis" onClick={() => setIsOpen(false)} style={{ color: '#fbbf24', fontWeight: '600' }}><Star size={18} fill="#fbbf24" /> Donner votre avis</Link>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
            {session ? (
              <>
                <Link to="/profile" onClick={() => setIsOpen(false)}><User size={18} /> Mon Profil</Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} style={{ color: '#2d4a22', fontWeight: 'bold' }}>
                    <Settings size={18} /> Outils d'Admin
                  </Link>
                )}
                <button onClick={handleLogout} style={{ color: '#ef4444', background: 'none', border: 'none', width: '100%', textAlign: 'left', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.8rem 1rem', fontSize: '1rem', cursor: 'pointer' }}>
                  <LogOut size={18} /> Déconnexion
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)} style={{ color: 'var(--color-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.8rem 1rem', fontWeight: 'bold' }}>
                <User size={18} /> Connexion / Inscription
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
