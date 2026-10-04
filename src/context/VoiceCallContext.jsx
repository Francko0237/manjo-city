import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const VoiceCallContext = createContext();

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.timer = null;
  }

  playRingtone() {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ring = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      };

      ring();
      this.timer = setInterval(ring, 3000);
    } catch (e) {
      console.warn("Ringtone error:", e);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) {}
      this.ctx = null;
    }
  }
}

const soundManager = new SoundManager();

export const VoiceCallProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [peerUser, setPeerUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const timerRef = useRef(null);
  const channelRef = useRef(null);
  const targetChannelRef = useRef(null);

  // Initialize session & profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', session.user.id).single()
          .then(({ data }) => setMyProfile(data));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', session.user.id).single()
          .then(({ data }) => setMyProfile(data));
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Format call duration string
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Timer for connected calls
  useEffect(() => {
    if (callState === 'connected') {
      setDurationSeconds(0);
      timerRef.current = setInterval(() => {
        setDurationSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Clean up WebRTC peer connection & media streams
  const cleanupCall = useCallback(() => {
    soundManager.stop();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    if (targetChannelRef.current) {
      supabase.removeChannel(targetChannelRef.current);
      targetChannelRef.current = null;
    }
    pendingOfferRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  // End or cancel call
  const endCall = useCallback((notifyPeer = true) => {
    if (notifyPeer && peerUser?.id && targetChannelRef.current) {
      targetChannelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { from: myProfile?.id }
      });
    }
    setCallState('ended');
    setTimeout(() => {
      cleanupCall();
      setCallState('idle');
      setPeerUser(null);
    }, 1200);
  }, [peerUser, myProfile, cleanupCall]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel(`call_signaling_${session.user.id}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
        if (callState !== 'idle') {
          const ch = supabase.channel(`call_signaling_${payload.caller.id}`);
          ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              ch.send({ type: 'broadcast', event: 'call-busy', payload: {} });
            }
          });
          return;
        }

        setPeerUser(payload.caller);
        setCallType(payload.callType || 'audio');
        pendingOfferRef.current = payload;
        setCallState('ringing');
        soundManager.playRingtone();

        const callerChan = supabase.channel(`call_signaling_${payload.caller.id}`);
        callerChan.subscribe();
        targetChannelRef.current = callerChan;
      })
      .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
        soundManager.stop();
        if (pcRef.current && payload.answer) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            setCallState('connected');
          } catch (e) {
            console.error("Error setting remote answer:", e);
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pcRef.current && payload.candidate) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
      })
      .on('broadcast', { event: 'call-rejected' }, () => {
        soundManager.stop();
        setCallState('ended');
        setTimeout(() => {
          cleanupCall();
          setCallState('idle');
          setPeerUser(null);
        }, 1200);
      })
      .on('broadcast', { event: 'call-busy' }, () => {
        soundManager.stop();
        alert(`${peerUser?.full_name || 'L\'utilisateur'} est déjà en appel.`);
        cleanupCall();
        setCallState('idle');
        setPeerUser(null);
      })
      .on('broadcast', { event: 'call-ended' }, () => {
        cleanupCall();
        setCallState('ended');
        setTimeout(() => {
          setCallState('idle');
          setPeerUser(null);
        }, 1200);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, callState, cleanupCall, peerUser]);

  // Initiate an outgoing call (Audio or Video)
  const startCall = async (targetUser, type = 'audio') => {
    if (!session) {
      alert("Veuillez vous connecter pour passer un appel.");
      return;
    }
    if (callState !== 'idle') return;

    setPeerUser(targetUser);
    setCallType(type);
    setCallState('calling');
    soundManager.playRingtone();

    try {
      // 1. Get media access
      const constraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (type === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && targetChannelRef.current) {
          targetChannelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate }
          });
        }
      };

      // 3. Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4. Send offer via Supabase broadcast channel to target user
      const targetChan = supabase.channel(`call_signaling_${targetUser.id}`);
      targetChannelRef.current = targetChan;

      targetChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          targetChan.send({
            type: 'broadcast',
            event: 'call-offer',
            payload: {
              caller: myProfile || { id: session.user.id, username: 'Habitant', full_name: 'Habitant' },
              offer,
              callType: type
            }
          });
        }
      });
    } catch (err) {
      console.error("Error starting call:", err);
      alert("Impossible d'accéder au microphone/caméra : " + err.message);
      soundManager.stop();
      cleanupCall();
      setCallState('idle');
      setPeerUser(null);
    }
  };

  // Accept an incoming call
  const acceptCall = async () => {
    soundManager.stop();
    if (!pendingOfferRef.current || !peerUser) return;

    const offerData = pendingOfferRef.current;
    const type = offerData.callType || 'audio';

    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (type === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && targetChannelRef.current) {
          targetChannelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate }
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (targetChannelRef.current) {
        targetChannelRef.current.send({
          type: 'broadcast',
          event: 'call-answer',
          payload: { answer }
        });
      }

      setCallState('connected');
    } catch (err) {
      console.error("Error accepting call:", err);
      alert("Impossible d'accéder aux périphériques média.");
      endCall();
    }
  };

  // Reject an incoming call
  const rejectCall = () => {
    soundManager.stop();
    if (targetChannelRef.current) {
      targetChannelRef.current.send({
        type: 'broadcast',
        event: 'call-rejected',
        payload: {}
      });
    }
    cleanupCall();
    setCallState('idle');
    setPeerUser(null);
  };

  // Toggle microphone mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle camera video
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <VoiceCallContext.Provider
      value={{
        callState,
        callType,
        peerUser,
        isMuted,
        isCameraOff,
        callDuration: formatDuration(durationSeconds),
        localVideoRef,
        remoteVideoRef,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera
      }}
    >
      {children}
      {/* Hidden Audio element for remote voice stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCall = () => useContext(VoiceCallContext);
