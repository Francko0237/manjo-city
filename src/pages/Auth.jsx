import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Check if user is an admin from profiles table
        let userRole = 'user';
        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
          userRole = profile?.role;
        }

        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        // Since we disabled email confirmation locally, they might be logged in, let's just log them in or redirect
        const authUser = (await supabase.auth.getUser()).data.user;
        let userRole = 'user';
        if (authUser) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', authUser.id).single();
          userRole = profile?.role;
        }
        if (userRole === 'admin') navigate('/admin');
        else navigate('/');
      }
    } catch (error) {
      // In case of error (e.g. if the user isn't instantly logged in after signup, which shouldn't happen with auto confirm)
      if (error?.message?.includes('Auth session missing')) {
         setMessage({ text: 'Inscription réussie ! Vous pouvez maintenant vous connecter.', type: 'success' });
         setIsLogin(true);
      } else {
         setMessage({ text: error?.message || "Une erreur inattendue s'est produite.", type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content-wrapper auth-page">
      <div className="container auth-page-inner">
        <div className="glass-card auth-glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 className="text-center mb-2" style={{ color: 'var(--color-primary)' }}>
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="text-center" style={{ color: 'var(--color-text-light)', marginBottom: '2rem' }}>
          {isLogin ? 'Rejoignez la communauté de ManjoCity' : 'Inscrivez-vous pour interagir avec la communauté'}
        </p>

        {message.text && (
          <div style={{
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem', 
            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: message.type === 'error' ? '#991b1b' : '#166534',
            fontSize: '0.9rem'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: '#9ca3af' }} />
                <input 
                  type="text" 
                  placeholder="Nom complet" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  required={!isLogin}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: '#9ca3af' }} />
                <input 
                  type="text" 
                  placeholder="Nom d'utilisateur unique" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: '#9ca3af' }} />
            <input 
              type="email" 
              placeholder="Adresse email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: '#9ca3af' }} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Mot de passe" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Patientez...' : (isLogin ? <><LogIn size={18}/> Se Connecter</> : <><UserPlus size={18}/> S'inscrire</>)}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--color-text-light)' }}>
            {isLogin ? "Vous n'avez pas de compte ? " : "Vous avez déjà un compte ? "}
          </span>
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage({text:'', type:''}); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Auth;
