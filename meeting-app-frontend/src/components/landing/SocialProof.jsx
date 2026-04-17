import { ArrowRight, Shield } from 'lucide-react';

const stats = [
  { value: '2.4M+', label: 'Active Users', sub: 'Professionals globally' },
  { value: '142', label: 'Edge Regions', sub: 'On 6 continents' },
  { value: '99.99%', label: 'Uptime SLA', sub: 'Contractually guaranteed' },
  { value: '0', label: 'Breaches', sub: 'Since inception' },
];

const logos = ['Goldman', 'Palantir', 'Airbus', 'Siemens', 'Roche', 'Samsung', 'KPMG', 'Deloitte'];

const testimonials = [
  {
    quote: 'Vaultex replaced three separate tools for us. Security, scale, and simplicity — finally in one place.',
    name: 'Ayasha Kiran',
    title: 'CISO, Global FinTech',
    avatar: '#1a8fff',
    initials: 'AK',
  },
  {
    quote: 'We operate under the most stringent compliance requirements. Vaultex passed our audit without a single gap.',
    name: 'Marcus Reinhold',
    title: 'Head of IT, EU Aerospace',
    avatar: '#a855f7',
    initials: 'MR',
  },
  {
    quote: 'Rolling out to 40,000 employees across 60 countries took under a week. The infrastructure just scales.',
    name: 'Sofia Chen',
    title: 'VP Engineering, MedTech',
    avatar: '#00d4ff',
    initials: 'SC',
  },
];

export default function SocialProof() {
  return (
    <>
      <section className="relative py-20" style={{ background: 'linear-gradient(180deg, #020917 0%, #04101e 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(26,143,255,0.1)', boxShadow: '0 0 60px rgba(26,143,255,0.05)' }}
          >
            {stats.map(({ value, label, sub }, i) => (
              <div
                key={label}
                className="text-center py-10 px-6 relative"
                style={{
                  background: 'rgba(7,21,48,0.6)',
                  borderRight: i < 3 ? '1px solid rgba(26,143,255,0.08)' : 'none',
                }}
              >
                <div className="text-4xl md:text-5xl font-black mb-1 text-shimmer" style={{ fontFamily: 'Space Grotesk' }}>
                  {value}
                </div>
                <div className="text-sm font-semibold text-white mb-1">{label}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 border-y" style={{ borderColor: 'rgba(255,255,255,0.04)', background: '#020917' }}>
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold mb-8 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Trusted by the world's most security-conscious organizations
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {logos.map((logo) => (
              <span
                key={logo}
                className="text-lg font-black tracking-tight select-none"
                style={{
                  color: 'rgba(255,255,255,0.18)',
                  fontFamily: 'Space Grotesk',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.color = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={(e) => { e.target.style.color = 'rgba(255,255,255,0.18)'; }}
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 relative overflow-hidden" style={{ background: '#020917' }}>
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(168,85,247,0.06) 0%, transparent 70%)',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Trusted by security leaders
            </h2>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.45)' }}>
              From startups to Fortune 100 — hear what teams say.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, title, avatar, initials }) => (
              <div
                key={name}
                className="glass-panel rounded-2xl p-7 flex flex-col gap-5"
                style={{
                  background: 'rgba(7,21,48,0.5)',
                  border: '1px solid rgba(26,143,255,0.1)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(26,143,255,0.25)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(26,143,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(26,143,255,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width="13" height="13" viewBox="0 0 12 12" fill="#f59e0b">
                      <path d="M6 0l1.5 4H12l-3.5 2.5L9.7 11 6 8.5 2.3 11l1.2-4.5L0 4h4.5z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  "{quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${avatar}, ${avatar}99)`,
                      boxShadow: `0 0 15px ${avatar}44`,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-28 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(26,143,255,0.12) 0%, rgba(168,85,247,0.12) 50%, rgba(0,212,255,0.08) 100%)',
          }}
        />
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(26,143,255,0.1) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold mb-6"
            style={{
              background: 'rgba(26,143,255,0.12)',
              border: '1px solid rgba(26,143,255,0.25)',
              color: '#60c5ff',
            }}
          >
            <Shield size={11} />
            No credit card required · Free forever plan available
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Your meetings deserve<br />
            <span className="text-shimmer">real protection.</span>
          </h2>
          <p className="text-lg mb-10 mx-auto max-w-xl" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Join 2.4 million professionals who chose security without compromise. Get started in under 60 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="btn-glow inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-white font-bold text-base"
            >
              Start Free Today
              <ArrowRight size={18} />
            </a>
            <a
              href="#"
              className="btn-ghost inline-flex items-center gap-2.5 px-7 py-4 rounded-xl text-white font-semibold text-base"
            >
              Talk to Sales
            </a>
          </div>
          <p className="text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Trusted by teams at Goldman, Palantir, Airbus, Siemens, and 2,400,000+ more.
          </p>
        </div>
      </section>
    </>
  );
}
