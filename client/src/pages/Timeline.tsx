
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
  const [selectedMember, setSelectedMember] = useState<any>(null);

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

    // Helper for Pill HTML
    const createPillHTML = (member: any, label: string, showLabel: boolean = true, delay: number = 0) => `
        <div class="ot-member-pill" style="animation-delay: ${delay}s" data-member-id="${member.id}">
            <div class="ot-check-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div class="ot-member-text">
                ${showLabel ? `<span class="ot-role-label">${label}:</span>` : ''}
                <span class="ot-member-name">${member.name}</span>
            </div>
        </div>
    `;

    // Generate Board Header (Left Side Content)
    const boardHTML = boardRoles.map((r, i) => {
      const member = getMembersByRole(r.role)[0];
      if (!member) return '';
      return createPillHTML(member, r.label, true, i * 0.05);
    }).join('');

    // Generate Councilor Content (Right Side Content)
    const renderCouncilGroup = (members: any[], title: string, baseDelay: number) => {
      if (members.length === 0) return '';
      return `
            <div class="ot-council-group">
                <h4 class="ot-group-title">${title}</h4>
                <div class="ot-pill-grid">
                    ${members.map((m, i) => createPillHTML(m, title, false, baseDelay + (i * 0.05))).join('')}
                </div>
            </div>
        `;
    };

    const councilHTML = `
        ${renderCouncilGroup(councilorTitular, 'Conselheiro Titular', 0.2)}
        ${renderCouncilGroup(councilorSuplente, 'Conselheiro Suplente', 0.4)}
        ${renderCouncilGroup(otherMembers, 'Membro', 0.6)}
    `;

    const cardHTML = `
      <div class="ot-card visible">
        <div class="ot-card-header">
          <h3 class="ot-card-title">Gestão ${data.period}</h3>
          <div class="ot-card-subtitle">Corpo Diretivo e Conselho Seccional</div>
        </div>
        
        <div class="ot-layout-container">
            <!-- Left Column: Board -->
            <div class="ot-col-left">
                <h4 class="ot-section-title">Diretoria Executiva</h4>
                <div class="ot-stack">
                    ${boardHTML}
                </div>
            </div>

            <div class="ot-divider"></div>

            <!-- Right Column: Councilors -->
            <div class="ot-col-right">
                <h4 class="ot-section-title">Conselho</h4>
                <div class="ot-stack">
                    ${councilHTML}
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
        currentCard.style.transform = "translateY(15px) scale(0.98)";
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

  // Click handler for member pills via event delegation
  useEffect(() => {
    const handleContentClick = (e: MouseEvent) => {
      const pill = (e.target as HTMLElement).closest(".ot-member-pill");
      if (pill) {
        const memberIdStr = pill.getAttribute("data-member-id");
        if (memberIdStr) {
          const mId = parseInt(memberIdStr);
          const member = sortedGestoes.flatMap((g: any) => g.members).find((m: any) => m.id === mId);
          if (member) {
            setSelectedMember(member);
          }
        }
      }
    };

    const contentArea = contentAreaRef.current;
    if (contentArea) {
      contentArea.addEventListener("click", handleContentClick);
    }
    return () => {
      if (contentArea) {
        contentArea.removeEventListener("click", handleContentClick);
      }
    };
  }, [sortedGestoes]);

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
    snapToNearest();
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
      if (Math.abs(dragState.current.velX) < 0.5) {
        snapToNearest();
        return;
      }
      trackRef.current.scrollLeft += dragState.current.velX;
      dragState.current.velX *= 0.95;
      dragState.current.momentumID = requestAnimationFrame(step);
    };
    dragState.current.momentumID = requestAnimationFrame(step);
  };

  // Properly block mouse wheel scroll using native passive:false listener
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const preventDefault = (e: WheelEvent) => {
      e.preventDefault();
    };

    track.addEventListener('wheel', preventDefault, { passive: false });
    return () => track.removeEventListener('wheel', preventDefault);
  }, []);

  const snapToNearest = () => {
    const track = trackRef.current;
    if (!track) return;

    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    nodeRefs.current.forEach((node, index) => {
      if (node) {
        const nodeCenter = node.offsetLeft + node.clientWidth / 2;
        const distance = Math.abs(trackCenter - nodeCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    } else {
      centerNode(closestIndex);
    }
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
            <div className="ot-track" ref={trackRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
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

        {/* Member Popup Modal */}
        {selectedMember && (
          <div className="ot-modal-overlay" onClick={() => setSelectedMember(null)}>
            <div className="ot-modal-content" onClick={e => e.stopPropagation()}>
              <button className="ot-modal-close" onClick={() => setSelectedMember(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              <div className="ot-modal-body">
                <div className="ot-modal-image-container">
                  {selectedMember.photoUrl ? (
                    <img src={selectedMember.photoUrl} alt={selectedMember.name} className="ot-modal-image" />
                  ) : (
                    <div className="ot-modal-image-fallback">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  )}
                </div>
                <div className="ot-modal-info">
                  <span className="ot-modal-role">{selectedMember.role?.replace(/_/g, ' ') || 'Conselheiro'}</span>
                  <h3 className="ot-modal-name">{selectedMember.name}</h3>
                  <div className="ot-modal-divider"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const timelineStyles = `
/* ===== 1. VARIÁVEIS E ESCOPO ===== */
#oab-timeline-wrapper {
    --c-blue-dark: #0f2e5a;
    --c-blue-light: #2c5ba3;
    --c-gold: #c5a059;
    --c-gold-light: #e6c88a;
    --c-text-main: #333333;
    --c-text-light: #64748b;
    --bg-page: #f8fafc;
    --glass-surface: #ffffff;
    --glass-border: rgba(0,0,0,0.04);
    
    font-family: 'Montserrat', sans-serif;
    color: var(--c-text-main);
    background: var(--bg-page);
    min-height: 100vh;
    padding: 60px 0;
    overflow-x: hidden;
    overflow-y: hidden;
    touch-action: pan-x;
}

.ot-container { max-width: 1440px; margin: 0 auto; padding: 0 40px; }

/* HEADER */
.ot-header { text-align: center; margin-bottom: 60px; animation: fadeInDown 0.8s ease-out; }
.ot-header h2 { font-size: 48px; color: var(--c-blue-dark); text-transform: uppercase; font-weight: 900; letter-spacing: -2px; margin: 0; }
.ot-header p { font-size: 14px; color: var(--c-gold); text-transform: uppercase; letter-spacing: 4px; font-weight: 700; margin-top: 15px; }
.ot-header::after { content: ''; display: block; width: 60px; height: 4px; background: var(--c-gold); margin: 25px auto 0; border-radius: 2px; }

/* TRACK */
.ot-track-wrapper { 
    position: relative; 
    height: 220px; 
    margin-bottom: 20px; 
    overflow: hidden;
    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); 
    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); 
}

.ot-track { 
    display: flex; 
    align-items: center; 
    height: 100%; 
    padding: 0 50%; /* Centralização baseada no contêiner */
    overflow-x: auto; 
    scrollbar-width: none; 
    -ms-overflow-style: none;
    user-select: none; 
    cursor: grab; 
}
.ot-track::-webkit-scrollbar { display: none; }

.ot-line-background { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #e2e8f0; transform: translateY(-50%); }

.ot-node { 
    position: relative; 
    flex-shrink: 0; 
    width: 220px; 
    height: 100%; 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center; 
    cursor: pointer; 
    transition: all 0.3s; 
    opacity: 0.4; 
}
.ot-node.active { opacity: 1; }

.ot-dot { 
    width: 16px; height: 16px; 
    background: #fff; 
    border: 3px solid var(--c-blue-dark); 
    border-radius: 50%; 
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
    z-index: 5;
    position: relative;
}

.ot-node:hover .ot-dot { transform: scale(1.2); border-color: var(--c-gold); }

.ot-node.active .ot-dot { 
    transform: scale(1.6); 
    background: var(--c-gold); 
    border: 4px solid var(--c-blue-dark); 
    box-shadow: 0 0 0 15px rgba(197, 160, 89, 0.12);
}

.ot-year { 
    position: absolute; 
    top: 65px; 
    left: 50%;
    transform: translateX(-50%);
    font-size: 15px; 
    font-weight: 700; 
    color: #94a3b8; 
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
    text-align: center;
}

.ot-node.active .ot-year { 
    top: 30px; 
    font-size: 26px; 
    color: var(--c-blue-dark); 
    font-weight: 950; 
    letter-spacing: -1px;
    transform: translateX(-50%); 
}

.ot-connector { 
    position: absolute; 
    top: 50%; 
    left: 50%;
    width: 2px; 
    height: 0; 
    background: linear-gradient(to bottom, var(--c-blue-dark) 0%, rgba(15, 46, 90, 0.1) 80%, transparent 100%); 
    transform: translateX(-50%); 
    opacity: 0; 
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1;
}
.ot-node.active .ot-connector { height: 140px; opacity: 0.8; }

/* CARD IMPLEMENTATION (MATCHING IMAGE) */
.ot-content-wrapper { display: flex; justify-content: center; min-height: 600px; padding: 20px 0; }
.ot-card { 
    width: 100%; 
    max-width: 1300px; 
    background: #fff; 
    border-radius: 40px; 
    padding: 60px; 
    box-shadow: 0 30px 60px -12px rgba(15, 46, 90, 0.12);
    border: 1px solid var(--glass-border);
    animation: cardAppear 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes cardAppear { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

.ot-card-header { text-align: center; margin-bottom: 50px; }
.ot-card-title { font-size: 36px; color: var(--c-blue-dark); font-weight: 900; letter-spacing: -1.5px; margin: 0; }
.ot-card-subtitle { font-size: 13px; color: var(--c-gold); text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin-top: 10px; }

/* LAYOUT SPLIT */
.ot-layout-container { display: grid; grid-template-columns: 380px 1px 1fr; gap: 60px; align-items: start; }
.ot-divider { width: 1px; background: linear-gradient(to bottom, transparent, #eee 10%, #eee 90%, transparent); height: 100%; align-self: stretch; }

.ot-section-title { 
    font-size: 13px; font-weight: 800; color: #94a3b8; 
    text-transform: uppercase; letter-spacing: 2px; 
    margin-bottom: 30px; border-bottom: 2px solid #f8fafc; padding-bottom: 12px;
}

/* MEMBER PILL STYLE */
.ot-stack { display: flex; flex-direction: column; gap: 14px; }
.ot-pill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }

.ot-member-pill {
    background: #fff;
    padding: 14px 24px;
    border-radius: 100px; /* Pill Shape */
    display: flex;
    align-items: center;
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    animation: slideIn 0.5s backwards;
    min-height: 56px; /* Ensure a minimum height for the pill */
}

@keyframes slideIn { from { opacity: 0; transform: translateX(-15px); } to { opacity: 1; transform: translateX(0); } }

.ot-member-pill:hover {
    transform: translateX(8px);
    border-color: var(--c-gold-light);
    box-shadow: 0 10px 25px rgba(15, 46, 90, 0.08);
}

.ot-check-circle {
    width: 28px;
    height: 28px;
    background: #f1f5f9;
    color: var(--c-blue-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 18px;
    flex-shrink: 0;
}
.ot-check-circle svg { width: 14px; height: 14px; }

.ot-member-text { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font-family: 'Open Sans', sans-serif; }
.ot-role-label { font-size: 14px; font-weight: 700; color: #1e293b; white-space: nowrap; }
.ot-member-name { font-size: 14px; font-weight: 600; color: var(--c-text-light); text-transform: uppercase; }

/* COUNCIL SPECIFIC */
.ot-council-group { margin-bottom: 40px; }
.ot-group-title { font-size: 15px; color: var(--c-blue-dark); margin: 0 0 20px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

/* CONTROLS */
.ot-controls { display: flex; justify-content: center; gap: 20px; padding-bottom: 60px; }
.ot-btn { 
    background: #fff; color: var(--c-blue-dark); border: 2px solid var(--c-blue-dark); 
    padding: 14px 35px; border-radius: 100px; font-weight: 800; text-transform: uppercase; 
    font-size: 12px; letter-spacing: 1px; cursor: pointer; transition: all 0.3s; 
    display: flex; align-items: center; gap: 10px;
}
.ot-btn:hover:not(:disabled) { background: var(--c-blue-dark); color: #fff; transform: translateY(-3px); box-shadow: 0 10px 25px rgba(15, 46, 90, 0.2); }
.ot-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* RESPONSIVE */
@media (max-width: 1200px) {
    .ot-layout-container { grid-template-columns: 1fr; gap: 40px; }
    .ot-divider { display: none; }
    .ot-col-left { border-bottom: 1px solid #eee; padding-bottom: 40px; }
    .ot-pill-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
    .ot-container { padding: 0 20px; }
    .ot-card { padding: 40px 25px; border-radius: 30px; }
    .ot-header h2 { font-size: 32px; }
    .ot-node { width: 100px; }
    .ot-btn { padding: 12px 25px; }
}

/* MODAL STYLES */
.ot-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 46, 90, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease-out;
}

.ot-modal-content {
    background: #fff;
    width: 100%;
    max-width: 450px;
    border-radius: 32px;
    position: relative;
    box-shadow: 0 40px 100px -20px rgba(15, 46, 90, 0.3);
    overflow: hidden;
    animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

.ot-modal-close {
    position: absolute;
    top: 20px; right: 20px;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: #f1f5f9;
    border: none;
    color: var(--c-text-light);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
}
.ot-modal-close:hover { background: #e2e8f0; color: var(--c-blue-dark); transform: rotate(90deg); }
.ot-modal-close svg { width: 20px; height: 20px; }

.ot-modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 40px;
    text-align: center;
}

.ot-modal-image-container {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    overflow: hidden;
    background: #f8fafc;
    border: 6px solid #fff;
    box-shadow: 0 15px 35px rgba(15, 46, 90, 0.1);
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ot-modal-image { width: 100%; height: 100%; object-cover: cover; }
.ot-modal-image-fallback { color: #cbd5e1; }
.ot-modal-image-fallback svg { width: 60px; height: 60px; }

.ot-modal-role {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 800;
    color: var(--c-gold);
    margin-bottom: 12px;
    display: block;
}

.ot-modal-name {
    font-size: 28px;
    font-weight: 900;
    color: var(--c-blue-dark);
    line-height: 1.2;
    margin: 0 0 20px 0;
}

.ot-modal-divider {
    width: 40px;
    height: 3px;
    background: var(--c-gold);
    border-radius: 2px;
    margin-bottom: 25px;
}

.ot-modal-details {
    font-size: 15px;
    color: var(--c-text-light);
    line-height: 1.6;
    margin: 0;
}

`;
