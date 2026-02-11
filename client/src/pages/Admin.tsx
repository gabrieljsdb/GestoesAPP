import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Download, Eye, GripVertical } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Checkbox } from "@/components/ui/checkbox";

export default function Admin() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGestao, setEditingGestao] = useState<any>(null);
  const [newPeriod, setNewPeriod] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [newStartActive, setNewStartActive] = useState(false);
  const [editPeriod, setEditPeriod] = useState("");
  const [editStartActive, setEditStartActive] = useState(false);

  const utils = trpc.useUtils();
  const { data: gestoes, isLoading } = trpc.gestoes.list.useQuery();

  const createMutation = trpc.gestoes.create.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      setIsCreateOpen(false);
      setNewPeriod("");
      setNewMembers("");
      setNewStartActive(false);
      toast.success("Gestão criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar gestão: " + error.message);
    },
  });

  const updateMutation = trpc.gestoes.update.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      setIsEditOpen(false);
      setEditingGestao(null);
      toast.success("Gestão atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar gestão: " + error.message);
    },
  });

  const deleteMutation = trpc.gestoes.delete.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      toast.success("Gestão removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover gestão: " + error.message);
    },
  });

  const deleteMemberMutation = trpc.members.delete.useMutation({
    onSuccess: () => {
      utils.gestoes.list.invalidate();
      toast.success("Membro removido com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover membro: " + error.message);
    },
  });

  const handleCreate = () => {
    const members = newMembers
      .split("\n")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    createMutation.mutate({
      period: newPeriod,
      startActive: newStartActive,
      members,
    });
  };

  const handleEdit = () => {
    if (!editingGestao) return;

    updateMutation.mutate({
      id: editingGestao.id,
      period: editPeriod,
      startActive: editStartActive,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta gestão?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDeleteMember = (memberId: number) => {
    if (confirm("Tem certeza que deseja remover este membro?")) {
      deleteMemberMutation.mutate({ id: memberId });
    }
  };

  const handleExport = async () => {
    const data = await utils.client.gestoes.export.query();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gestoes-completo.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exportado com sucesso!");
  };

  const openEditDialog = (gestao: any) => {
    setEditingGestao(gestao);
    setEditPeriod(gestao.period);
    setEditStartActive(gestao.startActive);
    setIsEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestões</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o histórico de gestões da organização
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar JSON
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Gestão
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Criar Nova Gestão</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova gestão ao histórico da organização
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="period">Período</Label>
                    <Input
                      id="period"
                      placeholder="Ex: 2024/2026"
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="members">Membros (um por linha)</Label>
                    <Textarea
                      id="members"
                      placeholder="Presidente: Dr. João Silva&#10;Vice-Presidente: Dra. Maria Souza&#10;Secretário-Geral: Dr. Carlos Lima"
                      value={newMembers}
                      onChange={(e) => setNewMembers(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="startActive"
                      checked={newStartActive}
                      onCheckedChange={setNewStartActive}
                    />
                    <Label htmlFor="startActive">Marcar como gestão ativa</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={!newPeriod || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Gestão"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : !gestoes || gestoes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma gestão cadastrada. Clique em "Nova Gestão" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {gestoes.map((gestao) => (
              <Card key={gestao.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Gestão {gestao.period}
                          {gestao.startActive && (
                            <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-1 rounded">
                              Ativa
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {gestao.members.length} membro(s)
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(gestao)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(gestao.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gestao.members.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-sm">{member.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Editar Gestão</DialogTitle>
              <DialogDescription>
                Atualize as informações da gestão
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-period">Período</Label>
                <Input
                  id="edit-period"
                  placeholder="Ex: 2024/2026"
                  value={editPeriod}
                  onChange={(e) => setEditPeriod(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-startActive"
                  checked={editStartActive}
                  onCheckedChange={setEditStartActive}
                />
                <Label htmlFor="edit-startActive">Marcar como gestão ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleEdit}
                disabled={!editPeriod || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
