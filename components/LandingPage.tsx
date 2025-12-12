import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center z-50 bg-slate-900 font-sans selection:bg-white/30 selection:text-white">
      
      {/* Cinematic Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
            background: 'radial-gradient(circle at center, #001f3f 0%, #000510 60%, #000000 100%)'
        }}
      ></div>

      {/* Traffic Light Trails Animation - VisionOS Subtle Mode */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 z-10 pointer-events-none overflow-hidden mask-gradient-b">
        <div className="light-trail bg-red-600/20 top-[60%] animate-trail-right-1"></div>
        <div className="light-trail bg-amber-200/10 top-[70%] animate-trail-left-1"></div>
        <div className="light-trail bg-red-500/15 top-[80%] animate-trail-right-2"></div>
        <div className="light-trail bg-white/5 top-[50%] animate-trail-left-2"></div>
        <div className="light-trail bg-red-700/15 top-[90%] animate-trail-right-3"></div>
      </div>

      {/* 
         GLASS CAPACITOR CARD (VisionOS Material)
         - Background: rgba(255, 255, 255, 0.05)
         - Blur: 25px
         - Border: 1px solid rgba(255,255,255,0.2)
         - Radius: 40px (Squircle)
         - Shadow: Deep levitation
         - Padding: 60px
      */}
      <div className="relative z-30 flex flex-col items-center justify-center p-4 w-full">
          <div className="
            relative
            backdrop-blur-[25px] 
            bg-white/5 
            border border-white/20 
            rounded-[40px] 
            shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] 
            p-8 md:p-[60px] 
            flex flex-col items-center 
            w-full max-w-[600px]
            overflow-hidden
          ">
            {/* Gloss Reflection Gradient (Optional for extra glass feel) */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

            {/* Typography: San Francisco Style */}
            <h1 className="text-white/90 font-sans font-light text-2xl md:text-3xl tracking-[0.2em] uppercase mb-10 z-10 text-center">
                Satyameva Jayate
            </h1>

            {/* 
                THE SUPERPOSITION STACK (Grid Stacking) 
                Maintained logic for perfect geometric centering
            */}
            <div className="grid place-items-center mb-12 relative z-10 w-full">
                
                {/* Layer 1: Rotating Chakra (Behind) */}
                {/* Sizing relative to container to prevent overflow in card */}
                <div className="col-start-1 row-start-1 w-[280px] h-[280px] md:w-[380px] md:h-[380px] opacity-20 animate-spin-slow pointer-events-none flex items-center justify-center">
                    <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Ashoka_Chakra.svg/600px-Ashoka_Chakra.svg.png" 
                        alt="Ashoka Chakra"
                        className="w-full h-full object-contain invert"
                    />
                </div>

                {/* Layer 2: Lion Emblem (Front) */}
                {/* Sizing slightly smaller than Chakra */}
                <div className="col-start-1 row-start-1 w-[180px] h-[180px] md:w-[240px] md:h-[240px] z-20 flex items-center justify-center">
                    <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/365px-Emblem_of_India.svg.png" 
                        alt="Lion Capital of Ashoka" 
                        className="h-full w-auto object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    />
                </div>
            </div>

            {/* iOS Action Button */}
            <button 
              onClick={onEnter}
              className="relative z-20 bg-white text-black font-sans font-medium text-base md:text-lg px-8 py-4 rounded-full tracking-wide shadow-lg w-full md:w-auto min-w-[200px] hover:shadow-xl outline-none focus:ring-4 focus:ring-white/30"
              style={{ 
                  transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            >
              File Complaint / शिकायत दर्ज करें
            </button>

          </div>
      </div>

      <style>{`
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 60s linear infinite;
        }
        
        .light-trail {
            position: absolute;
            height: 4px;
            width: 150px;
            border-radius: 4px;
            filter: blur(8px);
            opacity: 0;
            box-shadow: 0 0 10px currentColor;
        }

        @keyframes trail-right {
            0% { transform: translateX(-100vw); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateX(100vw); opacity: 0; }
        }
        @keyframes trail-left {
            0% { transform: translateX(100vw); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateX(-100vw); opacity: 0; }
        }

        .animate-trail-right-1 { animation: trail-right 7s linear infinite; width: 200px; animation-delay: 0s; }
        .animate-trail-left-1 { animation: trail-left 9s linear infinite; width: 300px; animation-delay: 1s; }
        .animate-trail-right-2 { animation: trail-right 12s linear infinite; width: 150px; animation-delay: 3s; }
        .animate-trail-left-2 { animation: trail-left 6s linear infinite; width: 250px; animation-delay: 2s; }
        .animate-trail-right-3 { animation: trail-right 15s linear infinite; width: 400px; animation-delay: 0.5s; }
        
        .mask-gradient-b {
           mask-image: linear-gradient(to bottom, transparent, black);
           -webkit-mask-image: linear-gradient(to bottom, transparent, black);
        }
      `}</style>
    </div>
  );
};