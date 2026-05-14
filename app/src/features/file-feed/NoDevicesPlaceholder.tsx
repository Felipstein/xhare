export function NoDevicesPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <p className="mb-2 font-medium tracking-tight text-zinc-300">
        Aguardando dispositivos
      </p>
      <span className="text-sm text-zinc-500 max-w-[300px] leading-relaxed">
        Conecte dispositivos na mesma rede local para começar a compartilhar arquivos
      </span>
    </div>
  );
}
