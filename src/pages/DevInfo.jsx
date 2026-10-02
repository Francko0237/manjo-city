import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Globe, Code2, Smartphone, Palette } from 'lucide-react';

const DevInfo = () => {
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      zIndex: 9999,
      background: 'var(--color-bg)',
      overflowY: 'auto'
    }}>
      <div className="container" style={{ maxWidth: '640px', padding: '2rem 1rem' }}>

        {/* Bouton retour */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '600', marginBottom: '1.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={20} /> Retour
        </Link>

        {/* Hero Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
          borderRadius: '24px',
          padding: '2.5rem',
          textAlign: 'center',
          color: 'white',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Motif de fond décoratif */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }}
            viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="white" d="M10,0 L20,10 L10,20 L0,10 Z M50,0 L60,10 L50,20 L40,10 Z M90,0 L100,10 L90,20 L80,10 Z M130,0 L140,10 L130,20 L120,10 Z M170,0 L180,10 L170,20 L160,10 Z M30,20 L40,30 L30,40 L20,30 Z M70,20 L80,30 L70,40 L60,30 Z M110,20 L120,30 L110,40 L100,30 Z M150,20 L160,30 L150,40 L140,30 Z M190,20 L200,30 L190,40 L180,30 Z" />
          </svg>

          <img 
            src="/dev-profile.png" 
            alt="Yamga Mokube Franck Daniel" 
            onClick={() => setIsPhotoOpen(true)}
            style={{
              width: '120px', 
              height: '120px',
              objectFit: 'cover',
              borderRadius: '50%',
              margin: '0 auto 1.2rem',
              display: 'block',
              border: '4px solid rgba(255,255,255,0.4)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: 2,
              cursor: 'pointer'
            }}
          />

          <h1 style={{ color: 'white', fontSize: '1.5rem', margin: '0 0 0.3rem', fontFamily: 'var(--font-heading)' }}>
            ManjoCity
          </h1>
          <p style={{ margin: '0 0 0.8rem', opacity: 0.85, fontSize: '0.95rem' }}>
            Le réseau social de Manjo & de la vallée du Moungo
          </p>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '0.3rem 1rem', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.3)' }}>
            v1.0.0 • 2026
          </div>
        </div>

        {/* Card Développeur */}
        <div className="glass-card" style={{ padding: '1.8rem', marginBottom: '1rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
            <Code2 size={20} color="var(--color-primary)" />
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>Développé par</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: '14px', marginBottom: '1.2rem' }}>
            <div style={{
              width: '56px', height: '56px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '800', fontSize: '1.4rem',
              flexShrink: 0,
              fontFamily: 'var(--font-heading)',
            }}>Y</div>
            <div>
              <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.05rem', color: '#1a1a1a' }}>Yamga Mokube Franck Daniel</h3>
              <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Développeur Full-Stack &amp; Mobile</p>
            </div>
          </div>

          <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 1.2rem' }}>
            Passionné par la création de solutions digitales modernes, je conçois des applications web et mobile
            sur mesure qui allient performance, design soigné et expérience utilisateur intuitive.
          </p>

          {/* Services */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.2rem' }}>
            {[
              { icon: <Globe size={16} />, label: 'Sites Web' },
              { icon: <Smartphone size={16} />, label: 'Applications Mobile' },
              { icon: <Palette size={16} />, label: 'Design UI/UX' },
              { icon: <Code2 size={16} />, label: 'Full-Stack' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#374151', fontWeight: '500' }}>
                <span style={{ color: 'var(--color-primary)' }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 1rem', fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contactez-moi
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <a href="tel:+237670619582" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', background: 'var(--color-bg-alt)', borderRadius: '12px', textDecoration: 'none', color: '#1a1a1a', transition: 'background 0.2s' }}>
              <div style={{ width: '36px', height: '36px', background: 'var(--color-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={16} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>670 619 582</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>Appel / WhatsApp</div>
              </div>
            </a>

            <a href="tel:+237677556867" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', background: 'var(--color-bg-alt)', borderRadius: '12px', textDecoration: 'none', color: '#1a1a1a', transition: 'background 0.2s' }}>
              <div style={{ width: '36px', height: '36px', background: 'var(--color-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={16} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>677 556 867</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>Appel / WhatsApp</div>
              </div>
            </a>

            <a href="mailto:danielfranck215@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', background: 'var(--color-bg-alt)', borderRadius: '12px', textDecoration: 'none', color: '#1a1a1a', transition: 'background 0.2s' }}>
              <div style={{ width: '36px', height: '36px', background: 'var(--color-secondary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={16} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>danielfranck215@gmail.com</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>Email professionnel</div>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.8rem', padding: '1rem 0' }}>
          ❤️  ManjoCity 2026
        </p>
        {/* Modal d'image en plein écran */}
        {isPhotoOpen && (
          <div 
            onClick={() => setIsPhotoOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100dvh',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100000,
              cursor: 'zoom-out',
              animation: 'reactionBarIn 0.2s ease'
            }}
          >
            <img 
              src="/dev-profile.png" 
              alt="Yamga Mokube Franck Daniel" 
              style={{
                maxWidth: '95%',
                maxHeight: '95%',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                transform: 'scale(1)',
                transition: 'transform 0.2s'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DevInfo;
