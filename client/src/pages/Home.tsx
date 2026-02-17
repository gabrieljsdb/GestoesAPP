import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, Shield, Eye } from "lucide-react";
import { Link } from "wouter";

export default function Home() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Painel Administrativo
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Linha do Tempo OAB
            </p>
            <p className="text-gray-500">
              Gerencie o histórico de gestões da organização
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Timeline Pública</CardTitle>
                </div>
                <CardDescription>
                  Visualize a linha do tempo das gestões da organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Link href="/timeline">
                    <Button className="w-full" variant="outline">
                      Ver Gestão Externa
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/comissoes">
                    <Button className="w-full" variant="secondary">
                      Ver Comissões
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Painel Administrativo</CardTitle>
                </div>
                <CardDescription>
                  Gerencie gestões, membros e configurações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login-local">
                  <Button className="w-full">
                    Acessar Painel
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Funcionalidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">Gerenciamento Completo</p>
                    <p className="text-sm text-muted-foreground">
                      Adicione, edite e remova gestões e membros
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">Gestão Ativa</p>
                    <p className="text-sm text-muted-foreground">
                      Marque qual gestão aparece primeiro na timeline
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">Exportação JSON</p>
                    <p className="text-sm text-muted-foreground">
                      Exporte os dados em formato compatível
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">Timeline Integrada</p>
                    <p className="text-sm text-muted-foreground">
                      Visualização pública consumindo dados do banco
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>
    </div>
  );
}
