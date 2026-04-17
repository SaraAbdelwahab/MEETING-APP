import { useEffect, useRef } from 'react';

const CITIES = [
  { id: 'ny',   name: 'New York',    x: 230, y: 148 },
  { id: 'ldn',  name: 'London',      x: 390, y: 118 },
  { id: 'par',  name: 'Paris',       x: 405, y: 130 },
  { id: 'dxb',  name: 'Dubai',       x: 540, y: 175 },
  { id: 'mum',  name: 'Mumbai',      x: 570, y: 195 },
  { id: 'sgp',  name: 'Singapore',   x: 645, y: 230 },
  { id: 'tko',  name: 'Tokyo',       x: 715, y: 150 },
  { id: 'syd',  name: 'Sydney',      x: 730, y: 305 },
  { id: 'sao',  name: 'São Paulo',   x: 290, y: 285 },
  { id: 'tor',  name: 'Toronto',     x: 245, y: 140 },
];

const ARCS = [
  { from: 'ny',  to: 'ldn',  color: '#1a8fff', delay: 0,    dur: 4 },
  { from: 'ldn', to: 'dxb',  color: '#a855f7', delay: 1,    dur: 3.5 },
  { from: 'dxb', to: 'sgp',  color: '#00d4ff', delay: 2,    dur: 4.5 },
  { from: 'sgp', to: 'tko',  color: '#1a8fff', delay: 0.5,  dur: 3 },
  { from: 'tko', to: 'syd',  color: '#a855f7', delay: 3,    dur: 4 },
  { from: 'ny',  to: 'sao',  color: '#00d4ff', delay: 1.5,  dur: 3.5 },
  { from: 'sao', to: 'ldn',  color: '#1a8fff', delay: 2.5,  dur: 5 },
  { from: 'mum', to: 'tko',  color: '#a855f7', delay: 0.8,  dur: 4 },
  { from: 'ldn', to: 'sgp',  color: '#00d4ff', delay: 3.5,  dur: 5.5 },
  { from: 'ny',  to: 'tko',  color: '#1a8fff', delay: 2,    dur: 6 },
];

function getCityById(id) {
  return CITIES.find((c) => c.id === id);
}

function makeArcPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const cx = mx - (dy / dist) * dist * 0.25;
  const cy = my + (dx / dist) * dist * 0.25;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function pathLength(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy) * 1.3;
}

export default function AnimatedWorldMap() {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = svg.querySelectorAll('.arc-path');
    paths.forEach((path) => {
      const len = path.getTotalLength?.() ?? 300;
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="globeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a8fff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#020917" stopOpacity="0" />
          </radialGradient>
          <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {ARCS.map((arc, i) => {
            const from = getCityById(arc.from);
            const to = getCityById(arc.to);
            const path = makeArcPath(from.x, from.y, to.x, to.y);
            return (
              <path key={`def-${i}`} id={`arc-${i}`} d={path} fill="none" />
            );
          })}
        </defs>

        <ellipse
          cx="400" cy="200" rx="320" ry="200"
          fill="url(#globeGrad)"
          className="animate-glow-breathe"
        />

        {[80, 140, 200, 260, 320].map((rx) => (
          <ellipse
            key={rx}
            cx="400" cy="200" rx={rx} ry={rx * 0.35}
            fill="none"
            stroke="rgba(26,143,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {[60, 140, 220, 300, 380, 460, 540, 620, 700, 760].map((x) => (
          <line
            key={x}
            x1={x} y1="10" x2={x} y2="390"
            stroke="rgba(26,143,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {[60, 100, 140, 180, 220, 260, 300, 340].map((y) => (
          <line
            key={y}
            x1="80" y1={y} x2="720" y2={y}
            stroke="rgba(26,143,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {ARCS.map((arc, i) => {
          const from = getCityById(arc.from);
          const to = getCityById(arc.to);
          const d = makeArcPath(from.x, from.y, to.x, to.y);
          return (
            <path
              key={`arc-base-${i}`}
              d={d}
              fill="none"
              stroke={arc.color}
              strokeWidth="1"
              strokeOpacity="0.2"
            />
          );
        })}

        {ARCS.map((arc, i) => {
          const from = getCityById(arc.from);
          const to = getCityById(arc.to);
          const d = makeArcPath(from.x, from.y, to.x, to.y);
          const len = pathLength(from.x, from.y, to.x, to.y);
          return (
            <path
              key={`arc-anim-${i}`}
              className="arc-path"
              d={d}
              fill="none"
              stroke={arc.color}
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#glow-blue)"
              style={{
                strokeDasharray: len,
                strokeDashoffset: len,
                animation: `arc-dash ${arc.dur}s ease-in-out ${arc.delay}s infinite`,
              }}
            />
          );
        })}

        {ARCS.map((arc, i) => {
          const from = getCityById(arc.from);
          const to = getCityById(arc.to);
          const d = makeArcPath(from.x, from.y, to.x, to.y);
          return (
            <circle key={`dot-${i}`} r="4" fill={arc.color} filter="url(#glow-blue)">
              <animateMotion
                dur={`${arc.dur}s`}
                begin={`${arc.delay}s`}
                repeatCount="indefinite"
                path={d}
                keyTimes="0;0.05;0.9;1"
                keyPoints="0;0;1;1"
                calcMode="linear"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur={`${arc.dur}s`}
                begin={`${arc.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="2;4;4;2"
                dur={`${arc.dur}s`}
                begin={`${arc.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {CITIES.map((city) => (
          <g key={city.id}>
            <circle
              cx={city.x} cy={city.y} r="12"
              fill="rgba(26,143,255,0.08)"
              stroke="rgba(26,143,255,0.2)"
              strokeWidth="1"
            >
              <animate
                attributeName="r"
                values="8;16;8"
                dur="3s"
                begin={`${Math.random() * 2}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0;0.3"
                dur="3s"
                begin={`${Math.random() * 2}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={city.x} cy={city.y} r="4"
              fill="#1a8fff"
              filter="url(#glow-blue)"
            >
              <animate
                attributeName="r"
                values="3.5;5.5;3.5"
                dur={`${2 + Math.random() * 1.5}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={city.x} cy={city.y} r="2"
              fill="white"
              opacity="0.9"
            />
          </g>
        ))}

        {CITIES.filter(c => ['ny','ldn','tko','sgp','dxb'].includes(c.id)).map((city) => (
          <text
            key={`label-${city.id}`}
            x={city.x}
            y={city.y - 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="Inter, sans-serif"
            letterSpacing="0.5"
          >
            {city.name}
          </text>
        ))}
      </svg>
    </div>
  );
}
