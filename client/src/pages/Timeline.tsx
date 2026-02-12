
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
      // Update active class on nodes manually if needed, or rely on React TESTE
      // Since we render with React now, the class active is applied in JSX
      // But we need to center it and show card
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

    // Fallback for members without role or other roles
    const otherMembers = data.members.filter((m: any) => !m.role || !['presidente', 'vice_presidente', 'secretario_geral', 'secretario_adjunto', 'tesoureiro', 'conselheiro_titular', 'conselheiro_suplente'].includes(m.role));

    // Generate HTML for Board (Right Side - Vertical List)
    const boardHTML = boardRoles.map(r => {
      const member = getMembersByRole(r.role)[0]; // Assuming one per role for board
      if (!member) return '';
      return `
            <div class="ot-board-item">
                <span class="ot-board-label">${r.label}</span>
                <span class="ot-board-name">${member.name}</span>
            </div>
        `;
    }).join('');

    // Generate HTML for Councilors (Left Side - Columns)
    const councilorsHTML = `
        <div class="ot-council-section">
            ${councilorTitular.length > 0 ? `
                <div class="ot-council-group">
                    <h4>Conselheiros Titulares</h4>
                    <div class="ot-council-list">
                        ${councilorTitular.map((m: any) => `<span>${m.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${councilorSuplente.length > 0 ? `
                <div class="ot-council-group">
                    <h4>Conselheiros Suplentes</h4>
                    <div class="ot-council-list">
                        ${councilorSuplente.map((m: any) => `<span>${m.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
             ${otherMembers.length > 0 ? `
                <div class="ot-council-group">
                    <h4>Membros</h4>
                    <div class="ot-council-list">
                        ${otherMembers.map((m: any) => `<span>${m.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    const cardHTML = `
      <div class="ot-card visible">
        <div class="ot-card-header">
          <h3 class="ot-card-title">Gestão ${data.period}</h3>
        </div>
        
        <div class="ot-layout-grid">
            <!-- Left Column: Councilors -->
            <div class="ot-col-council">
                ${councilorsHTML}
            </div>

            <!-- Right Column: Board -->
            <div class="ot-col-board">
                <div class="ot-board-list">
                    ${boardHTML}
                </div>
            </div>
        </div>
      </div>
    `;

    // Always just replace content for simplicity and ensure animation triggers
    // If it's the same card, we might want to avoid flicker, but the original logic handled it well
    if (firstRun) {
      contentAreaRef.current.innerHTML = cardHTML;
    } else {
      const currentCard = contentAreaRef.current.querySelector(".ot-card") as HTMLElement;
      if (currentCard) {
        currentCard.style.opacity = "0";
        currentCard.style.transform = "translateY(10px)";
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
  const councilorTitular = getMembersByRole('conselheiro_titular');
  const councilorSuplente = getMembersByRole('conselheiro_suplente');

  // Fallback for members without role or other roles
  const otherMembers = data.members.filter((m: any) => !m.role || !['presidente', 'vice_presidente', 'secretario_geral', 'secretario_adjunto', 'tesoureiro', 'conselheiro_titular', 'conselheiro_suplente'].includes(m.role));

  // Generate HTML for Board (Right Side - Vertical List)
  const boardHTML = boardRoles.map(r => {
    const member = getMembersByRole(r.role)[0]; // Assuming one per role for board
    if (!member) return '';
    return `
            <div class="ot-board-item">
                <span class="ot-board-label">${r.label}</span>
                <span class="ot-board-name">${member.name}</span>
            </div>
        `;
  }).join('');

  // Generate HTML for Councilors (Left Side - Columns)
  const councilorsHTML = `
        <div class="ot-council-section">
            ${councilorTitular.length > 0 ? `
                <div class="ot-council-group">
                    <h4>Conselheiros Titulares</h4>
                    <div class="ot-council-list">
                        ${councilorTitular.map((m: any) => `<span>${m.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${councilorSuplente.length > 0 ? `
                <div class="ot-council-group">
                    <h4>Conselheiros Suplentes</h4>
                    <div class="ot-council-list">
                        ${councilorSuplente.map((m: any) => `<span>${m.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
             ${otherMembers.length > 0 ? `
                <div class="ot-council-group">
                    <h4>Membros</h4>
                    <div class="ot-council-list">
                        ${otherMembers.map((m: any) => `<span>${m.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

  const cardHTML = `
      <div class="ot-card visible">
        <div class="ot-card-header">
          <h3 class="ot-card-title">Gestão ${data.period}</h3>
        </div>
        
        <div class="ot-layout-grid">
            <!-- Left Column: Councilors -->
            <div class="ot-col-council">
                ${councilorsHTML}
            </div>

            <!-- Right Column: Board -->
            <div class="ot-col-board">
                <div class="ot-board-list">
                    ${boardHTML}
                </div>
            </div>
        </div>
      </div>
    `;

  // Always just replace content for simplicity and ensure animation triggers
  // If it's the same card, we might want to avoid flicker, but the original logic handled it well
  if (firstRun) {
    contentAreaRef.current.innerHTML = cardHTML;
  } else {
    const currentCard = contentAreaRef.current.querySelector(".ot-card") as HTMLElement;
    if (currentCard) {
      currentCard.style.opacity = "0";
      currentCard.style.transform = "translateY(10px)";
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
    --glass-surface: rgba(255, 255, 255, 0.92);
    --glass-border: rgba(255, 255, 255, 0.6);
    
    /* Sombras e Efeitos */
    --shadow-card: 0 20px 40px -5px rgba(15, 46, 90, 0.15);
    --shadow-node: 0 4px 10px rgba(0,0,0,0.1);
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
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 2;
}

/* ===== 2. CABEÇALHO ===== */
.ot-header {
    text-align: center;
    margin-bottom: 50px;
    animation: fadeInDown 0.8s ease-out;
}

.ot-header h2 {
    font-size: clamp(28px, 5vw, 42px);
    color: var(--c-blue-dark);
    text-transform: uppercase;
    margin: 0;
    letter-spacing: -1px;
    font-weight: 800;
}

.ot-header p {
    font-family: 'Open Sans', sans-serif;
    font-size: clamp(14px, 3vw, 16px);
    color: var(--c-gold);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 10px;
    font-weight: 600;
}

.ot-header::after {
    content: '';
    display: block;
    width: 80px;
    height: 4px;
    background: linear-gradient(90deg, var(--c-blue-dark), var(--c-gold));
    margin: 20px auto 0;
    border-radius: 2px;
}

/* ===== 3. TRACK (TRILHO) DA LINHA DO TEMPO ===== */
.ot-track-wrapper {
    position: relative;
    height: 160px; /* Altura da área das bolinhas */
    margin-bottom: 10px;
    /* Máscaras para indicar que tem mais conteúdo */
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
}

.ot-track {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 50vw; /* Padding enorme para centralizar o primeiro/ultimo item */
    overflow-x: auto;
    overflow-y: hidden;
    cursor: grab;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE */
    scroll-behavior: auto; /* Controlado via JS para inércia */
    user-select: none;
}

.ot-track::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
}

.ot-track:active {
    cursor: grabbing;
}

/* Linha central cinza */
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

/* ===== 4. NÓS (BOLINHAS) ===== */
.ot-node {
    position: relative;
    flex-shrink: 0;
    width: 140px; /* Espaço horizontal ocupado por cada nó */
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1;
}

/* O Círculo */
.ot-dot {
    width: 18px;
    height: 18px;
    background: #fff;
    border: 3px solid var(--c-blue-dark);
    border-radius: 50%;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
    box-shadow: var(--shadow-node);
    position: relative;
    z-index: 2;
}

/* O Ano (Texto) */
.ot-year {
    position: absolute;
    top: 35px; /* Posição inicial */
    font-size: 14px;
    font-weight: 700;
    color: var(--c-text-light);
    opacity: 0.6;
    transition: all 0.4s ease;
    font-family: 'Montserrat', sans-serif;
}

/* Hover */
.ot-node:hover .ot-dot {
    transform: scale(1.3);
    border-color: var(--c-gold);
}

.ot-node:hover .ot-year {
    color: var(--c-blue-dark);
    opacity: 1;
}

/* ATIVO */
.ot-node.active .ot-dot {
    transform: scale(1.6);
    background: var(--c-gold);
    border-color: var(--c-blue-dark);
    box-shadow: var(--glow-active);
}

.ot-node.active .ot-year {
    top: 20px; /* Sobe um pouco */
    font-size: 18px;
    color: var(--c-blue-dark);
    opacity: 1;
    font-weight: 800;
}

/* Conector Vertical (A linha que desce até o card) */
.ot-connector {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 0;
    background: linear-gradient(to bottom, var(--c-blue-dark) 0%, transparent 100%);
    transform: translateX(-50%);
    transition: height 0.4s ease 0.1s; /* Delayzinho suave */
    z-index: 0;
    opacity: 0;
}

.ot-node.active .ot-connector {
    height: 120px; /* Distância até o card */
    opacity: 1;
}

/* ===== 5. ÁREA DE CONTEÚDO (GLASS CARD) ===== */
.ot-content-wrapper {
    position: relative;
    margin-top: 20px;
    display: flex;
    justify-content: center;
    perspective: 1000px;
    min-height: 400px; /* Altura mínima para evitar pulos */
}

.ot-card {
    width: 100%;
    max-width: 900px;
    background: var(--glass-surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-top: 4px solid var(--c-gold);
    border-radius: 16px;
    padding: 40px;
    box-shadow: var(--shadow-card);
    opacity: 0;
    transform: translateY(20px) scale(0.98);
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    display: none; /* Controlado via JS */
}

.ot-card.visible {
    display: block;
    opacity: 1;
    transform: translateY(0) scale(1);
    animation: cardFloat 0.6s ease-out;
}

.ot-card-header {
    text-align: center;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding-bottom: 25px;
    margin-bottom: 30px;
}

.ot-card-title {
    font-size: 24px;
    color: var(--c-blue-dark);
    margin: 0;
    font-weight: 700;
}

.ot-card-subtitle {
    font-size: 13px;
    color: var(--c-gold);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 8px;
    font-weight: 600;
}

/* Grid de Membros - Antigo (Mantido se necessário, mas substituído pelo novo layout) */
.ot-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

/* NOVO LAYOUT */
.ot-layout-grid {
    display: flex;
    flex-direction: row-reverse; /* Board on right, Council on left */
    gap: 40px;
    text-align: left;
}
@media (max-width: 768px) {
    .ot-layout-grid {
        flex-direction: column;
    }
}

/* Coluna Diretoria (Board) */
.ot-col-board {
    flex: 1;
    min-width: 300px;
    border-left: 1px solid rgba(0,0,0,0.1);
    padding-left: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.ot-board-item {
    margin-bottom: 20px;
}
.ot-board-label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--c-gold);
    font-weight: 700;
    margin-bottom: 4px;
    letter-spacing: 1px;
}
.ot-board-name {
    display: block;
    font-size: 18px;
    color: var(--c-blue-dark);
    font-weight: 600;
}

/* Coluna Conselheiros */
.ot-col-council {
    flex: 2;
}
.ot-council-group {
    margin-bottom: 30px;
}
.ot-council-group h4 {
    font-size: 16px;
    color: var(--c-blue-light);
    border-bottom: 2px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 15px;
    font-weight: 700;
}
.ot-council-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
}
.ot-council-list span {
    font-size: 14px;
    color: #555;
    background: #f9f9f9;
    padding: 8px 12px;
    border-radius: 6px;
    border-left: 3px solid transparent;
    transition: all 0.2s;
}
.ot-council-list span:hover {
    background: #fff;
    border-left-color: var(--c-gold);
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}


.ot-member-item { background: #fff; padding: 18px 25px; border-radius: 10px; display: flex; align-items: center; border-left: 4px solid #f0f0f0; transition: all 0.3s; }
.ot-member-item:hover { border-left-color: var(--c-gold); transform: translateX(8px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
.ot-controls { display: flex; justify-content: center; gap: 30px; margin-top: 50px; }
.ot-btn { background: #fff; color: var(--c-blue-dark); border: 1px solid var(--c-blue-dark); padding: 12px 30px; border-radius: 40px; cursor: pointer; font-weight: 700; transition: all 0.3s; }
.ot-btn:hover:not(:disabled) { background: var(--c-blue-dark); color: #fff; }
@media (max-width: 1024px) { 
    .ot-container { padding: 0 20px; } 
    .ot-card { padding: 30px; }
    .ot-col-board { border-left: none; padding-left: 0; border-top: 1px solid #eee; padding-top: 30px; margin-top: 30px; } 
}
`;

.ot - btn:disabled {
  opacity: 0.3;
  border - color: #ccc;
  color: #999;
  cursor: not - allowed;
}

/* ===== 7. ANIMAÇÕES GLOBAIS ===== */
@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
    to { opacity: 1; transform: translateX(0); }
}

/* Responsividade */
@media(max - width: 768px) {
    .ot - header h2 { font - size: 24px; }
    .ot - node { width: 100px; }
    .ot - card { padding: 25px 20px; }
    .ot - members - grid { grid - template - columns: 1fr; }
    .ot - track - wrapper {
    -webkit - mask - image: none;
    mask - image: none;
  }
}
`;
