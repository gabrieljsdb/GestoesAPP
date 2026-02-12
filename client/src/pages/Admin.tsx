import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Download, GripVertical, ArrowLeft, Upload } from "lucide-react";
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const importMutation = trpc.timelines.import.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      toast.success("Importação concluída com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro na importação: " + err.message);
    }
  });

  const handleImportClick = () => {
    document.getElementById('import-json-input')?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !timelineId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        if (!json.gestoes || !Array.isArray(json.gestoes)) {
          throw new Error("Formato de arquivo inválido. Esperado objeto com array 'gestoes'.");
        }

        if (confirm(`Deseja importar ${json.gestoes.length} gestões para esta timeline?`)) {
          await importMutation.mutateAsync({
            timelineId,
            data: json
          });
        }
      } catch (err: any) {
        toast.error("Erro ao ler arquivo: " + err.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

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

  const reorderMutation = trpc.gestoes.reorder.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("DragEnd:", { active, over });

    if (!over || active.id === over.id || !gestoes) {
      console.log("Drag cancelled or invalid drop");
      return;
    }

    const oldIndex = gestoes.findIndex((g) => g.id === active.id);
    const newIndex = gestoes.findIndex((g) => g.id === over.id);

    console.log("Indices:", { oldIndex, newIndex });

    if (oldIndex === -1 || newIndex === -1) return;

    const newGestoes = arrayMove(gestoes, oldIndex, newIndex);

    // Optimistic update
    console.log("Optimistic update with:", newGestoes);
    utils.gestoes.list.setData({ timelineId: timelineId! }, newGestoes);

    reorderMutation.mutate({
      timelineId: timelineId!,
      items: newGestoes.map((g, index) => ({ id: g.id, displayOrder: index })),
    }, {
      onSuccess: () => {
        console.log("Reorder success");
        toast.success("Ordem atualizada com sucesso!");
      },
      onError: (err) => {
        console.error("Reorder failed:", err);
        toast.error("Erro ao reordenar: " + err.message);
        utils.gestoes.list.invalidate(); // Revert on error
      }
    });
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGestao, setEditingGestao] = useState<any>(null);
  const [editPeriod, setEditPeriod] = useState("");
  const [editStartActive, setEditStartActive] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  // State for adding new members with roles
  const [role, setRole] = useState("conselheiro_titular");
  const [isAddingMember, setIsAddingMember] = useState(false);

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
    // console.log("Opening edit for:", gestao);
    setEditingGestao(gestao);
    setEditPeriod(gestao.period || "");
    setEditStartActive(!!gestao.startActive);
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
      displayOrder: editingGestao.members.length,
      role: role
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

  const ROLES = [
    { value: "presidente", label: "Presidente" },
    { value: "vice_presidente", label: "Vice-Presidente" },
    { value: "secretario_geral", label: "Secretário Geral" },
    { value: "secretario_adjunto", label: "Secretário Geral Adjunto" },
    { value: "tesoureiro", label: "Tesoureiro" },
    { value: "conselheiro_titular", label: "Conselheiro Titular" },
    { value: "conselheiro_suplente", label: "Conselheiro Suplente" },
  ];

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
            <input
              type="file"
              id="import-json-input"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={handleImportClick} disabled={importMutation.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {importMutation.isPending ? "Importando..." : "Importar JSON"}
            </Button>
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Gestão</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Período</Label><Input value={editPeriod} onChange={e => setEditPeriod(e.target.value)} /></div>
                    <div className="flex items-center space-x-2 pt-8"><Switch checked={editStartActive} onCheckedChange={setEditStartActive} /><Label>Gestão Ativa</Label></div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold">Adicionar Membro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <Label>Cargo</Label>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Nome</Label>
                        <div className="flex gap-2">
                          <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Nome do membro" />
                          <Button onClick={handleAddMember} disabled={createMemberMutation.isPending}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <Label>Membros Cadastrados</Label>
                    <div className="space-y-4">
                      {ROLES.map(roleGroup => {
                        const membersInRole = gestoes?.find(g => g.id === editingGestao?.id)?.members
                          .filter((m: any) => m.role === roleGroup.value || (!m.role && roleGroup.value === 'conselheiro_titular')); // Default to conselheiro if no role? Or maybe just show separately.

                        // If no role logic: legacy members might not have role. Let's group them in "Sem Cargo" or Conselheiro. 
                        // Better: show members with role in their group, and members without role in a specific group.
                        // But for now simplest strict filter.
                        const hasMembers = membersInRole && membersInRole.length > 0;

                        if (!hasMembers) return null;

                        return (
                          <div key={roleGroup.value} className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground capitalize">{roleGroup.label}</h4>
                            {membersInRole.map((member: any) => (
                              <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted">
                                <span>{member.name}</span>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => deleteMemberMutation.mutate({ id: member.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}

                      {/* Members without role */}
                      {(() => {
                        const noRoleMembers = gestoes?.find(g => g.id === editingGestao?.id)?.members.filter((m: any) => !m.role);
                        if (!noRoleMembers || noRoleMembers.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Sem Cargo Definido</h4>
                            {noRoleMembers.map((member: any) => (
                              <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted">
                                <span>{member.name}</span>
                                <Button variant="ghost" size="sm" onClick={() => deleteMemberMutation.mutate({ id: member.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleSaveEdit} disabled={updateGestaoMutation.isPending}>Salvar Alterações</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? <p>Carregando...</p> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
