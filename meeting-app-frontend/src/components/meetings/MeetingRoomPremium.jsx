import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../context/WebRTCContext';
import MeetingHeader from './premium/MeetingHeader';
import VideoGrid from './premium/VideoGrid';
import ChatPanel from './premium/ChatPanel';
import ParticipantPanel from './premium/ParticipantPanel';
import ControlBar from './premium/ControlBar';
import './MeetingRoomPremium.css';

const MeetingRoomPremium = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    joinCall,
    leaveCall,
    startCamera,
  } = useWebRTC();

  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [rightPanel, setRightPanel] = useState(null); // 'chat' | 'participants' | null
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [pinnedUserId, setPinnedUserId] = useState(null);

  const typingTimeoutRef = useRef({});

  // Fetch meeting details
  useEffect(() => {
    if (!meetingId) return;

    const fetchMeeting = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMeeting(data);
        }
      } catch (error) {
        console.error('Failed to fetch meeting:', error);
      }
    };

    fetchMeeting();
  }, [meetingId]);

  // Join call on mount
  useEffect(() => {
    if (socket && isConnected && meetingId && user) {
      joinCall(meetingId);
    }

    return () => {
      if (socket && meetingId) {
        leaveCall();
      }
    };
  }, [socket, isConnected, meetingId, user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleParticipants = (data) => {
      setParticipants(data.participants || []);
    };

    const handleChatMessage = (message) => {
      setMessages((prev) => [...prev, {
        ...message,
        text: message.message || message.text,
        username: message.userEmail || message.username,
      }]);
      if (rightPanel !== 'chat') {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleHandRaise = ({ userId, raised }) => {
      setRaisedHands((prev) => {
        const newSet = new Set(prev);
        if (raised) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    const handleActiveSpeaker = ({ userId }) => {
      setActiveSpeaker(userId);
    };

    const handleTyping = ({ userId, userEmail }) => {
      setTypingUsers((prev) => new Set(prev).add(userEmail));
      
      if (typingTimeoutRef.current[userId]) {
        clearTimeout(typingTimeoutRef.current[userId]);
      }
      
      typingTimeoutRef.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userEmail);
          return newSet;
        });
      }, 3000);
    };

    socket.on('meeting-participants', handleParticipants);
    socket.on('receive-message', handleChatMessage);
    socket.on('hand-raise', handleHandRaise);
    socket.on('active-speaker', handleActiveSpeaker);
    socket.on('user-typing', handleTyping);

    return () => {
      socket.off('meeting-participants', handleParticipants);
      socket.off('receive-message', handleChatMessage);
      socket.off('hand-raise', handleHandRaise);
      socket.off('active-speaker', handleActiveSpeaker);
      socket.off('user-typing', handleTyping);
    };
  }, [socket, rightPanel]);

  // Monitor connection status
  useEffect(() => {
    if (!isConnected) {
      setConnectionStatus('disconnected');
    } else if (localStream) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
    }
  }, [isConnected, localStream]);

  const handleToggleRightPanel = (panel) => {
    console.log('🔘 [MeetingRoom] Toggle panel:', panel, 'Current:', rightPanel);
    if (rightPanel === panel) {
      setRightPanel(null);
    } else {
      setRightPanel(panel);
      if (panel === 'chat') {
        setUnreadCount(0);
      }
    }
  };

  const handleSendMessage = (text) => {
    if (!socket || !text.trim()) return;

    console.log('💬 [MeetingRoom] Sending message:', text);
    socket.emit('send-message', {
      meetingId,
      message: text.trim(),
    });
  };

  const handleTyping = () => {
    if (!socket) return;
    socket.emit('typing', {
      meetingId,
    });
  };

  const handleToggleHandRaise = () => {
    if (!socket) return;
    const newState = !handRaised;
    console.log('✋ [MeetingRoom] Toggle hand raise:', newState);
    setHandRaised(newState);
    socket.emit('hand-raise', {
      meetingId,
      userId: user.id,
      raised: newState,
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/meeting/${meetingId}`;
    console.log('🔗 [MeetingRoom] Copying link:', link);
    navigator.clipboard.writeText(link);
  };

  const handleLeave = () => {
    console.log('📞 [MeetingRoom] Leaving call');
    leaveCall();
    navigate('/dashboard');
  };

  const handlePinParticipant = (userId) => {
    console.log('📌 [MeetingRoom] Toggle pin:', userId);
    setPinnedUserId(userId === pinnedUserId ? null : userId);
  };

  const handleToggleAudio = () => {
    console.log('🎤 [MeetingRoom] Toggle audio. Current:', isAudioEnabled);
    toggleAudio();
  };

  const handleToggleVideo = () => {
    console.log('📹 [MeetingRoom] Toggle video. Current:', isVideoEnabled);
    toggleVideo();
  };

  const handleToggleScreenShare = () => {
    console.log('🖥️ [MeetingRoom] Toggle screen share. Current:', isScreenSharing);
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  // Build participant list with local user
  const allParticipants = [
    {
      userId: user?.id,
      username: user?.username,
      email: user?.email,
      isLocal: true,
      stream: localStream,
      isAudioEnabled,
      isVideoEnabled,
      isSpeaking: activeSpeaker === user?.id,
      handRaised: handRaised,
      isPinned: pinnedUserId === user?.id,
    },
    ...participants.map((p) => ({
      ...p,
      isLocal: false,
      stream: remoteStreams[p.socketId],
      isSpeaking: activeSpeaker === p.userId,
      handRaised: raisedHands.has(p.userId),
      isPinned: pinnedUserId === p.userId,
    })),
  ];

  return (
    <div className="meeting-room-premium">
      <MeetingHeader
        meetingTitle={meeting?.title || 'Meeting'}
        meetingId={meetingId}
        connectionStatus={connectionStatus}
        participantCount={allParticipants.length}
      />

      <div className="meeting-content">
        <div className="meeting-center">
          <VideoGrid
            participants={allParticipants}
            activeSpeaker={activeSpeaker}
            pinnedUserId={pinnedUserId}
            onPinParticipant={handlePinParticipant}
          />
        </div>

        {rightPanel && (
          <div className="meeting-right-panel">
            {rightPanel === 'chat' && (
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                typingUsers={typingUsers}
                currentUserId={user?.id}
                onClose={() => setRightPanel(null)}
              />
            )}
            {rightPanel === 'participants' && (
              <ParticipantPanel
                participants={allParticipants}
                raisedHands={raisedHands}
                activeSpeaker={activeSpeaker}
                currentUserId={user?.id}
                onClose={() => setRightPanel(null)}
              />
            )}
          </div>
        )}
      </div>

      <ControlBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        handRaised={handRaised}
        chatOpen={rightPanel === 'chat'}
        participantsOpen={rightPanel === 'participants'}
        unreadCount={unreadCount}
        hasStream={!!localStream}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleChat={() => handleToggleRightPanel('chat')}
        onToggleParticipants={() => handleToggleRightPanel('participants')}
        onCopyLink={handleCopyLink}
        onLeave={handleLeave}
        onStartCamera={async () => {
          console.log('🎥 [MeetingRoom] Starting camera from control bar');
          try {
            await startCamera();
            console.log('✅ [MeetingRoom] Camera started successfully');
          } catch (error) {
            console.error('❌ [MeetingRoom] Failed to start camera:', error);
            alert('Failed to start camera: ' + error.message);
          }
        }}
      />
    </div>
  );
};

export default MeetingRoomPremium;
