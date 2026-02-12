import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Download, GripVertical, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableGestaoCardProps {
  gestao: any;
  onEdit: (gestao: any) => void;
  onDelete: (id: number) => void;
  onDeleteMember: (memberId: number) => void;
}

function SortableGestaoCard({ gestao, onEdit, onDelete, onDeleteMember }: SortableGestaoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: gestao.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
                <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Gestão {gestao.period}
                  {gestao.startActive && <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-1 rounded">Ativa</span>}
                </CardTitle>
                <CardDescription>{gestao.members.length} membro(s)</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(gestao)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(gestao.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gestao.members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{member.name}</span>
                <Button variant="ghost" size="sm" onClick={() => onDeleteMember(member.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const [, params] = useRoute("/admin/:timelineId");
  const timelineId = params?.timelineId ? parseInt(params.timelineId) : null;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [newStartActive, setNewStartActive] = useState(false);

  const utils = trpc.useUtils();
  const { data: gestoes, isLoading } = trpc.gestoes.list.useQuery({ timelineId: timelineId! }, { enabled: !!timelineId });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const createMutation = trpc.gestoes.create.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      setIsCreateOpen(false);
      setNewPeriod("");
      setNewMembers("");
      setNewStartActive(false);
      toast.success("Gestão criada!");
    },
  });

  const deleteMutation = trpc.gestoes.delete.useMutation({ onSuccess: () => { utils.gestoes.list.invalidate(); toast.success("Removido!"); } });
  const deleteMemberMutation = trpc.members.delete.useMutation({ onSuccess: () => { utils.gestoes.list.invalidate(); toast.success("Membro removido!"); } });

  const handleCreate = () => {
    if (!timelineId) return;
    const members = newMembers.split("\n").map(m => m.trim()).filter(m => m.length > 0);
    createMutation.mutate({ timelineId, period: newPeriod, startActive: newStartActive, members });
  };

  /* Existing code kept until return statement */
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGestao, setEditingGestao] = useState<any>(null);
  const [editPeriod, setEditPeriod] = useState("");
  const [editStartActive, setEditStartActive] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const updateGestaoMutation = trpc.gestoes.update.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      toast.success("Gestão atualizada!");
    }
  });

  const createMemberMutation = trpc.members.create.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      setNewMemberName("");
      toast.success("Membro adicionado!");
    }
  });

  const handleEdit = (gestao: any) => {
    setEditingGestao(gestao);
    setEditPeriod(gestao.period);
    setEditStartActive(gestao.startActive);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingGestao) return;
    updateGestaoMutation.mutate({
      id: editingGestao.id,
      period: editPeriod,
      startActive: editStartActive
    });
    setIsEditOpen(false);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGestao || !newMemberName.trim()) return;
    createMemberMutation.mutate({
      gestaoId: editingGestao.id,
      name: newMemberName.trim(),
      displayOrder: editingGestao.members.length
    });
  };

  const handleExport = async () => {
    if (!timelineId) return;
    const data = await utils.client.timelines.export.query({ timelineId });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeline-${timelineId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exportado!");
  };

  if (!timelineId) return <DashboardLayout><div className="text-center py-20"><p>Selecione uma timeline no menu.</p><Link href="/admin/timelines"><Button className="mt-4">Ir para Timelines</Button></Link></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/timelines"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gerenciar Gestões</h1>
              <p className="text-muted-foreground mt-1">Configure o histórico desta linha do tempo.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Exportar</Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova Gestão</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Nova Gestão</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Período</Label><Input value={newPeriod} onChange={e => setNewPeriod(e.target.value)} placeholder="Ex: 2024/2026" /></div>
                  <div className="space-y-2"><Label>Membros (um por linha)</Label><Textarea value={newMembers} onChange={e => setNewMembers(e.target.value)} placeholder="Presidente: Nome..." /></div>
                  <div className="flex items-center space-x-2"><Switch checked={newStartActive} onCheckedChange={setNewStartActive} /><Label>Gestão Ativa</Label></div>
                </div>
                <DialogFooter><Button onClick={handleCreate} disabled={createMutation.isPending}>Criar</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Editar Gestão</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Período</Label><Input value={editPeriod} onChange={e => setEditPeriod(e.target.value)} /></div>
                    <div className="flex items-center space-x-2 pt-8"><Switch checked={editStartActive} onCheckedChange={setEditStartActive} /><Label>Gestão Ativa</Label></div>
                  </div>

                  <div className="space-y-4">
                    <Label>Membros</Label>
                    <form onSubmit={handleAddMember} className="flex gap-2">
                      <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Novo membro (ex: Tesoureiro: Fulano)" />
                      <Button type="submit" disabled={createMemberMutation.isPending}><Plus className="h-4 w-4" /></Button>
                    </form>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                      {gestoes?.find(g => g.id === editingGestao?.id)?.members.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted">
                          <span>{member.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteMemberMutation.mutate({ id: member.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleSaveEdit} disabled={updateGestaoMutation.isPending}>Salvar Alterações</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? <p>Carregando...</p> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}>
            <SortableContext items={gestoes?.map(g => g.id) || []} strategy={verticalListSortingStrategy}>
              <div className="grid gap-4">
                {gestoes?.map(gestao => (
                  <SortableGestaoCard key={gestao.id} gestao={gestao} onEdit={handleEdit} onDelete={id => confirm("Deletar?") && deleteMutation.mutate({ id })} onDeleteMember={id => confirm("Deletar membro?") && deleteMemberMutation.mutate({ id })} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </DashboardLayout>
  );
}
