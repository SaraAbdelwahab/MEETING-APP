import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../context/WebRTCContext';
import MeetingHeader from './advanced/MeetingHeader';
import VideoGrid from './advanced/VideoGrid';
import ControlBar from './advanced/ControlBar';
import RightPanel from './advanced/RightPanel';
import './MeetingRoomAdvanced.css';

const MeetingRoomAdvanced = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { localStream, remoteStreams, isAudioEnabled, isVideoEnabled, toggleAudio, toggleVideo, startScreenShare, stopScreenShare, isScreenSharing, joinCall, leaveCall } = useWebRTC();

  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [rightPanel, setRightPanel] = useState(null);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [reactions, setReactions] = useState([]);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [networkQuality, setNetworkQuality] = useState('good');
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [isHost, setIsHost] = useState(false);

  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!meetingId) return;
    fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(r => r.ok && r.json()).then(data => {
      setMeeting(data);
      setIsHost(data.host_id === user?.id);
    }).catch(console.error);
  }, [meetingId, user]);

  useEffect(() => {
    if (socket && isConnected && meetingId && user) joinCall(meetingId);
    return () => socket && meetingId && leaveCall();
  }, [socket, isConnected, meetingId, user]);

  useEffect(() => {
    if (!socket) return;
    const handlers = {
      'meeting-participants': (data) => setParticipants(data.participants || []),
      'receive-message': (msg) => {
        setMessages(prev => [...prev, { ...msg, text: msg.message || msg.text, username: msg.userEmail || msg.username }]);
        if (rightPanel !== 'chat') setUnreadCount(prev => prev + 1);
      },
      'hand-raise': ({ userId, raised }) => setRaisedHands(prev => { const s = new Set(prev); raised ? s.add(userId) : s.delete(userId); return s; }),
      'reaction': ({ userId, reaction }) => {
        const id = Date.now() + Math.random();
        setReactions(prev => [...prev, { id, userId, reaction }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
      },
      'active-speaker': ({ userId }) => setActiveSpeaker(userId),
      'user-typing': ({ userId, userEmail }) => {
        setTypingUsers(prev => new Set(prev).add(userEmail));
        if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
        typingTimeoutRef.current[userId] = setTimeout(() => setTypingUsers(prev => { const s = new Set(prev); s.delete(userEmail); return s; }), 3000);
      },
    };
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.keys(handlers).forEach(event => socket.off(event));
  }, [socket, rightPanel]);

  useEffect(() => {
    setConnectionStatus(!isConnected ? 'disconnected' : localStream ? 'connected' : 'connecting');
  }, [isConnected, localStream]);

  const handleToggleRightPanel = (panel) => {
    setRightPanel(rightPanel === panel ? null : panel);
    if (panel === 'chat') setUnreadCount(0);
  };

  const handleSendMessage = (text) => socket && text.trim() && socket.emit('send-message', { meetingId, message: text.trim() });
  const handleTyping = () => socket && socket.emit('typing', { meetingId });
  const handleToggleHandRaise = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    socket && socket.emit('hand-raise', { meetingId, userId: user.id, raised: newState });
  };
  const handleSendReaction = (reaction) => socket && socket.emit('reaction', { meetingId, userId: user.id, reaction });
  const handleCopyLink = () => navigator.clipboard.writeText(`${window.location.origin}/meeting/${meetingId}`);
  const handleLeave = () => { leaveCall(); navigate('/dashboard'); };
  const handlePinParticipant = (userId) => setPinnedUserId(userId === pinnedUserId ? null : userId);

  const allParticipants = [
    { userId: user?.id, username: user?.username, email: user?.email, isLocal: true, stream: localStream, isAudioEnabled, isVideoEnabled, isSpeaking: activeSpeaker === user?.id, handRaised, isPinned: pinnedUserId === user?.id },
    ...participants.map(p => ({ ...p, isLocal: false, stream: remoteStreams[p.socketId], isSpeaking: activeSpeaker === p.userId, handRaised: raisedHands.has(p.userId), isPinned: pinnedUserId === p.userId })),
  ];

  return (
    <div className="meeting-room-advanced">
      <MeetingHeader meetingTitle={meeting?.title || 'Meeting'} meetingId={meetingId} connectionStatus={connectionStatus} networkQuality={networkQuality} participantCount={allParticipants.length} isRecording={isRecording} />
      <div className="meeting-content">
        <div className="meeting-center">
          <VideoGrid participants={allParticipants} activeSpeaker={activeSpeaker} pinnedUserId={pinnedUserId} reactions={reactions} onPinParticipant={handlePinParticipant} />
        </div>
        {rightPanel && (
          <RightPanel type={rightPanel} messages={messages} participants={allParticipants} raisedHands={raisedHands} activeSpeaker={activeSpeaker} typingUsers={typingUsers} currentUserId={user?.id} isHost={isHost} onSendMessage={handleSendMessage} onTyping={handleTyping} onClose={() => setRightPanel(null)} />
        )}
      </div>
      <ControlBar isAudioEnabled={isAudioEnabled} isVideoEnabled={isVideoEnabled} isScreenSharing={isScreenSharing} handRaised={handRaised} chatOpen={rightPanel === 'chat'} participantsOpen={rightPanel === 'participants'} unreadCount={unreadCount} captionsEnabled={captionsEnabled} noiseSuppression={noiseSuppression} onToggleAudio={toggleAudio} onToggleVideo={toggleVideo} onToggleScreenShare={() => isScreenSharing ? stopScreenShare() : startScreenShare()} onToggleHandRaise={handleToggleHandRaise} onToggleChat={() => handleToggleRightPanel('chat')} onToggleParticipants={() => handleToggleRightPanel('participants')} onToggleCaptions={() => setCaptionsEnabled(!captionsEnabled)} onToggleNoiseSuppression={() => setNoiseSuppression(!noiseSuppression)} onSendReaction={handleSendReaction} onCopyLink={handleCopyLink} onLeave={handleLeave} />
    </div>
  );
};

export default MeetingRoomAdvanced;
