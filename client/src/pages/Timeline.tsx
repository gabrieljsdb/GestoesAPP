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
  const [activeIndex, setActiveIndex] = useState(0);
  const [nodes, setNodes] = useState<HTMLDivElement[]>([]);

  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    velX: 0,
    momentumID: 0,
  });

  useEffect(() => {
    if (!gestoes || gestoes.length === 0) return;

    const sortedGestoes = [...gestoes].sort((a, b) => b.displayOrder - a.displayOrder);
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
        if (Math.abs(dragState.current.velX) < 2) activateNode(index, sortedGestoes);
      });
      trackRef.current?.appendChild(node);
      newNodes.push(node);
    });
    setNodes(newNodes);
  };

  const activateNode = (index: number, sortedGestoes: any[], firstRun = false) => {
    if (index < 0 || index >= sortedGestoes.length) return;
    setActiveIndex(index);
    nodes.forEach((n) => n.classList.remove("active"));
    if (nodes[index]) nodes[index].classList.add("active");
    centerNode(index);
    renderCard(sortedGestoes[index], firstRun);
  };

  const centerNode = (index: number) => {
    const node = nodes[index];
    const track = trackRef.current;
    if (!node || !track) return;
    const trackCenter = track.clientWidth / 2;
    const nodeCenter = node.offsetLeft + node.clientWidth / 2;
    track.scrollTo({ left: nodeCenter - trackCenter, behavior: "smooth" });
  };

  const renderCard = (data: any, firstRun: boolean) => {
    if (!contentAreaRef.current) return;
    const membersHTML = data.members.map((m: any, i: number) => `
      <div class="ot-member-item" style="animation-delay: ${i * 0.05}s">
        <div class="ot-icon">✓</div>
        <span class="ot-name">${m.name}</span>
      </div>
    `).join("");

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
        setTimeout(() => { if (contentAreaRef.current) contentAreaRef.current.innerHTML = cardHTML; }, 300);
      } else {
        contentAreaRef.current.innerHTML = cardHTML;
      }
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

  const sortedGestoes = [...gestoes].sort((a, b) => b.displayOrder - a.displayOrder);

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
            <div className="ot-track" ref={trackRef} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}></div>
          </div>
          <div className="ot-content-wrapper" ref={contentAreaRef}></div>
          <div className="ot-controls">
            <button className="ot-btn" onClick={() => activateNode(activeIndex - 1, sortedGestoes)} disabled={activeIndex === 0}>Anterior</button>
            <button className="ot-btn" onClick={() => activateNode(activeIndex + 1, sortedGestoes)} disabled={activeIndex === sortedGestoes.length - 1}>Próximo</button>
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
    --c-text-main: #333333;
    --shadow-card: 0 20px 40px -5px rgba(15, 46, 90, 0.15);
    font-family: 'Montserrat', sans-serif;
    width: 100%;
    min-height: 100vh;
    padding: 60px 0;
    overflow-x: hidden;
    background: radial-gradient(circle at top right, #eef2f7 0%, #ffffff 100%);
}
.ot-container {
    max-width: 1400px; /* Aumentado para resoluções altas */
    margin: 0 auto;
    padding: 0 40px;
}
.ot-header { text-align: center; margin-bottom: 50px; }
.ot-header h2 { font-size: clamp(32px, 6vw, 52px); color: var(--c-blue-dark); font-weight: 800; }
.ot-track-wrapper { position: relative; height: 160px; mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%); }
.ot-track { display: flex; align-items: center; height: 100%; padding: 0 50vw; overflow-x: auto; scrollbar-width: none; }
.ot-track::-webkit-scrollbar { display: none; }
.ot-line-background { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #e0e0e0; transform: translateY(-50%); }
.ot-node { position: relative; flex-shrink: 0; width: 160px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; }
.ot-dot { width: 20px; height: 20px; background: #fff; border: 3px solid var(--c-blue-dark); border-radius: 50%; transition: all 0.4s; }
.ot-year { position: absolute; top: 35px; font-size: 16px; font-weight: 700; color: #999; }
.ot-node.active .ot-dot { transform: scale(1.6); background: var(--c-gold); box-shadow: 0 0 0 6px rgba(197, 160, 89, 0.2); }
.ot-node.active .ot-year { top: 20px; font-size: 20px; color: var(--c-blue-dark); opacity: 1; font-weight: 800; }
.ot-content-wrapper { margin-top: 40px; display: flex; justify-content: center; min-height: 450px; }
.ot-card { width: 100%; max-width: 1100px; background: rgba(255, 255, 255, 0.95); border-top: 5px solid var(--c-gold); border-radius: 20px; padding: 50px; box-shadow: var(--shadow-card); }
.ot-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.ot-member-item { background: #fff; padding: 18px 25px; border-radius: 10px; display: flex; align-items: center; border-left: 4px solid #f0f0f0; transition: all 0.3s; }
.ot-member-item:hover { border-left-color: var(--c-gold); transform: translateX(8px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
.ot-controls { display: flex; justify-content: center; gap: 30px; margin-top: 50px; }
.ot-btn { background: #fff; color: var(--c-blue-dark); border: 2px solid var(--c-blue-dark); padding: 12px 30px; border-radius: 40px; cursor: pointer; font-weight: 700; transition: all 0.3s; }
.ot-btn:hover:not(:disabled) { background: var(--c-blue-dark); color: #fff; }
@media (max-width: 1024px) { .ot-container { padding: 0 20px; } .ot-card { padding: 30px; } }
`;
