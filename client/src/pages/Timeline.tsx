import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Timeline() {
  const { data: gestoes, isLoading } = trpc.gestoes.list.useQuery();
  const trackRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nodes, setNodes] = useState<HTMLDivElement[]>([]);

  // Drag state
  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    velX: 0,
    momentumID: 0,
  });

  useEffect(() => {
    if (!gestoes || gestoes.length === 0) return;

    // Sort gestoes by period
    const sortedGestoes = [...gestoes].sort((a, b) => a.period.localeCompare(b.period));

    // Find initial index
    const initialIndex = sortedGestoes.findIndex((g) => g.startActive);
    const targetIndex = initialIndex >= 0 ? initialIndex : sortedGestoes.length - 1;

    setActiveIndex(targetIndex);
    renderNodes(sortedGestoes);
    setTimeout(() => activateNode(targetIndex, sortedGestoes, true), 100);
  }, [gestoes]);

  const renderNodes = (sortedGestoes: any[]) => {
    if (!trackRef.current) return;

    trackRef.current.innerHTML = "";
    const newNodes: HTMLDivElement[] = [];

    sortedGestoes.forEach((item, index) => {
      const node = document.createElement("div");
      node.className = "ot-node";
      node.innerHTML = `
        <div class="ot-dot"></div>
        <span class="ot-year">${item.period}</span>
        <div class="ot-connector"></div>
      `;

      node.addEventListener("click", () => {
        if (Math.abs(dragState.current.velX) < 2) {
          activateNode(index, sortedGestoes);
        }
      });

      trackRef.current?.appendChild(node);
      newNodes.push(node);
    });

    setNodes(newNodes);
  };

  const activateNode = (index: number, sortedGestoes: any[], firstRun = false) => {
    if (index < 0 || index >= sortedGestoes.length) return;

    setActiveIndex(index);

    // Update visual classes
    nodes.forEach((n) => n.classList.remove("active"));
    if (nodes[index]) {
      nodes[index].classList.add("active");
    }

    // Center node
    centerNode(index);

    // Render card
    renderCard(sortedGestoes[index], firstRun);
  };

  const centerNode = (index: number) => {
    const node = nodes[index];
    const track = trackRef.current;
    if (!node || !track) return;

    const trackCenter = track.clientWidth / 2;
    const nodeCenter = node.offsetLeft + node.clientWidth / 2;

    track.scrollTo({
      left: nodeCenter - trackCenter,
      behavior: "smooth",
    });
  };

  const renderCard = (data: any, firstRun: boolean) => {
    if (!contentAreaRef.current) return;

    const membersHTML = data.members
      .map(
        (m: any, i: number) => `
      <div class="ot-member-item" style="animation-delay: ${i * 0.05}s">
        <div class="ot-icon">✓</div>
        <span class="ot-name">${m.name}</span>
      </div>
    `
      )
      .join("");

    const cardHTML = `
      <div class="ot-card visible">
        <div class="ot-card-header">
          <h3 class="ot-card-title">Gestão ${data.period}</h3>
          <div class="ot-card-subtitle">Diretoria e Conselho</div>
        </div>
        <div class="ot-members-grid">
          ${membersHTML}
        </div>
      </div>
    `;

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

  // Drag handlers
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

  const handlePrev = () => {
    if (!gestoes) return;
    const sortedGestoes = [...gestoes].sort((a, b) => a.period.localeCompare(b.period));
    activateNode(activeIndex - 1, sortedGestoes);
  };

  const handleNext = () => {
    if (!gestoes) return;
    const sortedGestoes = [...gestoes].sort((a, b) => a.period.localeCompare(b.period));
    activateNode(activeIndex + 1, sortedGestoes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <p className="text-lg text-gray-600">Carregando linha do tempo...</p>
      </div>
    );
  }

  if (!gestoes || gestoes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <p className="text-lg text-gray-600">Nenhuma gestão cadastrada.</p>
      </div>
    );
  }

  const sortedGestoes = [...gestoes].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <>
      <style>{timelineStyles}</style>
      <div id="oab-timeline-wrapper">
        <div className="ot-container">
          <div className="ot-header">
            <h2>Linha do Tempo</h2>
            <p>Histórico das Gestões da OAB</p>
          </div>

          <div className="ot-track-wrapper">
            <div className="ot-line-background"></div>
            <div
              className="ot-track"
              ref={trackRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
            ></div>
          </div>

          <div className="ot-content-wrapper" ref={contentAreaRef}></div>

          <div className="ot-controls">
            <button
              className="ot-btn"
              onClick={handlePrev}
              disabled={activeIndex === 0}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Anterior
            </button>
            <button
              className="ot-btn"
              onClick={handleNext}
              disabled={activeIndex === sortedGestoes.length - 1}
            >
              Próximo
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const timelineStyles = `
#oab-timeline-wrapper {
    --c-blue-dark: #0f2e5a;
    --c-blue-light: #2c5ba3;
    --c-gold: #c5a059;
    --c-gold-light: #e6c88a;
    --c-text-main: #333333;
    --c-text-light: #666666;
    --bg-page: #f0f4f8;
    --glass-surface: rgba(255, 255, 255, 0.92);
    --glass-border: rgba(255, 255, 255, 0.6);
    --shadow-card: 0 20px 40px -5px rgba(15, 46, 90, 0.15);
    --shadow-node: 0 4px 10px rgba(0,0,0,0.1);
    --glow-active: 0 0 0 6px rgba(197, 160, 89, 0.2);
    font-family: 'Montserrat', 'Segoe UI', sans-serif;
    color: var(--c-text-main);
    position: relative;
    width: 100%;
    padding: 60px 0;
    overflow: hidden;
    background: radial-gradient(circle at top right, #eef2f7 0%, #ffffff 100%);
    box-sizing: border-box;
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

.ot-track-wrapper {
    position: relative;
    height: 160px;
    margin-bottom: 10px;
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
    scroll-behavior: auto;
    user-select: none;
}

.ot-track::-webkit-scrollbar {
    display: none;
}

.ot-track:active {
    cursor: grabbing;
}

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
    width: 140px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1;
}

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

.ot-year {
    position: absolute;
    top: 35px;
    font-size: 14px;
    font-weight: 700;
    color: var(--c-text-light);
    opacity: 0.6;
    transition: all 0.4s ease;
    font-family: 'Montserrat', sans-serif;
}

.ot-node:hover .ot-dot {
    transform: scale(1.3);
    border-color: var(--c-gold);
}

.ot-node:hover .ot-year {
    color: var(--c-blue-dark);
    opacity: 1;
}

.ot-node.active .ot-dot {
    transform: scale(1.6);
    background: var(--c-gold);
    border-color: var(--c-blue-dark);
    box-shadow: var(--glow-active);
}

.ot-node.active .ot-year {
    top: 20px;
    font-size: 18px;
    color: var(--c-blue-dark);
    opacity: 1;
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

.ot-node.active .ot-connector {
    height: 120px;
    opacity: 1;
}

.ot-content-wrapper {
    position: relative;
    margin-top: 20px;
    display: flex;
    justify-content: center;
    perspective: 1000px;
    min-height: 400px;
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
    display: none;
}

.ot-card.visible {
    display: block;
    opacity: 1;
    transform: translateY(0) scale(1);
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

.ot-members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
}

.ot-member-item {
    background: #fff;
    padding: 15px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    border-left: 3px solid #eee;
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateX(-10px);
    animation: slideInRight 0.4s forwards;
    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.ot-member-item:hover {
    border-left-color: var(--c-gold);
    transform: translateX(5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

.ot-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(11, 43, 91, 0.1);
    color: var(--c-blue-dark);
    border-radius: 50%;
    margin-right: 15px;
    font-size: 12px;
}

.ot-name {
    font-family: 'Open Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #444;
}

.ot-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 40px;
}

.ot-btn {
    background: #fff;
    color: var(--c-blue-dark);
    border: 1px solid var(--c-blue-dark);
    padding: 10px 24px;
    border-radius: 30px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.ot-btn:hover:not(:disabled) {
    background: var(--c-blue-dark);
    color: #fff;
    box-shadow: 0 5px 15px rgba(11, 43, 91, 0.2);
}

.ot-btn:disabled {
    opacity: 0.3;
    border-color: #ccc;
    color: #999;
    cursor: not-allowed;
}

@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
    to { opacity: 1; transform: translateX(0); }
}

@media (max-width: 768px) {
    .ot-header h2 { font-size: 24px; }
    .ot-node { width: 100px; }
    .ot-card { padding: 25px 20px; }
    .ot-members-grid { grid-template-columns: 1fr; }
    .ot-track-wrapper {
        -webkit-mask-image: none;
        mask-image: none;
    }
}
`;
