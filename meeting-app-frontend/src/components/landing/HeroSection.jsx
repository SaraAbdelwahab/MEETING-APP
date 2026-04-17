import { ArrowRight, Play, Shield, Zap, Globe, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import AnimatedWorldMap from './AnimatedWorldMap';
import FloatingCards from './FloatingCards';

const trustBadges = [
  { icon: Shield, label: 'SOC 2 Certified' },
  { icon: Zap, label: 'GDPR Compliant' },
  { icon: Globe, label: 'ISO 27001' },
];

export default function HeroSection() {
  const { isDark, toggle } = useTheme();

  return (
    <section className="relative min-h-screen hero-gradient grid-bg overflow-hidden">
      {/* Theme Toggle Button - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggle}
          className="p-3 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-border-primary)',
            backdropFilter: 'blur(10px)',
            color: 'var(--color-interactive-primary)',
          }}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>
      </div>

      {/* Auth Links - Top Right */}
      <div className="absolute top-6 right-24 z-20 flex items-center gap-3">
        <Link
          to="/login"
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          Login
        </Link>
        <Link
          to="/register"
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #1a8fff, #0066cc)',
            boxShadow: '0 4px 20px rgba(26,143,255,0.3)',
          }}
        >
          Sign Up
        </Link>
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 60% 40%, rgba(26,143,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 90% 10%, rgba(168,85,247,0.1) 0%, transparent 50%)',
        }}
      />

      <div className="absolute top-32 left-10 w-72 h-72 rounded-full pointer-events-none animate-glow-breathe"
        style={{ background: 'radial-gradient(circle, rgba(26,143,255,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full pointer-events-none animate-glow-breathe"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', filter: 'blur(60px)', animationDelay: '2s' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-16 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="animate-fade-up-1">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
                style={{
                  background: 'rgba(26,143,255,0.1)',
                  border: '1px solid rgba(26,143,255,0.25)',
                  color: '#60c5ff',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
                />
                Now live in 95+ countries — trusted by 2.4M professionals
              </div>
            </div>

            <div className="animate-fade-up-2">
              <h1
                className="text-5xl md:text-6xl lg:text-[62px] font-black leading-[1.08] tracking-tight text-white"
              >
                Meetings that<br />the world{' '}
                <span className="text-gradient">cannot</span><br />
                <span className="text-gradient">compromise.</span>
              </h1>
            </div>

            <div className="animate-fade-up-3">
              <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '440px' }}>
                Enterprise-grade encrypted video conferencing with global infrastructure. Your conversations stay yours — always. Zero-knowledge, zero compromise.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 animate-fade-up-4">
              <Link
                to="/register"
                className="btn-glow inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-white font-semibold text-sm"
              >
                Start for Free
                <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="btn-ghost inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white font-semibold text-sm"
              >
                <Play size={14} className="text-blue-400" fill="currentColor" />
                Watch Demo
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 animate-fade-up-5">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Icon size={11} style={{ color: 'rgba(26,143,255,0.8)' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-4 pt-2 border-t animate-fade-up-5"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex -space-x-2">
                {['#1a8fff', '#a855f7', '#00d4ff', '#f59e0b', '#22c55e'].map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}99)`,
                      boxShadow: `0 0 0 2px #020917, 0 0 0 3px ${color}44`,
                      zIndex: 5 - i,
                    }}
                  >
                    {['AK', 'MR', 'SC', 'JD', 'PL'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width="11" height="11" viewBox="0 0 12 12" fill="#f59e0b">
                      <path d="M6 0l1.5 4H12l-3.5 2.5L9.7 11 6 8.5 2.3 11l1.2-4.5L0 4h4.5z" />
                    </svg>
                  ))}
                  <span className="text-xs font-semibold text-white ml-1">4.9</span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Rated by 18,000+ enterprise teams
                </p>
              </div>
            </div>
          </div>

          <div className="relative h-[500px] lg:h-[620px] animate-slide-in-right">
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(7,21,48,0.9) 0%, rgba(2,9,23,0.95) 100%)',
                border: '1px solid rgba(26,143,255,0.15)',
                boxShadow: '0 0 80px rgba(26,143,255,0.1), 0 40px 120px rgba(0,0,0,0.6)',
              }}
            >
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(26,143,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(168,85,247,0.08) 0%, transparent 50%)',
              }} />
              <div className="absolute inset-0 grid-bg opacity-40" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full p-4">
                  <AnimatedWorldMap />
                </div>
              </div>

              <div className="absolute inset-0">
                <FloatingCards />
              </div>

              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full flex items-center gap-2"
                style={{
                  background: 'rgba(2,9,23,0.8)',
                  border: '1px solid rgba(26,143,255,0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
                />
                <span className="text-[10px] font-semibold text-white/60">Global Network — 142 Regions Active</span>
              </div>

              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl flex items-center gap-3 whitespace-nowrap"
                style={{
                  background: 'rgba(2,9,23,0.85)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(168,85,247,0.2)' }}
                >
                  <Shield size={12} style={{ color: '#a855f7' }} />
                </div>
                <span className="text-[10px] font-semibold text-white/60">End-to-End Encrypted · Zero-Knowledge Architecture</span>
              </div>

              <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
                background: 'linear-gradient(180deg, transparent 60%, rgba(2,9,23,0.4) 100%)',
              }} />
            </div>

            <div
              className="absolute -bottom-6 left-8 right-8 h-12 rounded-3xl"
              style={{
                background: 'rgba(26,143,255,0.15)',
                filter: 'blur(20px)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent, rgba(26,143,255,0.3), rgba(168,85,247,0.3), transparent)',
      }} />
    </section>
  );
}
