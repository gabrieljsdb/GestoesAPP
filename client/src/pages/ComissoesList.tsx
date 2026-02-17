import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComissoesList() {
    const { data: comissoes, isLoading } = trpc.timelines.getPublicComissoes.useQuery();

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Header Section */}
                <div className="mb-12">
                    <h1 className="text-4xl font-normal text-[#1a1a1a] mb-2">Comissões</h1>
                    <div className="h-1 w-12 bg-gray-400 mb-8"></div>

                    <h2 className="text-lg font-medium text-gray-500 uppercase tracking-wide">Permanentes</h2>
                </div>

                {/* List Section */}
                <div className="border-t border-gray-100">
                    {isLoading ? (
                        <div className="space-y-4 py-8">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {comissoes?.length === 0 ? (
                                <p className="py-8 text-gray-500 italic">Nenhuma comissão encontrada.</p>
                            ) : (
                                comissoes?.map((comissao) => (
                                    <Link
                                        key={comissao.id}
                                        href={`/comissoes/${comissao.slug}`}
                                        className="block py-4 text-[#c0392b] hover:text-[#e74c3c] transition-colors text-lg"
                                    >
                                        {comissao.name}
                                    </Link>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
