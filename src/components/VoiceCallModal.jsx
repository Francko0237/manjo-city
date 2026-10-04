import React from 'react';
import { useVoiceCall } from '../context/VoiceCallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const VoiceCallModal = () => {
  const {
    callState,
    callType,
    peerUser,
    isMuted,
    isCameraOff,
    callDuration,
    localVideoRef,
    remoteVideoRef,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera
  } = useVoiceCall();

  if (callState === 'idle' || !peerUser) return null;

  const displayName = peerUser.full_name || peerUser.username || 'Habitant Manjo';
  const avatarUrl = peerUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2d4a22&color=fff&size=150`;

  const isVideo = callType === 'video';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: isVideo && callState === 'connected' ? '#000' : 'rgba(15, 23, 12, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isVideo && callState === 'connected' ? '1.5rem 1rem 3rem' : '3rem 1.5rem 4rem',
        color: 'white',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease forwards'
      }}
    >
      {/* ── Mode Vidéo : Vidéo Distante Plein Écran ── */}
      {isVideo && callState === 'connected' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#111' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* ── Mode Vidéo : Ma Caméra locale (Picture-in-Picture) ── */}
      {isVideo && (callState === 'calling' || callState === 'connected') && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10,
            width: '110px',
            height: '150px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
            background: '#222'
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isCameraOff ? 'none' : 'block'
            }}
          />
          {isCameraOff && (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>
              <VideoOff size={24} color="#888" />
            </div>
          )}
        </div>
      )}

      {/* ── Entête de l'Appel ── */}
      <div style={{ textAlign: 'center', marginTop: '1rem', zIndex: 5, position: 'relative' }}>
        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: '0.4rem', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
          {callState === 'calling' && (isVideo ? 'Appel vidéo en cours...' : 'Appel vocal en cours...')}
          {callState === 'ringing' && (isVideo ? 'Appel vidéo entrant...' : 'Appel vocal entrant...')}
          {callState === 'connected' && (isVideo ? 'Appel vidéo' : 'En communication')}
          {callState === 'ended' && 'Appel terminé'}
        </div>
        <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 700, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>{displayName}</h2>
        {callState === 'connected' && (
          <div style={{ fontSize: '1.1rem', color: '#48bb78', fontWeight: 600, marginTop: '0.4rem', fontFamily: 'monospace', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
            {callDuration}
          </div>
        )}
      </div>

      {/* ── Avatar central avec pulsation (si pas en vidéo ou si en attente/ringing) ── */}
      {(!isVideo || callState !== 'connected') && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0', zIndex: 5 }}>
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
      )}

      {/* Space filler for connected video mode */}
      {isVideo && callState === 'connected' && <div style={{ flex: 1 }} />}

      {/* ── Boutons d'Action ── */}
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center', zIndex: 10, position: 'relative' }}>
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
              title={isVideo ? "Décrocher en vidéo" : "Décrocher"}
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
              {isVideo ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </>
        )}

        {/* Cas 2 : Appel Sortant (Calling) ou Connecté (Connected) */}
        {(callState === 'calling' || callState === 'connected') && (
          <>
            {/* Bouton Mute Micro */}
            <button
              onClick={toggleMute}
              title={isMuted ? "Réactiver le micro" : "Couper le micro"}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: isMuted ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backdropFilter: 'blur(8px)'
              }}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Bouton Toggle Caméra (Vidéo) */}
            {isVideo && (
              <button
                onClick={toggleCamera}
                title={isCameraOff ? "Activer la caméra" : "Désactiver la caméra"}
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: isCameraOff ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

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
