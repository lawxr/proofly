import React, { useState, useEffect } from 'react';

export const Hero: React.FC = () => {
  const fullText = 'Liquidez hecha simple.';
  const [displayText, setDisplayText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
      } else {
        setIsTypingDone(true);
        clearInterval(interval);
      }
    }, 70);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-16 max-w-7xl mx-auto">
      {/* Outer Framed Stage (Soft Lavender Gradient with Starbursts) */}
      <div className="relative bg-gradient-to-br from-proofly-lavender via-[#F4CCFB] to-proofly-subtle rounded-[44px] p-3 sm:p-6 lg:p-8 border-[2px] border-black/15 shadow-card overflow-visible">
        
        {/* Outer Background Geometric Starbursts */}
        <svg className="absolute -top-16 -left-16 w-72 h-72 text-white/50 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
        </svg>
        <svg className="absolute -bottom-20 -right-16 w-80 h-80 text-proofly-electric/10 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
        </svg>

        {/* Scaled White Inner Canvas */}
        <div className="relative bg-white rounded-[36px] border-[2px] border-black px-6 sm:px-12 py-20 sm:py-28 lg:py-32 flex flex-col items-center justify-center text-center shadow-card overflow-hidden">
          
          {/* Inner Decorative Watermarks */}
          <svg className="absolute -top-24 -left-20 w-80 h-80 text-proofly-lavender/35 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
          </svg>
          <svg className="absolute -bottom-28 -right-20 w-96 h-96 text-proofly-lavender/30 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
          </svg>

          {/* Centered Editorial Content */}
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 bg-proofly-lavender/70 border-[1.5px] border-black rounded-full px-4 py-1.5 text-xs font-black tracking-widest uppercase text-black mb-6 shadow-[0_2px_0_#000000]">
              <span className="w-2 h-2 rounded-full bg-proofly-electric animate-pulse"></span>
              <span>CONTRATOS IN · PESOS COP OUT</span>
            </div>

            {/* Display Headline */}
            <h1 className="font-extrabold text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-black min-h-[2.2em]">
              Liquidez hecha<br />
              <span className="text-proofly-electric">
                {isTypingDone ? 'simple.' : displayText.slice(15) || 's'}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-proofly-muted max-w-xl font-medium leading-relaxed">
              Adelanta el cobro de tus hitos y contratos freelance en COP al instante, evita esperas a 60 días y permite que financiadores obtengan retornos verificados sobre Base L2.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#app-movil"
                className="group proofly-pill-button flex items-center gap-3.5 pl-7 pr-3 py-3"
              >
                <span>Adelantar o Financiar Hoy</span>
                <span className="w-8 h-8 rounded-full bg-proofly-lavender text-black group-hover:bg-white flex items-center justify-center transition-colors text-xs font-black">
                  ↗
                </span>
              </a>

              <a
                href="#calculadora"
                className="bg-white hover:bg-proofly-subtle text-black font-extrabold text-sm sm:text-base px-6 py-3.5 rounded-full border-[2px] border-black transition-all shadow-[0_2px_0_#000000] hover:shadow-[0_4px_0_#000000] hover:-translate-y-0.5"
              >
                Simular mi Hito →
              </a>
            </div>
          </div>
        </div>

        {/* POLAROID 1 (Top-Left): -9deg rotation */}
        <div
          className="polaroid-badge hidden lg:flex flex-col absolute -top-6 -left-4 xl:-left-8 w-44 bg-white border-[2px] border-black rounded-[24px] p-2.5 shadow-polaroid z-20"
          style={{ transform: 'rotate(-9deg)' }}
        >
          <div className="w-full h-32 rounded-[16px] bg-gradient-to-br from-[#EFE5FF] via-proofly-lavender to-white border border-black/15 flex items-center justify-center overflow-hidden">
            <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <rect x="15" y="15" width="30" height="30" rx="14" fill="#7300FF" stroke="#000" strokeWidth="2" />
              <rect x="55" y="15" width="30" height="30" rx="14" fill="#F8D4FD" stroke="#000" strokeWidth="2" />
              <rect x="15" y="55" width="30" height="30" rx="14" fill="#F8D4FD" stroke="#000" strokeWidth="2" />
              <rect x="55" y="55" width="30" height="30" rx="14" fill="#7300FF" stroke="#000" strokeWidth="2" />
              <circle cx="50" cy="50" r="12" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
              <path d="M45 50L48 53L56 46" stroke="#7300FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs font-extrabold text-black mt-2 text-center">Liquidez por Hitos</span>
        </div>

        {/* POLAROID 2 (Top-Right): +8deg rotation */}
        <div
          className="polaroid-badge hidden lg:flex flex-col absolute -top-6 -right-4 xl:-right-8 w-44 bg-white border-[2px] border-black rounded-[24px] p-2.5 shadow-polaroid z-20"
          style={{ transform: 'rotate(8deg)' }}
        >
          <div className="w-full h-32 rounded-[16px] bg-gradient-to-tr from-[#FFF0FA] via-proofly-lavender/70 to-[#EFE5FF] border border-black/15 flex items-center justify-center overflow-hidden">
            <svg className="w-24 h-20" viewBox="0 0 110 90" fill="none" aria-hidden="true">
              <rect x="15" y="18" width="70" height="46" rx="10" fill="#7300FF" stroke="#000000" strokeWidth="2" />
              <rect x="23" y="27" width="16" height="12" rx="3" fill="#F8D4FD" stroke="#000000" strokeWidth="1.5" />
              <line x1="23" y1="50" x2="55" y2="50" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <circle cx="75" cy="22" r="14" fill="#F8D4FD" stroke="#000000" strokeWidth="2" />
              <path d="M77 15L71 23H76L74 29L80 20H75L77 15Z" fill="#7300FF" stroke="#000000" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs font-extrabold text-black mt-2 text-center">Cobro en 24h</span>
        </div>

        {/* POLAROID 3 (Bottom-Left): +7deg rotation */}
        <div
          className="polaroid-badge hidden lg:flex flex-col absolute -bottom-6 -left-4 xl:-left-8 w-44 bg-white border-[2px] border-black rounded-[24px] p-2.5 shadow-polaroid z-20"
          style={{ transform: 'rotate(7deg)' }}
        >
          <div className="w-full h-32 rounded-[16px] bg-proofly-subtle border border-black/15 flex items-center justify-center overflow-hidden relative">
            <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <circle cx="32" cy="55" r="18" fill="#F8D4FD" stroke="#000" strokeWidth="2" />
              <circle cx="68" cy="55" r="18" fill="#E5A8F2" stroke="#000" strokeWidth="2" />
              <circle cx="50" cy="38" r="20" fill="#7300FF" stroke="#000" strokeWidth="2" />
              <rect x="25" y="58" width="50" height="20" rx="10" fill="#FFFFFF" stroke="#000" strokeWidth="1.8" />
              <text x="50" y="72" textAnchor="middle" fill="#7300FF" fontSize="10" fontWeight="900" fontFamily="sans-serif">Score 98</text>
            </svg>
          </div>
          <span className="text-xs font-extrabold text-black mt-2 text-center">Reputación Base L2</span>
        </div>

        {/* POLAROID 4 (Bottom-Right): -8deg rotation */}
        <div
          className="polaroid-badge hidden lg:flex flex-col absolute -bottom-6 -right-4 xl:-right-8 w-44 bg-white border-[2px] border-black rounded-[24px] p-2.5 shadow-polaroid z-20"
          style={{ transform: 'rotate(-8deg)' }}
        >
          <div className="w-full h-32 rounded-[16px] bg-gradient-to-br from-proofly-lavender to-proofly-subtle border border-black/15 flex items-center justify-center overflow-hidden">
            <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <ellipse cx="50" cy="70" rx="26" ry="10" fill="#E5A8F2" stroke="#000" strokeWidth="2" />
              <ellipse cx="50" cy="58" rx="26" ry="10" fill="#7300FF" stroke="#000" strokeWidth="2" />
              <ellipse cx="50" cy="46" rx="26" ry="10" fill="#F8D4FD" stroke="#000" strokeWidth="2" />
              <ellipse cx="50" cy="34" rx="26" ry="10" fill="#7300FF" stroke="#000" strokeWidth="2" />
              <path d="M50 25L54 31H46L50 25Z" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="text-xs font-extrabold text-black mt-2 text-center">Retorno 27.4% E.A.</span>
        </div>

      </div>
    </section>
  );
};
