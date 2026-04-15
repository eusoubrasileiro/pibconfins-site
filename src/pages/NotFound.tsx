import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">O endereço acessado não existe.</p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar para o início</Link>
      </Button>
    </div>
  );
}
