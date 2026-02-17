import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ExternalLink, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { BASE_PATH } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TimelinesAdmin() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"gestao" | "comissao">("gestao");
  const [transferTarget, setTransferTarget] = useState<{ timelineId: number; timelineName: string } | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: timelines, isLoading } = trpc.timelines.list.useQuery();
  const { data: adminsForTransfer } = trpc.timelines.listAdminsForTransfer.useQuery(undefined, {
    enabled: !!transferTarget,
  });

  const createMutation = trpc.timelines.create.useMutation({
    onSuccess: () => {
      utils.timelines.list.invalidate();
      setIsCreateOpen(false);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewType("gestao");
      toast.success("Timeline criada com sucesso!");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const deleteMutation = trpc.timelines.delete.useMutation({
    onSuccess: () => {
      utils.timelines.list.invalidate();
      toast.success("Timeline removida!");
    },
  });

  const transferMutation = trpc.timelines.transferOwnership.useMutation({
    onSuccess: () => {
      utils.timelines.list.invalidate();
      setTransferTarget(null);
      setSelectedOwnerId("");
      toast.success("Timeline transferida com sucesso!");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const handleCreate = () => {
    createMutation.mutate({ name: newName, slug: newSlug, description: newDescription, type: newType });
  };

  const handleTransfer = () => {
    if (!transferTarget || !selectedOwnerId) return;
    transferMutation.mutate({
      timelineId: transferTarget.timelineId,
      newOwnerId: parseInt(selectedOwnerId),
    });
  };

  // Filter out current user from transfer list
  const transferableAdmins = adminsForTransfer?.filter(a => a.id !== user?.id) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suas Timelines</h1>
            <p className="text-muted-foreground mt-1">Gerencie múltiplas linhas do tempo e suas permissões.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Timeline</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Timeline</DialogTitle>
                <DialogDescription>Defina o nome e o identificador (slug) da nova timeline.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Gestão OAB 2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input id="slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="ex-gestao-oab" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Input id="desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Timeline</Label>
                  <Select value={newType} onValueChange={(v: "gestao" | "comissao") => setNewType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestao">Gestão (Conselhos)</SelectItem>
                      <SelectItem value="comissao">Comissão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p>Carregando timelines...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timelines?.map((timeline) => (
              <Card key={timeline.id}>
                <CardHeader>
                  <CardTitle>{timeline.name}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2">
                      <span>/{timeline.slug}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(timeline as any).type === 'comissao' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {(timeline as any).type === 'comissao' ? 'Comissão' : 'Gestão'}
                      </span>
                    </div>
                    {/* @ts-ignore */}
                    <div className="text-xs text-muted-foreground mt-1">Criado por: {timeline.authorName || "Desconhecido"}</div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Link href={`/admin/${timeline.id}`}>
                      <Button className="w-full" variant="outline"><Pencil className="mr-2 h-4 w-4" /> Gerenciar Conteúdo</Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="ghost" onClick={() => window.open(`${BASE_PATH}/timeline/${timeline.slug}`, '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Pública
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Transferir para outro admin"
                        onClick={() => setTransferTarget({ timelineId: timeline.id, timelineName: timeline.name })}
                      >
                        <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Deletar timeline?")) deleteMutation.mutate({ id: timeline.id }) }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Ownership Dialog */}
      <Dialog open={!!transferTarget} onOpenChange={(open) => { if (!open) { setTransferTarget(null); setSelectedOwnerId(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Timeline</DialogTitle>
            <DialogDescription>
              Transferir a timeline <strong>"{transferTarget?.timelineName}"</strong> para outro administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecionar Administrador</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um administrador..." />
                </SelectTrigger>
                <SelectContent>
                  {transferableAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id.toString()}>
                      {admin.fullName || admin.username} (@{admin.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transferableAdmins.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum outro administrador disponível para transferência.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferTarget(null); setSelectedOwnerId(""); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedOwnerId || transferMutation.isPending}
            >
              {transferMutation.isPending ? "Transferindo..." : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
