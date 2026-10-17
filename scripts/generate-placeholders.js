import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Output directories
const PUBLIC_DIR = path.resolve('public/pictures/placeholder');
const SRC_DIR = path.resolve('src/pictures/placeholder');
const EXPERIENCES_DIR = path.resolve('public/pictures/experiences');
const CULTURE_DIR = path.resolve('public/pictures/culture');
const ABOUT_DIR = path.resolve('public/pictures/about');

[PUBLIC_DIR, SRC_DIR, EXPERIENCES_DIR, CULTURE_DIR, ABOUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to create noise / film grain SVG filter
const grainFilter = `
  <defs>
    <filter id="grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.04 0" />
      <feComposite in2="SourceGraphic" in="gl" operator="in" />
    </filter>
    <filter id="caustics" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="2" result="turb"/>
      <feDisplacementMap in2="turb" in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
`;

/**
 * Image Definitions
 */
const IMAGES = [
  // 1. Day Trip: Pristine tropical coral island, crystal turquoise water, white beach, coconut palms
  {
    filename: 'day-trip.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="45%" stopColor="#e0f2fe" />
            <stop offset="70%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="25%" stopColor="#0ea5e9" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="85%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <radialGradient id="sun" cx="65%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fffbeb" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#fef7ee" />
          </linearGradient>
        </defs>
        <!-- Sky -->
        <rect width="1200" height="520" fill="url(#sky)" />
        <circle cx="800" cy="240" r="160" fill="url(#sun)" />
        <!-- Distant islands -->
        <ellipse cx="260" cy="460" rx="140" ry="10" fill="#15803d" opacity="0.6" />
        <ellipse cx="980" cy="470" rx="180" ry="12" fill="#166534" opacity="0.5" />
        <!-- Ocean -->
        <rect y="460" width="1200" height="440" fill="url(#ocean)" />
        <!-- Underwater coral patch shadows -->
        <path d="M100 580 Q300 560 500 610 T900 590 L950 680 Q600 650 200 690 Z" fill="#0f766e" opacity="0.4" />
        <path d="M400 660 Q700 640 1000 680 L1050 760 Q650 720 300 750 Z" fill="#115e59" opacity="0.35" />
        <!-- Foreground white sand island spit -->
        <path d="M350 900 C500 760 750 700 1200 740 L1200 900 Z" fill="url(#sand)" />
        <path d="M520 900 C640 800 850 740 1200 770 L1200 900 Z" fill="#fef7ee" opacity="0.6" />
        <!-- Coconut palm trunks -->
        <path d="M1020 860 Q990 680 940 450" stroke="#78350f" strokeWidth="22" strokeLinecap="round" fill="none" />
        <path d="M1120 890 Q1100 660 1060 490" stroke="#92400e" strokeWidth="18" strokeLinecap="round" fill="none" />
        <!-- Palm Fronds (Canopy) -->
        <g stroke="#14532d" strokeWidth="8" strokeLinecap="round" opacity="0.95">
          <path d="M940 450 Q800 420 720 480" />
          <path d="M940 450 Q850 360 780 340" />
          <path d="M940 450 Q930 320 920 280" />
          <path d="M940 450 Q1020 340 1080 350" />
          <path d="M940 450 Q1060 410 1120 450" />
          <path d="M940 450 Q980 480 1040 540" />
          <path d="M940 450 Q880 490 840 550" />
        </g>
        <g stroke="#166534" strokeWidth="6" strokeLinecap="round" opacity="0.9">
          <path d="M1060 490 Q940 450 880 500" />
          <path d="M1060 490 Q1000 400 960 370" />
          <path d="M1060 490 Q1070 380 1090 330" />
          <path d="M1060 490 Q1150 410 1210 430" />
          <path d="M1060 490 Q1160 480 1200 540" />
        </g>
        <!-- Small traditional wooden boat by the sand -->
        <path d="M680 770 Q780 790 880 770 Q860 800 780 800 Q700 798 680 770 Z" fill="#582f0e" />
        <line x1="770" y1="770" x2="770" y2="730" stroke="#451a03" strokeWidth="3" />
      </svg>
    `,
  },

  // 2. Overnight: Rustic wooden overwater cabana, thatched roof, tranquil lagoon, warm sunset
  {
    filename: 'overnight.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="twilight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="35%" stopColor="#fbcfe8" />
            <stop offset="70%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="sunsetSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="30%" stopColor="#115e59" />
            <stop offset="65%" stopColor="#134e4a" />
            <stop offset="100%" stopColor="#042f2e" />
          </linearGradient>
          <radialGradient id="sunsetSun" cx="45%" cy="40%" r="40%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#fed7aa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
        </defs>
        <!-- Sky -->
        <rect width="1200" height="480" fill="url(#twilight)" />
        <circle cx="520" cy="380" r="140" fill="url(#sunsetSun)" />
        <!-- Sea -->
        <rect y="460" width="1200" height="440" fill="url(#sunsetSea)" />
        <!-- Golden water reflection ribbon -->
        <path d="M460 460 L580 460 L750 900 L300 900 Z" fill="#fdba74" opacity="0.25" />
        <!-- Rustic overwater island cabana -->
        <g id="cabana">
          <!-- Stilts in water -->
          <line x1="280" y1="620" x2="280" y2="760" stroke="#3e2723" strokeWidth="10" strokeLinecap="round" />
          <line x1="360" y1="630" x2="360" y2="770" stroke="#3e2723" strokeWidth="10" strokeLinecap="round" />
          <line x1="520" y1="630" x2="520" y2="765" stroke="#3e2723" strokeWidth="10" strokeLinecap="round" />
          <line x1="600" y1="620" x2="600" y2="755" stroke="#3e2723" strokeWidth="10" strokeLinecap="round" />
          <!-- Wooden deck -->
          <rect x="240" y="600" width="400" height="24" rx="4" fill="#5d4037" />
          <!-- Cabana walls: caña brava / rustic wood planks -->
          <rect x="290" y="470" width="300" height="135" fill="#795548" />
          <line x1="340" y1="470" x2="340" y2="605" stroke="#4e342e" strokeWidth="2" />
          <line x1="390" y1="470" x2="390" y2="605" stroke="#4e342e" strokeWidth="2" />
          <line x1="440" y1="470" x2="440" y2="605" stroke="#4e342e" strokeWidth="2" />
          <line x1="490" y1="470" x2="490" y2="605" stroke="#4e342e" strokeWidth="2" />
          <line x1="540" y1="470" x2="540" y2="605" stroke="#4e342e" strokeWidth="2" />
          <!-- Window glowing warmly -->
          <rect x="360" y="510" width="70" height="55" rx="3" fill="#fef08a" opacity="0.85" />
          <!-- Thatched Palm Roof -->
          <polygon points="220,480 440,320 660,480" fill="#a16207" />
          <polygon points="240,485 440,335 640,485" fill="#ca8a04" opacity="0.6" />
          <!-- Ridgepole -->
          <line x1="440" y1="315" x2="440" y2="480" stroke="#713f12" strokeWidth="4" />
        </g>
        <!-- Silhouette of palm tree leaning over water on right -->
        <path d="M850 900 Q880 650 980 420" stroke="#1c1917" strokeWidth="18" strokeLinecap="round" fill="none" />
        <g stroke="#1c1917" strokeWidth="7" strokeLinecap="round">
          <path d="M980 420 Q860 380 780 420" />
          <path d="M980 420 Q900 320 860 290" />
          <path d="M980 420 Q1000 300 1020 260" />
          <path d="M980 420 Q1080 340 1140 370" />
          <path d="M980 420 Q1080 430 1120 480" />
        </g>
      </svg>
    `,
  },

  // 3. Multi-Day: Deep outer reef cayos holandeses, multiple secluded coral cays
  {
    filename: 'multi-day.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aerialSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="deepReef" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="85%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#99f6e4" />
          </linearGradient>
        </defs>
        <!-- Vast ocean & lagoon canvas -->
        <rect width="1200" height="900" fill="url(#deepReef)" />
        <!-- Deep blue ocean trench drop-off -->
        <path d="M0 0 L1200 0 L1200 240 C900 280 600 210 0 260 Z" fill="#0c4a6e" />
        <!-- White breaking surf along barrier reef line -->
        <path d="M0 260 C400 220 800 290 1200 245" stroke="#ffffff" strokeWidth="8" strokeDasharray="18 12" fill="none" opacity="0.75" />
        <!-- Coral Cay 1 (Main island) -->
        <g id="island1">
          <ellipse cx="440" cy="520" rx="160" ry="70" fill="#fef3c7" />
          <ellipse cx="440" cy="520" rx="140" ry="55" fill="#15803d" />
          <circle cx="410" cy="510" r="18" fill="#166534" />
          <circle cx="460" cy="525" r="22" fill="#14532d" />
          <circle cx="485" cy="505" r="16" fill="#166534" />
        </g>
        <!-- Coral Cay 2 (Outer jewel) -->
        <g id="island2">
          <ellipse cx="880" cy="420" rx="90" ry="40" fill="#fef3c7" />
          <ellipse cx="880" cy="420" rx="75" ry="30" fill="#16a34a" />
          <circle cx="875" cy="415" r="14" fill="#14532d" />
        </g>
        <!-- Coral Cay 3 (Distant jewel) -->
        <g id="island3">
          <ellipse cx="180" cy="650" rx="110" ry="48" fill="#fef3c7" />
          <ellipse cx="180" cy="650" rx="90" ry="36" fill="#15803d" />
        </g>
        <!-- Sandbars & shallows -->
        <path d="M480 580 Q650 630 820 480" stroke="#fef3c7" strokeWidth="40" strokeLinecap="round" fill="none" opacity="0.5" />
        <!-- Small navigation boat wake connecting islands -->
        <path d="M300 620 Q540 580 780 460" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 6" fill="none" opacity="0.8" />
      </svg>
    `,
  },

  // 4. Private Custom Charter: Exclusive private island, private boat moored in shallows
  {
    filename: 'private-custom.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="privSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="50%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="privWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="40%" stopColor="#06b6d4" />
            <stop offset="80%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
        <rect width="1200" height="480" fill="url(#privSky)" />
        <rect y="460" width="1200" height="440" fill="url(#privWater)" />
        <!-- Solitary jewel island in center -->
        <ellipse cx="600" cy="560" rx="280" ry="85" fill="#fef3c7" />
        <ellipse cx="600" cy="550" rx="240" ry="60" fill="#fef08a" opacity="0.6" />
        <!-- Coconut palms cluster on solitary island -->
        <path d="M560 550 Q550 420 530 280" stroke="#78350f" strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M620 550 Q635 430 660 300" stroke="#92400e" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M590 550 Q595 410 590 270" stroke="#713f12" strokeWidth="14" strokeLinecap="round" fill="none" />
        <!-- Palm Canopies -->
        <g stroke="#14532d" strokeWidth="7" strokeLinecap="round" opacity="0.95">
          <path d="M530 280 Q420 250 360 290" />
          <path d="M530 280 Q460 200 400 170" />
          <path d="M530 280 Q520 180 510 140" />
          <path d="M530 280 Q600 200 650 210" />
          <path d="M660 300 Q620 220 580 180" />
          <path d="M660 300 Q720 220 780 230" />
          <path d="M660 300 Q740 280 800 320" />
          <path d="M590 270 Q540 180 500 150" />
          <path d="M590 270 Q640 170 680 140" />
        </g>
        <!-- Sleek private boat moored by crystal water -->
        <g transform="translate(340, 640)">
          <!-- Boat hull -->
          <path d="M0 40 Q80 60 180 40 Q210 25 180 15 Q80 25 10 20 Z" fill="#ffffff" />
          <!-- Blue trim & cabin -->
          <rect x="50" y="10" width="80" height="18" rx="4" fill="#0284c7" />
          <line x1="85" y1="10" x2="85" y2="0" stroke="#334155" strokeWidth="3" />
          <!-- Shadow in water -->
          <ellipse cx="95" cy="50" rx="90" ry="12" fill="#0e7490" opacity="0.3" />
        </g>
      </svg>
    `,
  },

  // 5. Sailing: Monohull sailing yacht on open Caribbean water
  {
    filename: 'sailing.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sailSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="55%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#fffbeb" />
          </linearGradient>
          <linearGradient id="sailSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="40%" stopColor="#0ea5e9" />
            <stop offset="80%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <rect width="1200" height="500" fill="url(#sailSky)" />
        <rect y="480" width="1200" height="420" fill="url(#sailSea)" />
        <!-- Distant emerald palm atoll on horizon -->
        <ellipse cx="950" cy="490" rx="160" ry="14" fill="#15803d" opacity="0.8" />
        <!-- Monohull sailboat in pristine water -->
        <g transform="translate(360, 240)">
          <!-- Mast -->
          <line x1="280" y1="360" x2="280" y2="30" stroke="#1e293b" strokeWidth="7" />
          <!-- Mainsail -->
          <polygon points="280,45 420,330 280,330" fill="#ffffff" />
          <line x1="280" y1="330" x2="430" y2="330" stroke="#334155" strokeWidth="4" />
          <!-- Genoa / Jib Sail -->
          <polygon points="275,65 140,340 275,340" fill="#f8fafc" opacity="0.95" />
          <!-- Yacht Hull -->
          <path d="M100 370 Q280 400 480 360 Q510 345 470 340 Q280 348 130 348 Z" fill="#ffffff" />
          <path d="M120 372 Q280 398 460 365" stroke="#0284c7" strokeWidth="5" fill="none" />
          <!-- Water wake & reflection -->
          <path d="M140 390 L40 430" stroke="#ffffff" strokeWidth="4" opacity="0.6" />
          <ellipse cx="290" cy="385" rx="190" ry="18" fill="#0f766e" opacity="0.3" />
        </g>
      </svg>
    `,
  },

  // 6. Catamaran: Sleek modern luxury catamaran anchored in turquoise lagoon
  {
    filename: 'catamaran.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="catSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="60%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="catSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="35%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <rect width="1200" height="460" fill="url(#catSky)" />
        <rect y="440" width="1200" height="460" fill="url(#catSea)" />
        <!-- Low white sandbar on horizon -->
        <path d="M50 450 Q300 430 700 450 T1200 445" stroke="#fef3c7" strokeWidth="8" fill="none" />
        <!-- Catamaran Centered -->
        <g transform="translate(320, 260)">
          <!-- Mast -->
          <line x1="280" y1="280" x2="280" y2="10" stroke="#334155" strokeWidth="8" />
          <!-- Mainsail folded or partial -->
          <polygon points="280,25 380,260 280,260" fill="#ffffff" opacity="0.9" />
          <!-- Dual Hulls & Bridge Deck -->
          <!-- Port Hull -->
          <path d="M80 320 Q240 345 440 315 Q470 300 430 295 Q240 305 100 305 Z" fill="#ffffff" />
          <!-- Starboard Hull -->
          <path d="M120 285 Q260 305 460 280 Q490 268 450 262 Q260 270 140 270 Z" fill="#e2e8f0" />
          <!-- Cabin Deckhouse & Flybridge -->
          <rect x="200" y="240" width="160" height="42" rx="8" fill="#f8fafc" />
          <!-- Tinted wrap-around windows -->
          <rect x="215" y="248" width="130" height="18" rx="4" fill="#0f172a" opacity="0.85" />
          <!-- Trampoline net between hulls -->
          <polygon points="100,305 200,275 220,295 120,318" fill="#cbd5e1" opacity="0.7" />
          <!-- Reflection shadow in lagoon -->
          <ellipse cx="280" cy="335" rx="180" ry="20" fill="#0e7490" opacity="0.35" />
        </g>
      </svg>
    `,
  },

  // 7. Snorkeling / Natural Pool: Clear shallow water, cushion sea star on sandbar
  {
    filename: 'snorkeling.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="poolGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="30%" stopColor="#06b6d4" />
            <stop offset="65%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
          <radialGradient id="starShine" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#9a3412" />
          </radialGradient>
        </defs>
        <!-- Sandbank pool base -->
        <rect width="1200" height="900" fill="#fef3c7" />
        <rect width="1200" height="900" fill="url(#poolGrad)" opacity="0.65" />
        <!-- Caustic water light ripples -->
        <g stroke="#ffffff" strokeWidth="5" fill="none" opacity="0.45">
          <ellipse cx="300" cy="300" rx="180" ry="90" />
          <ellipse cx="480" cy="380" rx="220" ry="110" />
          <ellipse cx="800" cy="260" rx="260" ry="120" />
          <ellipse cx="650" cy="620" rx="300" ry="140" />
          <ellipse cx="240" cy="720" rx="190" ry="95" />
          <ellipse cx="980" cy="680" rx="180" ry="85" />
        </g>
        <!-- Giant Cushion Sea Star 1 (Main subject in foreground) -->
        <g transform="translate(620, 520)">
          <!-- Starfish drop shadow on white sand -->
          <ellipse cx="0" cy="15" rx="120" ry="100" fill="#0f766e" opacity="0.4" />
          <!-- Starfish body -->
          <path d="M0 -110 L28 -35 L105 -35 L45 15 L70 90 L0 45 L-70 90 L-45 15 L-105 -35 L-28 -35 Z" fill="url(#starShine)" />
          <!-- Spines / texture dots -->
          <circle cx="0" cy="0" r="10" fill="#ffedd5" />
          <circle cx="0" cy="-45" r="6" fill="#ffedd5" />
          <circle cx="0" cy="-80" r="4" fill="#ffedd5" />
          <circle cx="45" cy="-15" r="6" fill="#ffedd5" />
          <circle cx="75" cy="-25" r="4" fill="#ffedd5" />
          <circle cx="30" cy="35" r="6" fill="#ffedd5" />
          <circle cx="50" cy="65" r="4" fill="#ffedd5" />
          <circle cx="-30" cy="35" r="6" fill="#ffedd5" />
          <circle cx="-50" cy="65" r="4" fill="#ffedd5" />
          <circle cx="-45" cy="-15" r="6" fill="#ffedd5" />
          <circle cx="-75" cy="-25" r="4" fill="#ffedd5" />
        </g>
        <!-- Secondary smaller Starfish in background -->
        <g transform="translate(280, 280) scale(0.45)">
          <path d="M0 -110 L28 -35 L105 -35 L45 15 L70 90 L0 45 L-70 90 L-45 15 L-105 -35 L-28 -35 Z" fill="url(#starShine)" opacity="0.8" />
        </g>
      </svg>
    `,
  },

  // 8. Culture: Authentic Guna hand-stitched Mola geometric textile art
  {
    filename: 'culture.jpg',
    width: 1000,
    height: 1000,
    svg: `
      <svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
        <!-- Deep rich textile cloth base -->
        <rect width="1000" height="1000" fill="#0f172a" />
        <!-- Layered Guna Mola maze appliqué cuts -->
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <!-- Crimson layer -->
          <rect x="70" y="70" width="860" height="860" rx="30" stroke="#dc2626" strokeWidth="26" />
          <!-- Saffron Gold layer -->
          <rect x="120" y="120" width="760" height="760" rx="20" stroke="#f59e0b" strokeWidth="22" />
          <!-- Emerald layer -->
          <rect x="165" y="165" width="670" height="670" rx="16" stroke="#059669" strokeWidth="18" />
          <!-- Turquoise layer -->
          <rect x="205" y="205" width="590" height="590" rx="12" stroke="#0284c7" strokeWidth="16" />
          <!-- Traditional Central Sacred Sun / Spirit Animal Totem cuts -->
          <path d="M300 300 H700 V700 H300 Z" stroke="#e11d48" strokeWidth="14" />
          <path d="M350 350 H650 V650 H350 Z" stroke="#f59e0b" strokeWidth="14" />
          <path d="M400 400 H600 V600 H400 Z" stroke="#10b981" strokeWidth="12" fill="#b91c1c" />
          <!-- Mola labyrinth dashes and slotted cutouts -->
          <g stroke="#ffffff" strokeWidth="8">
            <line x1="250" y1="140" x2="350" y2="140" />
            <line x1="450" y1="140" x2="550" y2="140" />
            <line x1="650" y1="140" x2="750" y2="140" />
            <line x1="140" y1="250" x2="140" y2="350" />
            <line x1="140" y1="450" x2="140" y2="550" />
            <line x1="140" y1="650" x2="140" y2="750" />
            <line x1="860" y1="250" x2="860" y2="350" />
            <line x1="860" y1="450" x2="860" y2="550" />
            <line x1="860" y1="650" x2="860" y2="750" />
            <line x1="250" y1="860" x2="350" y2="860" />
            <line x1="450" y1="860" x2="550" y2="860" />
            <line x1="650" y1="860" x2="750" y2="860" />
          </g>
          <!-- Central golden diamond -->
          <polygon points="500,440 560,500 500,560 440,500" fill="#fbbf24" stroke="#ffffff" strokeWidth="6" />
        </g>
      </svg>
    `,
  },

  // 9. Cayuco: Traditional hand-carved wooden dugout canoe on beach
  {
    filename: 'cayuco.jpg',
    width: 1000,
    height: 1000,
    svg: `
      <svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cayucoSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="cayucoSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
        </defs>
        <rect width="1000" height="450" fill="url(#cayucoSky)" />
        <rect y="420" width="1000" height="580" fill="url(#cayucoSea)" />
        <!-- White sand beach foreground -->
        <path d="M0 650 Q400 580 1000 700 L1000 1000 L0 1000 Z" fill="#fef3c7" />
        <!-- Traditional wooden cayuco canoe resting along shoreline -->
        <g transform="translate(180, 600)">
          <!-- Canoe shadow -->
          <ellipse cx="320" cy="110" rx="340" ry="24" fill="#0f766e" opacity="0.4" />
          <!-- Canoe hull -->
          <path d="M0 60 Q320 120 640 50 Q660 30 630 25 Q320 40 20 30 Q-20 35 0 60 Z" fill="url(#wood)" />
          <!-- Inner hollow of dugout trunk -->
          <path d="M30 35 Q320 50 610 32 Q620 45 580 50 Q320 65 50 50 Z" fill="#3b1d07" />
          <!-- Wooden paddle resting inside -->
          <line x1="160" y1="20" x2="420" y2="80" stroke="#b45309" strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="150" cy="18" rx="28" ry="12" fill="#78350f" />
        </g>
      </svg>
    `,
  },

  // 10. Community: Traditional Guna thatched architecture village island
  {
    filename: 'community.jpg',
    width: 1200,
    height: 700,
    svg: `
      <svg width="1200" height="700" viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="commSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="60%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="commSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill="url(#commSky)" />
        <rect y="400" width="1200" height="300" fill="url(#commSea)" />
        <!-- Island landbase -->
        <ellipse cx="600" cy="440" rx="550" ry="60" fill="#e2e8f0" />
        <ellipse cx="600" cy="435" rx="520" ry="45" fill="#fef3c7" />
        <!-- Cluster of authentic caña brava & palm thatched huts -->
        <g id="huts" fill="#78350f">
          <!-- Hut 1 -->
          <rect x="220" y="340" width="130" height="80" rx="3" />
          <polygon points="200,340 285,260 370,340" fill="#92400e" />
          <!-- Hut 2 (Congress / Onmakkenega style large hut) -->
          <rect x="390" y="320" width="220" height="100" rx="4" fill="#603813" />
          <polygon points="360,320 500,210 640,320" fill="#a16207" />
          <!-- Hut 3 -->
          <rect x="660" y="350" width="150" height="70" rx="3" />
          <polygon points="640,350 735,275 830,350" fill="#92400e" />
          <!-- Hut 4 -->
          <rect x="850" y="360" width="120" height="60" rx="3" />
          <polygon points="830,360 910,290 990,360" fill="#a16207" />
        </g>
        <!-- Coconut palms towering behind the community -->
        <path d="M340 340 Q330 200 290 120" stroke="#451a03" strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M780 340 Q800 180 840 100" stroke="#451a03" strokeWidth="12" strokeLinecap="round" fill="none" />
        <g stroke="#14532d" strokeWidth="6" strokeLinecap="round">
          <path d="M290 120 Q200 90 150 130" />
          <path d="M290 120 Q250 50 210 30" />
          <path d="M290 120 Q330 40 370 20" />
          <path d="M290 120 Q350 90 400 110" />
          <path d="M840 100 Q760 70 710 110" />
          <path d="M840 100 Q820 40 780 10" />
          <path d="M840 100 Q900 40 940 20" />
          <path d="M840 100 Q910 80 960 110" />
        </g>
      </svg>
    `,
  },

  // 11. About: Welcoming travel coordinators overlooking Caribbean lagoon from behind
  {
    filename: 'about.jpg',
    width: 1200,
    height: 900,
    svg: `
      <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="abtSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="55%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="abtSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <rect width="1200" height="520" fill="url(#abtSky)" />
        <rect y="480" width="1200" height="420" fill="url(#abtSea)" />
        <!-- Idyllic coral atoll in the background -->
        <ellipse cx="600" cy="500" rx="300" ry="25" fill="#fef3c7" />
        <ellipse cx="600" cy="495" rx="270" ry="18" fill="#15803d" />
        <!-- Wooden deck railing in foreground -->
        <rect x="0" y="720" width="1200" height="180" fill="#451a03" />
        <line x1="0" y1="720" x2="1200" y2="720" stroke="#78350f" strokeWidth="16" />
        <!-- Two hosts standing side by side seen from behind overlooking the islands -->
        <!-- Coordinator 1 (Host left) -->
        <g id="host1" transform="translate(440, 520)">
          <!-- Head / Hair -->
          <circle cx="50" cy="40" r="30" fill="#78350f" />
          <!-- Linen shirt / shoulders -->
          <path d="M0 180 L20 85 Q50 75 80 85 L100 180 Z" fill="#f8fafc" />
        </g>
        <!-- Coordinator 2 (Host right) -->
        <g id="host2" transform="translate(620, 500)">
          <!-- Head / Cap -->
          <circle cx="55" cy="45" r="32" fill="#1e293b" />
          <path d="M30 45 Q55 35 85 45 Z" fill="#0f172a" />
          <!-- Navy / turquoise island polo -->
          <path d="M0 200 L25 95 Q60 85 95 95 L120 200 Z" fill="#0369a1" />
        </g>
      </svg>
    `,
  },

  // 12. Islands: Cayos Limón showcase
  {
    filename: 'islands.jpg',
    width: 1200,
    height: 800,
    svg: `
      <svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="islSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="islSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="35%" stopColor="#0891b2" />
            <stop offset="70%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill="url(#islSky)" />
        <rect y="400" width="1200" height="400" fill="url(#islSea)" />
        <!-- Picture-perfect Cayos Limón island in center -->
        <ellipse cx="600" cy="470" rx="340" ry="75" fill="#fef3c7" />
        <ellipse cx="600" cy="460" rx="300" ry="50" fill="#15803d" />
        <!-- Palm grove on island -->
        <g stroke="#713f12" strokeWidth="12" strokeLinecap="round" fill="none">
          <path d="M520 460 Q500 320 470 200" />
          <path d="M580 460 Q575 300 560 170" />
          <path d="M640 460 Q655 310 680 190" />
          <path d="M700 460 Q725 330 750 220" />
        </g>
        <g stroke="#14532d" strokeWidth="6" strokeLinecap="round">
          <path d="M470 200 Q360 180 300 220" />
          <path d="M470 200 Q410 130 360 100" />
          <path d="M470 200 Q490 120 520 90" />
          <path d="M560 170 Q500 90 460 60" />
          <path d="M560 170 Q620 90 660 70" />
          <path d="M680 190 Q620 110 590 80" />
          <path d="M680 190 Q740 120 780 100" />
          <path d="M680 190 Q760 170 820 200" />
          <path d="M750 220 Q820 180 880 210" />
        </g>
      </svg>
    `,
  },
];

async function run() {
  console.log('Generating pristine local placeholder JPEG files...');
  for (const item of IMAGES) {
    const buffer = Buffer.from(item.svg);
    const jpegBuffer = await sharp(buffer)
      .resize(item.width, item.height)
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toBuffer();

    // 1. Write to public/pictures/placeholder/
    const publicPath = path.join(PUBLIC_DIR, item.filename);
    fs.writeFileSync(publicPath, jpegBuffer);

    // 2. Write to src/pictures/placeholder/
    const srcPath = path.join(SRC_DIR, item.filename);
    fs.writeFileSync(srcPath, jpegBuffer);

    console.log(`Generated: ${item.filename} (${jpegBuffer.length} bytes)`);
  }

  // Also populate specific paths that ASSET_PATHS looks for:
  // experiences
  fs.copyFileSync(path.join(PUBLIC_DIR, 'day-trip.jpg'), path.join(EXPERIENCES_DIR, 'san_blas_day_trip.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'overnight.jpg'), path.join(EXPERIENCES_DIR, 'island_overnight_cabana.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'multi-day.jpg'), path.join(EXPERIENCES_DIR, 'multi_day_exploration.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'private-custom.jpg'), path.join(EXPERIENCES_DIR, 'private_custom_charter.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'sailing.jpg'), path.join(EXPERIENCES_DIR, 'san_blas_sailing.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'catamaran.jpg'), path.join(EXPERIENCES_DIR, 'luxury_catamaran.jpg'));

  // culture
  fs.copyFileSync(path.join(PUBLIC_DIR, 'culture.jpg'), path.join(CULTURE_DIR, 'traditional_guna_mola.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'cayuco.jpg'), path.join(CULTURE_DIR, 'cayuco_wooden_boat.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'community.jpg'), path.join(CULTURE_DIR, 'guna_community_island.jpg'));

  // about
  fs.copyFileSync(path.join(PUBLIC_DIR, 'about.jpg'), path.join(ABOUT_DIR, 'petra.jpg'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'about.jpg'), path.join(ABOUT_DIR, 'abisua.jpg'));

  console.log('All local placeholder image assets successfully generated and synced!');
}

run().catch((err) => {
  console.error('Error generating images:', err);
  process.exit(1);
});
