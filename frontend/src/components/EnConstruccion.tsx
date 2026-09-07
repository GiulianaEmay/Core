export function EnConstruccion({ modulo }: { modulo: string }) {
  return (
    <div className="rounded-xl border border-[#232D45] bg-[#141B2E] p-14 text-center text-[#5E6A8A]">
      <div className="text-sm font-medium text-[#9AA7C7]">{modulo}</div>
      <p className="text-sm mt-2">
        Módulo en construcción — la estructura ya está lista, falta conectar los datos.
      </p>
    </div>
  );
}
