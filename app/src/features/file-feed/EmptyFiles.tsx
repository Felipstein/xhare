import { FileTextIcon } from 'lucide-react';

export function EmptyFiles() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="size-16 flex items-center justify-center rounded-full bg-zinc-800">
        <FileTextIcon className="size-7 text-zinc-500" />
      </div>

      <p className="mt-4 mb-2 font-medium tracking-tight text-zinc-200">
        Nenhum arquivo compartilhado
      </p>

      <span className="text-sm text-zinc-500 max-w-[280px] leading-relaxed">
        Arraste arquivos para a janela ou para o ícone da bandeja para compartilhar
      </span>
    </div>
  );
}
