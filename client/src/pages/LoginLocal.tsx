import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function LoginLocal() {
  const [location, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
  });

  // Check if admins exist
  const { data: adminCheck } = trpc.localAuth.hasAdmins.useQuery();

  // Mutations
  const loginMutation = trpc.localAuth.login.useMutation();
  const createFirstAdminMutation = trpc.localAuth.createFirstAdmin.useMutation();

  useEffect(() => {
    if (adminCheck && !adminCheck.hasAdmins) {
      setShowSetup(true);
    }
  }, [adminCheck]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({
        username,
        password,
      });

      if (result.success) {
        toast.success("Login realizado com sucesso!");
        setLocation("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (setupData.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    try {
      const result = await createFirstAdminMutation.mutateAsync({
        username: setupData.username,
        password: setupData.password,
        email: setupData.email || undefined,
        fullName: setupData.fullName || undefined,
      });

      if (result.success) {
        toast.success("Administrador criado com sucesso!");
        setShowSetup(false);
        setUsername(setupData.username);
        setPassword(setupData.password);
        // Auto-login after creating first admin
        setTimeout(() => {
          const event = new Event('submit') as any;
          handleLogin(event);
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao criar administrador");
      toast.error("Erro ao criar administrador");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showSetup && adminCheck && !adminCheck.hasAdmins ? (
          // Setup form - create first admin
          <Card className="shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mx-auto">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-center">Criar Administrador</CardTitle>
              <CardDescription className="text-center">
                Configure o primeiro administrador do painel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFirstAdmin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="setup-username">Usuário</Label>
                  <Input
                    id="setup-username"
                    type="text"
                    placeholder="Digite o nome de usuário"
                    value={setupData.username}
                    onChange={(e) =>
                      setSetupData({ ...setupData, username: e.target.value })
                    }
                    required
                    minLength={3}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-password">Senha</Label>
                  <Input
                    id="setup-password"
                    type="password"
                    placeholder="Digite uma senha segura"
                    value={setupData.password}
                    onChange={(e) =>
                      setSetupData({ ...setupData, password: e.target.value })
                    }
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-email">Email (opcional)</Label>
                  <Input
                    id="setup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={setupData.email}
                    onChange={(e) =>
                      setSetupData({ ...setupData, email: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-fullname">Nome Completo (opcional)</Label>
                  <Input
                    id="setup-fullname"
                    type="text"
                    placeholder="Seu nome completo"
                    value={setupData.fullName}
                    onChange={(e) =>
                      setSetupData({ ...setupData, fullName: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !setupData.username || !setupData.password}
                >
                  {isLoading ? "Criando..." : "Criar Administrador"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          // Login form
          <Card className="shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mx-auto">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-center">Login Administrativo</CardTitle>
              <CardDescription className="text-center">
                Acesse o painel administrativo da timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !username || !password}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>Painel Administrativo - Linha do Tempo OAB</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
