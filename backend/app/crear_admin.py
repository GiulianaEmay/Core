"""Crea (o restablece) un administrador que entra con correo y clave, sin codigo.

    python -m app.crear_admin correo@dominio.com [--nombre "Nombre"] [--password "clave"]

- El usuario se crea en Clerk con el correo ya verificado.
- Si el correo ya existe en Clerk, se le cambia la clave.
- Para que sea admin, el correo debe estar en ADMIN_EMAILS del backend (en cada
  entorno: local y Render). El rol se asigna en su primer inicio de sesion.
La clave se imprime una sola vez y no se guarda en ningun lado.
"""

import argparse

from app import clerk_admin
from app.config import settings


def crear_o_restablecer(email: str, nombre: str, password: str | None) -> tuple[str, str, bool]:
    """Devuelve (clerk_user_id, password, ya_existia)."""
    password = password or clerk_admin.generar_password()
    try:
        return clerk_admin.crear_usuario_con_email(email, password, nombre), password, False
    except clerk_admin.ClerkError as e:
        existente = clerk_admin.buscar_por_email(email)
        if not existente:
            raise e  # el fallo no era "ya existe"
        clerk_admin.cambiar_password(existente, password)
        return existente, password, True


def main() -> None:
    ap = argparse.ArgumentParser(description="Crea un administrador con correo y clave (sin codigo de verificacion)")
    ap.add_argument("email")
    ap.add_argument("--nombre", default="Administrador CORE")
    ap.add_argument("--password", default=None, help="opcional; si se omite se genera una segura")
    args = ap.parse_args()

    email = args.email.strip().lower()
    try:
        _, password, existia = crear_o_restablecer(email, args.nombre, args.password)
    except clerk_admin.ClerkError as e:
        raise SystemExit(f"No se pudo crear el usuario en Clerk: {e}")

    print(f"\n{'Clave restablecida' if existia else 'Administrador creado'} en Clerk")
    print(f"  Correo: {email}")
    print(f"  Clave:  {password}")
    print("  (copiela ahora: no se vuelve a mostrar)\n")
    if email not in settings.admin_emails_list:
        print(f"AVISO: {email} NO esta en ADMIN_EMAILS de este entorno, asi que entraria como cliente.")
        print("       Agreguelo a ADMIN_EMAILS (separado por comas) y reinicie el backend.\n")


if __name__ == "__main__":
    main()
