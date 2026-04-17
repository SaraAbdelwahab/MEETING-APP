import { Shield, Lock, Globe, Users, Video, CheckCircle, Wifi, Cpu } from 'lucide-react';

const avatarColors = ['#1a8fff', '#a855f7', '#00d4ff', '#f59e0b'];
const avatarInitials = ['AK', 'MR', 'SC', 'JD'];

function MeetingCard() {
  return (
    <div
      className="glass-panel rounded-2xl p-4 w-64 animate-float-a"
      style={{
        boxShadow: '0 8px 40px rgba(26,143,255,0.2), 0 2px 10px rgba(0,0,0,0.4)',
        animationDelay: '0s',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
          />
          <span className="text-xs font-semibold text-white/80">Live Meeting</span>
        </div>
        <span className="text-xs text-white/40 font-mono">02:14:38</span>
      </div>

      <div
        className="rounded-xl overflow-hidden mb-3 relative scan-overlay"
        style={{
          background: 'linear-gradient(135deg, rgba(26,143,255,0.15), rgba(168,85,247,0.15))',
          height: '80px',
        }}
      >
        <div className="grid grid-cols-2 gap-1 p-2 h-full">
          {avatarInitials.map((init, i) => (
            <div
              key={i}
              className="rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: `${avatarColors[i]}22`, border: `1px solid ${avatarColors[i]}33` }}
            >
              <span style={{ color: avatarColors[i] }}>{init}</span>
            </div>
          ))}
        </div>
        <div
          className="absolute bottom-2 right-2 rounded-md px-2 py-0.5 flex items-center gap-1"
          style={{ background: 'rgba(26,143,255,0.2)', border: '1px solid rgba(26,143,255,0.3)' }}
        >
          <Video size={8} className="text-blue-400" />
          <span className="text-blue-300 text-[9px] font-semibold">4 Active</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {avatarColors.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
              style={{
                background: color,
                boxShadow: `0 0 0 1.5px #020917, 0 0 0 3px ${color}44`,
                zIndex: avatarColors.length - i,
              }}
            >
              {avatarInitials[i][0]}
            </div>
          ))}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-semibold"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              boxShadow: '0 0 0 1.5px #020917',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            +8
          </div>
        </div>
        <div
          className="rounded-lg px-2.5 py-1 flex items-center gap-1.5"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <CheckCircle size={9} className="text-green-400" />
          <span className="text-green-400 text-[9px] font-semibold">E2E Encrypted</span>
        </div>
      </div>
    </div>
  );
}

function SecurityCard() {
  return (
    <div
      className="glass-panel rounded-2xl p-4 w-52 animate-float-b"
      style={{
        boxShadow: '0 8px 40px rgba(168,85,247,0.2), 0 2px 10px rgba(0,0,0,0.4)',
        animationDelay: '1.2s',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center animate-lock-spin"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.3))',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 20px rgba(168,85,247,0.3)',
          }}
        >
          <Lock size={18} style={{ color: '#a855f7' }} />
        </div>
        <div>
          <div className="text-xs font-bold text-white">256-bit AES</div>
          <div className="text-[9px] text-white/40 mt-0.5">Military Grade</div>
        </div>
      </div>

      <div className="space-y-2">
        {['TLS 1.3 Active', 'Zero-Knowledge', 'FIPS 140-2'].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }}
            />
            <span className="text-[9px] text-white/60 font-medium">{item}</span>
            <CheckCircle size={9} className="ml-auto text-green-400" />
          </div>
        ))}
      </div>

      <div
        className="mt-3 rounded-lg px-3 py-1.5 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.15))',
          border: '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <span className="text-[9px] font-bold" style={{ color: '#a855f7' }}>SECURITY SCORE: 100</span>
      </div>
    </div>
  );
}

function NetworkCard() {
  return (
    <div
      className="glass-panel rounded-2xl p-4 w-48 animate-float-c"
      style={{
        boxShadow: '0 8px 40px rgba(0,212,255,0.15), 0 2px 10px rgba(0,0,0,0.4)',
        animationDelay: '0.7s',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe size={14} style={{ color: '#00d4ff' }} />
        <span className="text-xs font-bold text-white">Global Nodes</span>
      </div>

      <div className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>
        142
        <span className="text-sm font-medium text-white/40 ml-1">regions</span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <Wifi size={9} style={{ color: '#00d4ff' }} />
        <span className="text-[9px] text-white/50">99.99% uptime SLA</span>
      </div>

      <div className="flex gap-1">
        {[40, 55, 35, 70, 50, 80, 60, 90, 65, 75].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h * 0.3}px`,
              background: `rgba(0,212,255,${0.3 + h / 200})`,
              boxShadow: h > 70 ? '0 0 6px rgba(0,212,255,0.5)' : 'none',
            }}
          />
        ))}
      </div>
      <div className="text-[8px] text-white/30 mt-1">Network latency (last 10s)</div>
    </div>
  );
}

function UsersCard() {
  return (
    <div
      className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 w-52 animate-float-a"
      style={{
        boxShadow: '0 4px 30px rgba(26,143,255,0.15)',
        animationDelay: '2s',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(26,143,255,0.15)', border: '1px solid rgba(26,143,255,0.25)' }}
      >
        <Users size={16} style={{ color: '#1a8fff' }} />
      </div>
      <div>
        <div className="text-xs font-bold text-white">
          <span className="text-shimmer">2.4M+</span> users
        </div>
        <div className="text-[9px] text-white/40 mt-0.5">Across 95 countries</div>
      </div>
      <Cpu size={10} className="text-white/20 ml-auto" />
    </div>
  );
}

export default function FloatingCards() {
  return (
    <div className="relative w-full h-full pointer-events-none">
      <div className="absolute top-4 left-0 md:left-4 z-20">
        <MeetingCard />
      </div>
      <div className="absolute top-16 right-0 md:right-0 z-20">
        <SecurityCard />
      </div>
      <div className="absolute bottom-24 left-4 md:left-8 z-20">
        <NetworkCard />
      </div>
      <div className="absolute bottom-4 right-0 md:right-4 z-20">
        <UsersCard />
      </div>
    </div>
  );
}
