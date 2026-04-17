import { Shield, Twitter, Linkedin, Github } from 'lucide-react';

const links = {
  Product: ['Video Meetings', 'Webinars', 'Screen Share', 'AI Summaries', 'Integrations'],
  Security: ['Zero-Knowledge', 'Compliance', 'Audit Logs', 'Trust Center', 'Bug Bounty'],
  Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  Developers: ['API Docs', 'SDK', 'Webhooks', 'Status Page', 'Changelog'],
};

export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        background: '#020917',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1a8fff, #0044cc)', boxShadow: '0 0 20px rgba(26,143,255,0.4)' }}
              >
                <Shield size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-xl" style={{ fontFamily: 'Space Grotesk' }}>
                Vaultex
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              The most secure video meeting platform for teams that can't afford a compromise.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(26,143,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(26,143,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <Icon size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {category}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-150"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={(e) => { e.target.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.target.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2025 Vaultex Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => { e.target.style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={(e) => { e.target.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
