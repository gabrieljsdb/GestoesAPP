import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Plus,
    Pencil,
    Trash2,
    UserCheck,
    UserX,
    Shield,
    ShieldCheck,
    AlertCircle,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

type AdminFormData = {
    username: string;
    password: string;
    email: string;
    fullName: string;
    role: "admin" | "superadmin";
};

type EditFormData = {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: "admin" | "superadmin";
};

const emptyForm: AdminFormData = {
    username: "",
    password: "",
    email: "",
    fullName: "",
    role: "admin",
};

export default function UsersAdmin() {
    const { isSuperAdmin, user } = useAuth();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null);
    const [createForm, setCreateForm] = useState<AdminFormData>({ ...emptyForm });
    const [editForm, setEditForm] = useState<EditFormData | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);

    const utils = trpc.useUtils();

    const { data: admins, isLoading } = trpc.localAuth.listAdmins.useQuery(undefined, {
        enabled: isSuperAdmin,
    });

    const createMutation = trpc.localAuth.createAdmin.useMutation({
        onSuccess: () => {
            utils.localAuth.listAdmins.invalidate();
            setIsCreateOpen(false);
            setCreateForm({ ...emptyForm });
            setCreateError(null);
            toast.success("Administrador criado com sucesso!");
        },
        onError: (error) => {
            setCreateError(error.message);
            toast.error("Erro ao criar administrador");
        },
    });

    const updateMutation = trpc.localAuth.updateAdmin.useMutation({
        onSuccess: () => {
            utils.localAuth.listAdmins.invalidate();
            setIsEditOpen(false);
            setEditForm(null);
            setEditError(null);
            toast.success("Administrador atualizado com sucesso!");
        },
        onError: (error) => {
            setEditError(error.message);
            toast.error("Erro ao atualizar administrador");
        },
    });

    const toggleActiveMutation = trpc.localAuth.toggleActive.useMutation({
        onSuccess: () => {
            utils.localAuth.listAdmins.invalidate();
            toast.success("Status atualizado!");
        },
        onError: (error) => toast.error(error.message),
    });

    const deleteMutation = trpc.localAuth.deleteAdmin.useMutation({
        onSuccess: () => {
            utils.localAuth.listAdmins.invalidate();
            setDeleteTarget(null);
            toast.success("Administrador removido!");
        },
        onError: (error) => toast.error(error.message),
    });

    const handleCreate = () => {
        if (createForm.password.length < 6) {
            setCreateError("Senha deve ter pelo menos 6 caracteres");
            return;
        }
        createMutation.mutate({
            username: createForm.username,
            password: createForm.password,
            email: createForm.email || undefined,
            fullName: createForm.fullName || undefined,
            role: createForm.role,
        });
    };

    const handleEdit = () => {
        if (!editForm) return;
        updateMutation.mutate({
            id: editForm.id,
            username: editForm.username || undefined,
            email: editForm.email || undefined,
            fullName: editForm.fullName || undefined,
            role: editForm.role,
        });
    };

    const openEditDialog = (admin: any) => {
        setEditForm({
            id: admin.id,
            username: admin.username,
            email: admin.email || "",
            fullName: admin.fullName || "",
            role: admin.role,
        });
        setEditError(null);
        setIsEditOpen(true);
    };

    if (!isSuperAdmin) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Card className="max-w-md w-full">
                        <CardContent className="pt-6 text-center">
                            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                            <p className="text-muted-foreground">
                                Apenas super administradores podem acessar o gerenciamento de usuários.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
                        <p className="text-muted-foreground mt-1">
                            Crie e gerencie administradores do sistema.
                        </p>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setCreateError(null); setCreateForm({ ...emptyForm }); } }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Novo Administrador
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Criar Novo Administrador</DialogTitle>
                                <DialogDescription>
                                    Preencha os dados para criar um novo usuário administrativo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {createError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{createError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="create-username">Usuário *</Label>
                                    <Input
                                        id="create-username"
                                        placeholder="Nome de usuário"
                                        value={createForm.username}
                                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                        minLength={3}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="create-password">Senha *</Label>
                                    <Input
                                        id="create-password"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        minLength={6}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="create-email">Email</Label>
                                    <Input
                                        id="create-email"
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="create-fullname">Nome Completo</Label>
                                    <Input
                                        id="create-fullname"
                                        placeholder="Nome completo do administrador"
                                        value={createForm.fullName}
                                        onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="create-role">Nível de Acesso</Label>
                                    <Select
                                        value={createForm.role}
                                        onValueChange={(value: "admin" | "superadmin") => setCreateForm({ ...createForm, role: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4" />
                                                    Admin
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="superadmin">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Super Admin
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {createForm.role === "superadmin"
                                            ? "Super Admins podem gerenciar outros usuários e ver todas as timelines."
                                            : "Admins podem criar e gerenciar apenas suas próprias timelines."}
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending || !createForm.username || !createForm.password}
                                >
                                    {createMutation.isPending ? "Criando..." : "Criar"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Admin List */}
                {isLoading ? (
                    <p className="text-muted-foreground">Carregando administradores...</p>
                ) : !admins || admins.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhum administrador encontrado.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {admins.map((admin) => {
                            const isCurrentUser = admin.id === user?.id;
                            return (
                                <Card key={admin.id} className={!admin.isActive ? "opacity-60" : ""}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    {admin.role === "superadmin" ? (
                                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                                    ) : (
                                                        <Shield className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        {admin.fullName || admin.username}
                                                        {isCurrentUser && (
                                                            <Badge variant="outline" className="text-xs font-normal">Você</Badge>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="text-sm">
                                                        @{admin.username}
                                                        {admin.email ? ` · ${admin.email}` : ""}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={admin.role === "superadmin" ? "default" : "secondary"}
                                                    className={admin.role === "superadmin" ? "bg-violet-600 hover:bg-violet-700" : ""}
                                                >
                                                    {admin.role === "superadmin" ? "Super Admin" : "Admin"}
                                                </Badge>
                                                <Badge variant={admin.isActive ? "outline" : "destructive"}>
                                                    {admin.isActive ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-muted-foreground">
                                                {admin.lastLogin
                                                    ? `Último login: ${new Date(admin.lastLogin).toLocaleDateString("pt-BR")} às ${new Date(admin.lastLogin).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                                                    : "Nunca fez login"}
                                                {" · "}
                                                Criado em {new Date(admin.createdAt).toLocaleDateString("pt-BR")}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(admin)}
                                                >
                                                    <Pencil className="h-4 w-4 mr-1" /> Editar
                                                </Button>
                                                {!isCurrentUser && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                toggleActiveMutation.mutate({
                                                                    id: admin.id,
                                                                    isActive: !admin.isActive,
                                                                })
                                                            }
                                                            disabled={toggleActiveMutation.isPending}
                                                        >
                                                            {admin.isActive ? (
                                                                <>
                                                                    <UserX className="h-4 w-4 mr-1" /> Desativar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="h-4 w-4 mr-1" /> Ativar
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteTarget({ id: admin.id, username: admin.username })}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" /> Deletar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditError(null); setEditForm(null); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Administrador</DialogTitle>
                        <DialogDescription>
                            Atualize os dados do administrador.
                        </DialogDescription>
                    </DialogHeader>
                    {editForm && (
                        <div className="space-y-4 py-4">
                            {editError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{editError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="edit-username">Usuário</Label>
                                <Input
                                    id="edit-username"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-fullname">Nome Completo</Label>
                                <Input
                                    id="edit-fullname"
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Nível de Acesso</Label>
                                <Select
                                    value={editForm.role}
                                    onValueChange={(value: "admin" | "superadmin") => setEditForm({ ...editForm, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4" />
                                                Admin
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="superadmin">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" />
                                                Super Admin
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleEdit}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja deletar o administrador <strong>@{deleteTarget?.username}</strong>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Deletando..." : "Deletar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
