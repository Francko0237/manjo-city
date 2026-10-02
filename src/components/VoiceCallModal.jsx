import React from 'react';
import { useVoiceCall } from '../context/VoiceCallContext';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

const VoiceCallModal = () => {
  const { callState, peerUser, isMuted, callDuration, acceptCall, rejectCall, endCall, toggleMute } = useVoiceCall();

  if (callState === 'idle' || !peerUser) return null;

  const displayName = peerUser.full_name || peerUser.username || 'Habitant Manjo';
  const avatarUrl = peerUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2d4a22&color=fff&size=150`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 12, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3rem 1.5rem 4rem',
        color: 'white',
        animation: 'fadeIn 0.25s ease forwards'
      }}
    >
      {/* ── Entête de l'Appel ── */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '0.5rem' }}>
          {callState === 'calling' && 'Appel vocal en cours...'}
          {callState === 'ringing' && 'Appel vocal entrant...'}
          {callState === 'connected' && 'En communication'}
          {callState === 'ended' && 'Appel terminé'}
        </div>
        <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 700, color: '#fff' }}>{displayName}</h2>
        {callState === 'connected' && (
          <div style={{ fontSize: '1.1rem', color: '#48bb78', fontWeight: 600, marginTop: '0.4rem', fontFamily: 'monospace' }}>
            {callDuration}
          </div>
        )}
      </div>

      {/* ── Avatar central avec pulsation ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0' }}>
        {/* Cercles d'animation d'ondes vocales */}
        {(callState === 'calling' || callState === 'ringing' || callState === 'connected') && (
          <>
            <div
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: callState === 'ringing' ? 'rgba(72, 187, 120, 0.25)' : 'rgba(45, 74, 34, 0.4)',
                animation: 'pulseRing 2s infinite ease-in-out'
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: callState === 'ringing' ? 'rgba(72, 187, 120, 0.12)' : 'rgba(45, 74, 34, 0.2)',
                animation: 'pulseRing 2s infinite ease-in-out 0.5s'
              }}
            />
          </>
        )}

        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 2
          }}
        />
      </div>

      {/* ── Boutons d'Action ── */}
      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', justifyContent: 'center', gap: '2rem', alignItems: 'center' }}>
        {/* Cas 1 : Appel Entrant (Ringing) */}
        {callState === 'ringing' && (
          <>
            {/* Bouton Refuser */}
            <button
              onClick={rejectCall}
              title="Refuser"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ef4444',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
                transition: 'transform 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <PhoneOff size={28} />
            </button>

            {/* Bouton Accepter */}
            <button
              onClick={acceptCall}
              title="Décrocher"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#22c55e',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)',
                animation: 'bounceCall 1.2s infinite ease-in-out'
              }}
            >
              <Phone size={28} />
            </button>
          </>
        )}

        {/* Cas 2 : Appel Sortant (Calling) ou Connecté (Connected) */}
        {(callState === 'calling' || callState === 'connected') && (
          <>
            {/* Bouton Mute */}
            <button
              onClick={toggleMute}
              title={isMuted ? "Réactiver le micro" : "Couper le micro"}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: isMuted ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Bouton Raccrocher */}
            <button
              onClick={() => endCall(true)}
              title="Raccrocher"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ef4444',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
                transition: 'transform 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <PhoneOff size={28} />
            </button>
          </>
        )}

        {/* Cas 3 : Appel Terminé */}
        {callState === 'ended' && (
          <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '1.1rem' }}>
            Appel raccroché
          </div>
        )}
      </div>

      {/* CSS Animations inline */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes bounceCall {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
};

export default VoiceCallModal;
