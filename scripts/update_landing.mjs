import fs from 'fs';
import path from 'path';

function updateFile(relPath) {
  const filePath = path.resolve(relPath);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', relPath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Update Title tag
  content = content.replace(
    /<title>.*?<\/title>/,
    '<title>NeuroScope 360 AI | 360° Digital Twin Neuro-Oncology Platform</title>'
  );

  // 2. Update Top Navbar Brand: TUMOR LENS -> NEUROSCOPE 360 AI
  const oldBrandRegex = /<span class="[^"]*font-display">TUMOR LENS<\/span>[\s\S]*?<span class="[^"]*tracking-\[0\.25em\][^"]*">Anatomy\. Activity\. Insight\.<\/span>/;
  const newBrand = `<div class="flex items-center gap-2">
            <span class="font-black tracking-wider text-lg sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-sky-400 font-display">
              NEUROSCOPE <span class="text-cyan-400">360</span>
            </span>
            <span class="rounded bg-gradient-to-r from-cyan-500 to-blue-600 px-2 py-0.5 font-mono text-[11px] font-black tracking-wider text-slate-950 shadow-sm shadow-cyan-500/40">
              AI
            </span>
          </div>
          <span class="text-[9px] sm:text-[10px] block font-mono text-cyan-400/80 tracking-[0.22em] uppercase font-semibold">360° Precision Neuro-Oncology Digital Twin</span>`;
  
  if (oldBrandRegex.test(content)) {
    content = content.replace(oldBrandRegex, newBrand);
    console.log('Brand updated to NEUROSCOPE 360 AI in', relPath);
  }

  // 3. Update Hero Section: Large "NEUROSCOPE 360", Large "AI", and visually beautiful by-line
  const oldHeroRegex = /<div class="inline-flex items-center space-x-2 px-3 py-1\.5 rounded-full bg-cyan-950\/80[\s\S]*?<p class="text-slate-300 text-sm md:text-base font-light leading-relaxed">[\s\S]*?<\/p>/;
  const newHero = `<div class="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/40 text-xs font-mono text-cyan-300 shadow-md shadow-cyan-500/20">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span class="tracking-widest font-bold">NEXT-GEN CLINICAL AI PLATFORM</span>
            </div>

            <div class="space-y-1">
              <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] text-white font-display">
                NEUROSCOPE <span class="gradient-text glow-text-cyan">360</span>
                <span class="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-[#3478ff] tracking-tight mt-1">
                  AI
                </span>
              </h1>
            </div>

            <!-- Visually Beautiful Formatted By-Line -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center gap-3">
                <div class="h-[2px] w-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></div>
                <span class="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300 font-bold">
                  360° Living Digital Twin &bull; Real-Time Sub-Voxel Oncology &bull; WhatsApp Pipeline
                </span>
                <div class="h-[1px] flex-1 bg-gradient-to-r from-blue-500/40 to-transparent"></div>
              </div>
              <p class="text-slate-200 text-sm md:text-[15px] font-normal leading-relaxed">
                NeuroScope 360 AI transforms multi-parametric MRI &amp; CT acquisitions into an interactive, photorealistic 3D anatomical twin. Track real-time electrical axonal pathways across cortical gyri, inspect deep-seated tumor compartments with sub-millimeter precision, and automatically compile verified clinical PDF diagnostic reports for direct WhatsApp delivery.
              </p>
            </div>`;

  if (oldHeroRegex.test(content)) {
    content = content.replace(oldHeroRegex, newHero);
    console.log('Hero section updated with large NEUROSCOPE 360, large AI, and formatted by-line in', relPath);
  } else {
    console.log('oldHeroRegex did not match, trying alternative pattern');
    // In case previous script ran or title was altered
    const altHeroRegex = /<h1 class="[^"]*font-display">[\s\S]*?<\/h1>[\s\S]*?<p class="text-slate-300[\s\S]*?<\/p>/;
    if (altHeroRegex.test(content)) {
      content = content.replace(altHeroRegex, newHero);
      console.log('Hero section updated via alt regex in', relPath);
    }
  }

  // 4. Increase size of brain 3D model by 50%
  // anatomy = new THREE.Group(); anatomy.scale.set(1.5, 1.5, 1.5); scene.add(anatomy);
  if (!content.includes('anatomy.scale.set(1.5, 1.5, 1.5)')) {
    content = content.replace(
      'anatomy=new THREE.Group();scene.add(anatomy);',
      'anatomy=new THREE.Group();anatomy.scale.set(1.5,1.5,1.5);scene.add(anatomy);'
    );
    console.log('Scaled anatomy by 1.5 (50% increase) in', relPath);
  }

  // Adjust camera targeting and distance for the 50% larger brain
  content = content.replace(
    'target.copy(lesionCenter).multiplyScalar(approach);',
    'target.copy(lesionCenter).multiplyScalar(1.5*approach);'
  );

  content = content.replace(
    'const distance=THREE.MathUtils.lerp(mobile?13:9.0,2.45,approach)*(1-enter)+.36*enter;',
    'const distance=THREE.MathUtils.lerp(mobile?14.5:10.5,3.68,approach)*(1-enter)+.54*enter;'
  );

  content = content.replace(
    'const v=lesionCenter.clone().project(camera);',
    'const v=lesionCenter.clone().multiplyScalar(1.5).project(camera);'
  );

  // Top header button to enter studio
  const targetHeaderBtn = `<button id="btn-enter-studio" onclick="if(window.parent!==window){window.parent.postMessage({type:'ENTER_STUDIO'},'*');}else{window.location.href='/';}" class="px-4 sm:px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 hover:opacity-90 font-bold text-xs text-slate-950 font-mono tracking-wider shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2 cursor-pointer">
          <span>LAUNCH 3D STUDIO</span><i class="fa-solid fa-arrow-right"></i>
        </button>`;

  if (!content.includes('LAUNCH 3D STUDIO')) {
    content = content.replace(
      /<a href="#demo" class="[^"]*">[\s\S]*?<span>CLINICAL DEMO<\/span>[\s\S]*?<\/a>/,
      targetHeaderBtn
    );
  }

  // Bottom CTA
  content = content.replace(
    'id="request-demo-btn" class="',
    'id="request-demo-btn" onclick="if(window.parent!==window){window.parent.postMessage({type:\'ENTER_STUDIO\'},\'*\');}else{window.location.href=\'/\';}" class="cursor-pointer '
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Saved', relPath, 'successfully!');
}

updateFile('public/landing.html');
updateFile('Tumor_Lens_Transparent_Neural_Journey.html');
