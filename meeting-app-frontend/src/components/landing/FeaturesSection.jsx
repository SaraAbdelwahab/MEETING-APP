import { Shield, Globe, Zap, Lock, Users, BarChart3, Fingerprint, Clock } from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'Zero-Knowledge Encryption',
    desc: 'We never hold your decryption keys. Your meetings are cryptographically sealed even from us.',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
  },
  {
    icon: Globe,
    title: 'Global Edge Network',
    desc: '142 PoPs across 6 continents. Sub-50ms latency guaranteed for participants anywhere on Earth.',
    color: '#1a8fff',
    glow: 'rgba(26,143,255,0.15)',
  },
  {
    icon: Zap,
    title: 'HD Quality, No Lag',
    desc: 'Adaptive 4K streaming with AI-powered noise cancellation and background blur built-in.',
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.15)',
  },
  {
    icon: Fingerprint,
    title: 'Biometric Authentication',
    desc: 'Multi-factor auth with face recognition and hardware key support via FIDO2/WebAuthn.',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
  },
  {
    icon: Users,
    title: 'Rooms up to 10,000',
    desc: 'Host all-hands, conferences, and webinars for thousands of participants without friction.',
    color: '#1a8fff',
    glow: 'rgba(26,143,255,0.15)',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    desc: 'Real-time engagement heatmaps, attendance reports, and AI-generated meeting summaries.',
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.15)',
  },
  {
    icon: Shield,
    title: 'Compliance Ready',
    desc: 'SOC 2 Type II, HIPAA, GDPR, and ISO 27001 out of the box. Audit logs retained for 7 years.',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.15)',
  },
  {
    icon: Clock,
    title: '99.99% Uptime SLA',
    desc: 'Backed by a contractual SLA. Real-time status page and dedicated enterprise support 24/7.',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-32 overflow-hidden" style={{ background: '#020917' }}>
      <div className="absolute inset-0 section-glow pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold mb-5"
            style={{
              background: 'rgba(26,143,255,0.08)',
              border: '1px solid rgba(26,143,255,0.2)',
              color: '#60c5ff',
            }}
          >
            Built for security-conscious teams
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
            Everything secure meetings<br />
            <span className="text-gradient">should be.</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            From military-grade encryption to enterprise compliance, Vaultex delivers the infrastructure the world's most sensitive organizations trust.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc, color, glow }) => (
            <div key={title} className="feature-card rounded-2xl p-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: glow,
                  border: `1px solid ${color}33`,
                  boxShadow: `0 0 20px ${glow}`,
                }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="text-sm font-bold text-white mb-2 leading-snug">{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
