"""Crea el acceso (usuario + clave) de un cliente, igual que el boton del panel.

    python -m app.crear_acceso CLIENTE usuario [--nombre "Gerencia General"] [--password "clave"]

El usuario queda en Clerk con su cliente en public_metadata, asi que sirve en
cualquier base que use la misma instancia de Clerk (local y produccion).
La clave se imprime una sola vez y no se guarda en ningun lado.
"""

import argparse

from app import clerk_admin
from app import models as m
from app.database import SessionLocal


def main() -> None:
    ap = argparse.ArgumentParser(description="Crea el acceso de un cliente")
    ap.add_argument("cliente_id")
    ap.add_argument("usuario")
    ap.add_argument("--nombre", default="Gerencia General")
    ap.add_argument("--password", default=None)
    args = ap.parse_args()

    usuario = args.usuario.strip().lower()
    if not clerk_admin.USERNAME_RE.match(usuario):
        raise SystemExit("Usuario invalido: 4-40 caracteres, solo minusculas, numeros, - o _")
    password = args.password or clerk_admin.generar_password()

    with SessionLocal() as db:
        if not db.get(m.Cliente, args.cliente_id):
            raise SystemExit(f"No existe el cliente {args.cliente_id} en esta base")
        try:
            clerk_id, email = clerk_admin.crear_usuario(usuario, password, args.nombre, args.cliente_id)
        except clerk_admin.ClerkError as e:
            raise SystemExit(f"Clerk rechazo el usuario: {e}")
        db.add(m.Usuario(clerk_user_id=clerk_id, email=email, username=usuario, nombre=args.nombre,
                         rol=m.Rol.cliente, cliente_id=args.cliente_id))
        db.commit()

    print(f"\nAcceso creado para {args.cliente_id}")
    print(f"  Usuario: {usuario}")
    print(f"  Clave:   {password}")
    print("  (copiela ahora: no se vuelve a mostrar)\n")


if __name__ == "__main__":
    main()
