
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";

export default function Timeline() {
  const [, params] = useRoute("/timeline/:slug?");
  const slug = params?.slug || "default";

  const { data: timelineData, isLoading } = trpc.timelines.get.useQuery({ slug });
  const gestoes = timelineData?.gestoes;

  const trackRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    velX: 0,
    momentumID: 0,
  });

  const sortedGestoes = gestoes ? [...gestoes].sort((a, b) => b.displayOrder - a.displayOrder) : [];

  useEffect(() => {
    if (sortedGestoes.length === 0) return;

    // Determine initial active index
    const initialIndex = sortedGestoes.findIndex((g) => g.startActive);
    const targetIndex = initialIndex >= 0 ? initialIndex : sortedGestoes.length - 1;

    // Only set if not already set or invalid
    if (activeIndex === null) {
      setActiveIndex(targetIndex);
      setTimeout(() => {
        centerNode(targetIndex);
        renderCard(sortedGestoes[targetIndex], true);
      }, 300); // Increased timeout to ensure layout is ready
    }
  }, [sortedGestoes]);

  // Handle activeIndex changes (clicked or navigated)
  useEffect(() => {
    if (activeIndex !== null && sortedGestoes[activeIndex]) {
      centerNode(activeIndex);
      renderCard(sortedGestoes[activeIndex], false);
    }
  }, [activeIndex]);


  const centerNode = (index: number) => {
    const node = nodeRefs.current[index];
    const track = trackRef.current;
    if (!node || !track) return;
    const trackCenter = track.clientWidth / 2;
    const nodeCenter = node.offsetLeft + node.clientWidth / 2;
    track.scrollTo({ left: nodeCenter - trackCenter, behavior: "smooth" });
  };

  const renderCard = (data: any, firstRun: boolean) => {
    if (!contentAreaRef.current) return;

    // Helper to filter and map members
    const getMembersByRole = (role: string) => {
      return data.members.filter((m: any) => m.role === role);
    };

    const boardRoles = [
      { role: 'presidente', label: 'Presidente' },
      { role: 'vice_presidente', label: 'Vice-Presidente' },
      { role: 'secretario_geral', label: 'Secretário Geral' },
      { role: 'secretario_adjunto', label: 'Secretário Geral Adjunto' },
      { role: 'tesoureiro', label: 'Tesoureiro' }
    ];

    const councilorTitular = getMembersByRole('conselheiro_titular');
    const councilorSuplente = getMembersByRole('conselheiro_suplente');
    const otherMembers = data.members.filter((m: any) => !m.role || !['presidente', 'vice_presidente', 'secretario_geral', 'secretario_adjunto', 'tesoureiro', 'conselheiro_titular', 'conselheiro_suplente'].includes(m.role));

    // Helper for Card HTML
    const createCardHTML = (name: string, label: string, isBoard: boolean = false, delay: number = 0) => `
        <div class="ot-member-card ${isBoard ? 'board' : 'councilor'}" style="animation-delay: ${delay}s">
            <div class="ot-card-icon ${!isBoard ? 'small' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div class="ot-card-info">
                <span class="ot-card-role ${!isBoard ? 'small' : ''}">${label}</span>
                <span class="ot-card-name ${!isBoard ? 'small' : ''}">${name}</span>
            </div>
        </div>
    `;

    // Generate Board Header (Left Side)
    const boardHTML = boardRoles.map((r, i) => {
      const member = getMembersByRole(r.role)[0];
      if (!member) return '';
      return createCardHTML(member.name, r.label, true, i * 0.1);
    }).join('');

    // Generate Councilor Grids (Right Side)
    const councilorSectionHTML = (members: any[], title: string, baseDelay: number) => {
      if (members.length === 0) return '';
      return `
            <div class="ot-council-group">
                <h4 class="ot-group-title">${title}</h4>
                <div class="ot-council-grid">
                    ${members.map((m, i) => createCardHTML(m.name, title, false, baseDelay + (i * 0.05))).join('')}
                </div>
            </div>
        `;
    };

    const councilContext = `
        ${councilorSectionHTML(councilorTitular, 'Conselheiro Titular', 0.5)}
        ${councilorSectionHTML(councilorSuplente, 'Conselheiro Suplente', 0.8)}
        ${councilorSectionHTML(otherMembers, 'Membro', 1.0)}
    `;

    const cardHTML = `
      <div class="ot-card visible">
        <div class="ot-card-header">
          <h3 class="ot-card-title">Gestão ${data.period}</h3>
          <div class="ot-card-subtitle">Corpo Diretivo e Conselho</div>
        </div>
        
        <div class="ot-layout-container">
            <!-- Left Column: Board -->
            <div class="ot-col-board">
                <h4 class="ot-section-title">Diretoria Executiva</h4>
                <div class="ot-board-stack">
                    ${boardHTML}
                </div>
            </div>

            <div class="ot-divider"></div>

            <!-- Right Column: Councilors -->
            <div class="ot-col-council">
                <h4 class="ot-section-title">Conselho Seccional</h4>
                <div class="ot-council-wrapper">
                    ${councilContext}
                </div>
            </div>
        </div>
      </div>
    `;

    if (firstRun) {
      contentAreaRef.current.innerHTML = cardHTML;
    } else {
      const currentCard = contentAreaRef.current.querySelector(".ot-card") as HTMLElement;
      if (currentCard) {
        currentCard.style.opacity = "0";
        currentCard.style.transform = "translateY(10px) scale(0.98)";
        setTimeout(() => {
          if (contentAreaRef.current) {
            contentAreaRef.current.innerHTML = cardHTML;
          }
        }, 300);
      } else {
        contentAreaRef.current.innerHTML = cardHTML;
      }
    }
  };

  const handleNodeClick = (index: number) => {
    if (Math.abs(dragState.current.velX) < 2) {
      setActiveIndex(index);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    dragState.current.isDown = true;
    dragState.current.startX = e.pageX - trackRef.current.offsetLeft;
    dragState.current.scrollLeft = trackRef.current.scrollLeft;
    cancelAnimationFrame(dragState.current.momentumID);
    dragState.current.velX = 0;
  };

  const handleMouseUp = () => {
    dragState.current.isDown = false;
    beginMomentum();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDown || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    const prevScroll = trackRef.current.scrollLeft;
    trackRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    dragState.current.velX = trackRef.current.scrollLeft - prevScroll;
  };

  const beginMomentum = () => {
    const step = () => {
      if (!trackRef.current) return;
      if (Math.abs(dragState.current.velX) < 0.5) return;
      trackRef.current.scrollLeft += dragState.current.velX;
      dragState.current.velX *= 0.95;
      dragState.current.momentumID = requestAnimationFrame(step);
    };
    dragState.current.momentumID = requestAnimationFrame(step);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]"><p>Carregando...</p></div>;
  if (!gestoes || gestoes.length === 0) return <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]"><p>Nenhuma gestão encontrada.</p></div>;

  return (
    <>
      <style>{timelineStyles}</style>
      <div id="oab-timeline-wrapper">
        <div className="ot-container">
          <div className="ot-header">
            <h2>{timelineData?.name || "Linha do Tempo"}</h2>
            <p>{timelineData?.description || "Histórico das Gestões"}</p>
          </div>
          <div className="ot-track-wrapper">
            <div className="ot-line-background"></div>
            <div className="ot-track" ref={trackRef} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}>
              {sortedGestoes.map((item, index) => (
                <div
                  key={item.id}
                  className={`ot-node ${index === activeIndex ? 'active' : ''}`}
                  ref={el => nodeRefs.current[index] = el}
                  onClick={() => handleNodeClick(index)}
                >
                  <div className="ot-dot"></div>
                  <span className="ot-year">{item.period}</span>
                  <div className="ot-connector"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="ot-content-wrapper" ref={contentAreaRef}></div>
          <div className="ot-controls">
            <button className="ot-btn" onClick={() => activeIndex !== null && setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Anterior
            </button>
            <button className="ot-btn" onClick={() => activeIndex !== null && setActiveIndex(Math.min(sortedGestoes.length - 1, activeIndex + 1))} disabled={activeIndex === sortedGestoes.length - 1}>
              Próximo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const timelineStyles = `
/* ===== 1. VARIÁVEIS E ESCOPO ===== */
#oab-timeline-wrapper {
    /* Paleta de Cores Premium */
    --c-blue-dark: #0f2e5a;   /* Azul Institucional Escuro */
    --c-blue-light: #2c5ba3;  /* Azul mais vibrante para highlights */
    --c-gold: #c5a059;        /* Dourado OAB */
    --c-gold-light: #e6c88a;  /* Dourado claro para brilhos */
    --c-text-main: #333333;
    --c-text-light: #666666;
    
    /* Superfícies */
    --bg-page: #f0f4f8;
    --glass-surface: rgba(255, 255, 255, 0.95);
    --glass-border: rgba(255, 255, 255, 0.8);
    
    /* Sombras e Efeitos */
    --shadow-card: 0 25px 50px -10px rgba(15, 46, 90, 0.2);
    --shadow-node: 0 4px 12px rgba(0,0,0,0.1);
    --glow-active: 0 0 0 6px rgba(197, 160, 89, 0.2);
    
    /* Tipografia */
    font-family: 'Montserrat', 'Segoe UI', sans-serif;
    color: var(--c-text-main);
    
    /* Layout */
    position: relative;
    width: 100%;
    padding: 60px 0;
    overflow: hidden;
    background: radial-gradient(circle at top right, #eef2f7 0%, #ffffff 100%);
    box-sizing: border-box;
    min-height: 100vh;
}

#oab-timeline-wrapper * {
    box-sizing: border-box;
}

.ot-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 30px;
    position: relative;
    z-index: 2;
}

/* ===== 2. HERO HEADER ===== */
.ot-header {
    text-align: center;
    margin-bottom: 60px;
    animation: fadeInDown 0.8s ease-out;
}

.ot-header h2 {
    font-size: clamp(32px, 6vw, 48px);
    color: var(--c-blue-dark);
    text-transform: uppercase;
    margin: 0;
    letter-spacing: -1.5px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--c-blue-dark) 0%, var(--c-blue-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.ot-header p {
    font-family: 'Open Sans', sans-serif;
    font-size: clamp(14px, 3vw, 16px);
    color: var(--c-gold);
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-top: 15px;
    font-weight: 700;
}

.ot-header::after {
    content: '';
    display: block;
    width: 80px;
    height: 4px;
    background: var(--c-gold);
    margin: 25px auto 0;
    border-radius: 2px;
}

/* ===== 3. TRACK ===== */
.ot-track-wrapper {
    position: relative;
    height: 160px;
    margin-bottom: 20px;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
}

.ot-track {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 50vw;
    overflow-x: auto;
    overflow-y: hidden;
    cursor: grab;
    scrollbar-width: none;
    -ms-overflow-style: none;
    user-select: none;
}
.ot-track::-webkit-scrollbar { display: none; }
.ot-track:active { cursor: grabbing; }

.ot-line-background {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: #e0e0e0;
    z-index: 0;
    transform: translateY(-50%);
}

.ot-node {
    position: relative;
    flex-shrink: 0;
    width: 150px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1;
    transition: all 0.3s;
    opacity: 0.6;
}
.ot-node:hover { opacity: 1; }
.ot-node.active { opacity: 1; }

.ot-dot {
    width: 18px;
    height: 18px;
    background: #fff;
    border: 3px solid var(--c-blue-dark);
    border-radius: 50%;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
    box-shadow: var(--shadow-node);
    z-index: 2;
}

.ot-year {
    position: absolute;
    top: 40px;
    font-size: 14px;
    font-weight: 700;
    color: #999;
    transition: all 0.4s ease;
    font-family: 'Montserrat', sans-serif;
}

.ot-node:hover .ot-dot { transform: scale(1.3); border-color: var(--c-gold); }
.ot-node:hover .ot-year { color: var(--c-blue-dark); }

.ot-node.active .ot-dot {
    transform: scale(1.6);
    background: var(--c-gold);
    border-color: var(--c-blue-dark);
    box-shadow: var(--glow-active);
}
.ot-node.active .ot-year {
    top: 22px;
    font-size: 20px;
    color: var(--c-blue-dark);
    font-weight: 800;
}

.ot-connector {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 0;
    background: linear-gradient(to bottom, var(--c-blue-dark) 0%, transparent 100%);
    transform: translateX(-50%);
    transition: height 0.4s ease 0.1s;
    z-index: 0;
    opacity: 0;
}
.ot-node.active .ot-connector { height: 120px; opacity: 1; }

/* ===== 4. CONTENT CARD ===== */
.ot-content-wrapper {
    position: relative;
    margin-top: 10px;
    display: flex;
    justify-content: center;
    perspective: 1000px;
    min-height: 500px;
    padding-bottom: 40px;
}

.ot-card {
    width: 100%;
    max-width: 1200px;
    background: var(--glass-surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-top: 5px solid var(--c-gold);
    border-radius: 20px;
    padding: 50px;
    box-shadow: var(--shadow-card);
    opacity: 0;
    transform: translateY(20px) scale(0.98);
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    display: none;
}
.ot-card.visible { display: block; opacity: 1; transform: translateY(0) scale(1); }

.ot-card-header {
    text-align: center;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding-bottom: 30px;
    margin-bottom: 40px;
}

.ot-card-title {
    font-size: 32px;
    color: var(--c-blue-dark);
    margin: 0;
    font-weight: 800;
    letter-spacing: -1px;
}
.ot-card-subtitle {
    font-size: 13px;
    color: var(--c-gold);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 10px;
    font-weight: 700;
}

/* ===== 5. LAYOUT GRID ===== */
.ot-layout-container {
    display: grid;
    grid-template-columns: 350px 1px 1fr;
    gap: 50px;
    align-items: start;
}

.ot-divider {
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.1) 80%, transparent);
    height: 100%;
    min-height: 400px;
}

.ot-section-title {
    font-size: 14px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 0 0 30px 0;
    font-weight: 700;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 15px;
    display: block;
}

/* BOARD STYLING */
.ot-board-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* MEMBER CARD COMPONENT */
.ot-member-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.04);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.ot-member-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 12px 30px rgba(0,0,0,0.08);
    border-color: rgba(197, 160, 89, 0.3);
}

.ot-member-card.board {
    border-left: 4px solid var(--c-gold);
    padding-left: 20px;
}
.ot-member-card.board:hover {
    background: linear-gradient(to right, #fff, #fdfbf5);
}

.ot-card-icon {
    width: 36px;
    height: 36px;
    background: #f0f4f8;
    color: var(--c-blue-dark);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 18px;
    flex-shrink: 0;
    transition: all 0.3s;
}
.ot-member-card:hover .ot-card-icon {
    background: var(--c-blue-dark);
    color: #fff;
    transform: rotate(360deg);
}

.ot-card-info {
    display: flex;
    flex-direction: column;
}

.ot-card-role {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--c-gold);
    font-weight: 800;
    margin-bottom: 3px;
    letter-spacing: 0.5px;
}
.ot-card-role.small {
    color: #999;
}

.ot-card-name {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    line-height: 1.2;
}
.ot-card-name.small {
    font-size: 14px;
    font-weight: 600;
}

/* COUNCIL STYLING */
.ot-council-group { margin-bottom: 40px; }
.ot-group-title {
    font-size: 15px;
    color: var(--c-blue-light);
    margin: 0 0 20px 0;
    font-weight: 700;
    display: flex;
    align-items: center;
}
.ot-group-title::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    background: var(--c-gold);
    border-radius: 50%;
    margin-right: 10px;
}

.ot-council-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
}

.ot-card-icon.small {
    width: 28px;
    height: 28px;
    margin-right: 12px;
}
.ot-card-icon.small svg { width: 14px; height: 14px; }

/* CONTROLS */
.ot-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding-bottom: 40px;
}

.ot-btn {
    background: #fff;
    color: var(--c-blue-dark);
    border: 2px solid var(--c-blue-dark);
    padding: 12px 35px;
    border-radius: 50px;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 10px;
}

.ot-btn:hover:not(:disabled) {
    background: var(--c-blue-dark);
    color: #fff;
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(15, 46, 90, 0.2);
}

.ot-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: #ddd;
    color: #aaa;
}

/* RESPONSIVE */
@media (max-width: 1100px) {
    .ot-layout-container { grid-template-columns: 1fr; gap: 40px; }
    .ot-divider { display: none; }
    .ot-col-board { border-bottom: 1px solid #eee; padding-bottom: 40px; }
}

@media (max-width: 768px) {
    .ot-container { padding: 0 15px; }
    .ot-card { padding: 30px 20px; }
    .ot-header h2 { font-size: 28px; }
    .ot-council-grid { grid-template-columns: 1fr; }
    .ot-node { width: 90px; }
    .ot-track-wrapper { height: 120px; }
    .ot-year { font-size: 12px; top: 30px; }
    .ot-node.active .ot-year { font-size: 16px; top: 18px; }
    .ot-btn { padding: 10px 20px; font-size: 11px; }
}
`;
