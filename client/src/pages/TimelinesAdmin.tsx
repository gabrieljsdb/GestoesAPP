import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ExternalLink, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function TimelinesAdmin() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const utils = trpc.useUtils();
  const { data: timelines, isLoading } = trpc.timelines.list.useQuery();

  const createMutation = trpc.timelines.create.useMutation({
    onSuccess: () => {
      utils.timelines.list.invalidate();
      setIsCreateOpen(false);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
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

  const handleCreate = () => {
    createMutation.mutate({ name: newName, slug: newSlug, description: newDescription });
  };

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
                  <CardDescription>/{timeline.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Link href={`/admin/${timeline.id}`}>
                      <Button className="w-full" variant="outline"><Pencil className="mr-2 h-4 w-4" /> Gerenciar Conteúdo</Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="ghost" onClick={() => window.open(`/timeline/${timeline.slug}`, '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Pública
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm("Deletar timeline?")) deleteMutation.mutate({ id: timeline.id }) }}>
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
    </DashboardLayout>
  );
}
