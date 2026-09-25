from app.portal_data import cliente_payload

COLECCIONES = ["actividades", "fases", "solicitudes", "checklist", "fugas", "kpis"]


def _contiene(original: dict, resultado: dict, ctx: str):
    """Todo lo que traia el HTML debe volver igual (el payload puede agregar campos)."""
    for k, v in original.items():
        if k == "id" and "uid" in original:  # codigo de actividad: el HTML mezcla 3.2 y "0.1"
            v = str(v)
        assert resultado.get(k) == v, f"{ctx}: '{k}' esperado {v!r}, obtuvo {resultado.get(k)!r}"


def test_importar_y_volver_a_armar_no_pierde_nada(seeded, data):
    for cid, original in data["clientes"].items():
        p = cliente_payload(seeded, cid)
        for campo in ["grupo", "plan", "lider", "areas", "fuenteDatos", "empresas", "diagnostico", "servicios"]:
            assert p[campo] == original[campo], f"{cid}.{campo}"
        assert p["diagRuc"] == original.get("diagRuc", {})
        assert p["analytics"] == original["analytics"]
        for col in COLECCIONES:
            assert len(p[col]) == len(original[col]), f"{cid}.{col}: cantidad"
            for i, (o, r) in enumerate(zip(original[col], p[col])):
                _contiene(o, r, f"{cid}.{col}[{i}]")


def test_importar_dos_veces_no_duplica(seeded, data):
    from app.portal_data import importar

    antes = len(cliente_payload(seeded, "POL")["actividades"])
    importar(seeded, data)
    assert len(cliente_payload(seeded, "POL")["actividades"]) == antes


def test_cliente_solo_ve_lo_suyo(api):
    assert api("u_pol").get("/portal/clientes/POL").status_code == 200
    assert api("u_pol").get("/portal/clientes/RAP").status_code == 403
    assert api("u_nada").get("/portal/clientes/POL").status_code == 403
    assert api("u_admin").get("/portal/clientes/RAP").status_code == 200
    assert api("u_admin").get("/portal/clientes/NOPE").status_code == 404


def test_me_lista_solo_clientes_accesibles(api):
    assert [c["id"] for c in api("u_pol").get("/portal/me").json()["clientes"]] == ["POL"]
    assert [c["id"] for c in api("u_admin").get("/portal/me").json()["clientes"]] == ["POL", "RAP"]
    assert api("u_nada").get("/portal/me").json()["clientes"] == []


def test_cliente_no_entra_al_admin(api):
    assert api("u_pol").get("/admin/clientes").status_code == 403
    assert api("u_pol").post("/admin/importar", json={"clientes": {}}).status_code == 403
    assert api("u_admin").get("/admin/clientes").status_code == 200


def test_flujo_de_aprobacion(api):
    c = api("u_pol")
    p = c.get("/portal/clientes/POL").json()
    pendiente = next(a for a in p["actividades"] if a["est"] == "Por aprobar")
    clave = f"A:{pendiente['uid']}"

    assert c.post("/portal/clientes/POL/decisiones", json={"clave": "A:NOEXISTE", "decision": "Aprobado"}).status_code == 404
    assert c.post("/portal/clientes/POL/decisiones", json={"clave": clave, "decision": "Observado", "comentario": ""}).status_code == 422
    assert c.post("/portal/clientes/POL/decisiones", json={"clave": clave, "decision": "Aprobado"}).status_code == 200
    assert c.post("/portal/clientes/POL/decisiones", json={"clave": clave, "decision": "Aprobado"}).status_code == 409

    decisiones = c.get("/portal/clientes/POL").json()["decisiones"]
    assert decisiones[0]["clave"] == clave and decisiones[0]["dec"] == "Aprobado"
    # el admin la ve y puede reabrirla
    admin = api("u_admin")
    d = admin.get("/admin/decisiones", params={"cliente_id": "POL"}).json()
    assert admin.delete(f"/admin/decisiones/{d[0]['id']}").status_code == 200
    assert api("u_pol").get("/portal/clientes/POL").json()["decisiones"] == []


def test_cliente_no_decide_por_otro_cliente(api):
    p = api("u_admin").get("/portal/clientes/POL").json()
    clave = "A:" + next(a for a in p["actividades"] if a["est"] == "Por aprobar")["uid"]
    r = api("u_rap").post("/portal/clientes/POL/decisiones", json={"clave": clave, "decision": "Aprobado"})
    assert r.status_code == 403


def test_nueva_solicitud_numera_y_pone_plazo(api):
    c = api("u_pol")
    antes = c.get("/portal/clientes/POL").json()["solicitudes"]
    n_max = max(s["n"] for s in antes)
    r = c.post("/portal/clientes/POL/solicitudes", json={"empresa": "POL1", "area": "Legal", "tipo": "Incidencia", "sol": "Necesito revisar un contrato"})
    assert r.status_code == 200 and r.json()["n"] == n_max + 1
    nueva = next(s for s in c.get("/portal/clientes/POL").json()["solicitudes"] if s["n"] == n_max + 1)
    assert nueva["plazo"] == 30 and nueva["est"] == "Abierta"
    # no puede crear solicitudes en una empresa de otro cliente
    assert c.post("/portal/clientes/POL/solicitudes", json={"empresa": "RAP1", "area": "Legal", "tipo": "Otro", "sol": "hola mundo"}).status_code == 404


def test_envio_de_documento_y_deshacer(api):
    c = api("u_pol")
    item = next(x for x in c.get("/portal/clientes/POL").json()["checklist"] if x["est"] == "Por enviar")
    url = f"/portal/clientes/POL/checklist/{item['ruc']}/{item['cod']}/envio"
    assert c.put(url, json={"nombre": "politica.pdf"}).status_code == 200
    hecho = next(x for x in c.get("/portal/clientes/POL").json()["checklist"] if x["cod"] == item["cod"])
    assert hecho["envio"]["nombre"] == "politica.pdf"
    assert c.delete(url).status_code == 200
    assert next(x for x in c.get("/portal/clientes/POL").json()["checklist"] if x["cod"] == item["cod"])["envio"] is None


def test_no_se_deshace_un_documento_ya_en_revision(api):
    c = api("u_pol")
    item = next(x for x in c.get("/portal/clientes/POL").json()["checklist"] if x["est"] == "En revisión")
    r = c.delete(f"/portal/clientes/POL/checklist/{item['ruc']}/{item['cod']}/envio")
    assert r.status_code == 409


def test_intereses_son_idempotentes(api):
    c = api("u_pol")
    for _ in range(2):
        assert c.put("/portal/clientes/POL/intereses/srv-recupera").status_code == 200
    assert c.get("/portal/clientes/POL").json()["intereses"] == ["srv-recupera"]
    assert c.delete("/portal/clientes/POL/intereses/srv-recupera").status_code == 200
    assert c.get("/portal/clientes/POL").json()["intereses"] == []


def test_admin_crud_de_fugas(api):
    a = api("u_admin")
    nueva = a.post("/admin/fugas", json={"empresa_codigo": "POL1", "fuga": "Prueba", "area": "Legal", "prob": "Alta", "monto": 50000, "tipo": "Anual"})
    assert nueva.status_code == 200
    fid = nueva.json()["id"]
    assert a.patch(f"/admin/fugas/{fid}", json={"est": "Cerrado"}).json()["est"] == "Cerrado"
    assert any(f["fuga"] == "Prueba" for f in a.get("/admin/fugas", params={"cliente_id": "POL"}).json())
    assert not any(f["fuga"] == "Prueba" for f in a.get("/admin/fugas", params={"cliente_id": "RAP"}).json())
    assert a.delete(f"/admin/fugas/{fid}").status_code == 200
    assert a.patch(f"/admin/fugas/{fid}", json={"est": "x"}).status_code == 404


def test_admin_no_crea_registros_en_empresa_inexistente(api):
    r = api("u_admin").post("/admin/fugas", json={"empresa_codigo": "NOPE", "fuga": "x", "area": "Legal"})
    assert r.status_code == 422


def test_admin_crea_edita_y_borra_kpi_con_valores(api):
    a = api("u_admin")
    k = a.post("/admin/kpis", json={"cliente_id": "POL", "area": "Finanzas", "sub": "Finanzas", "n": "KPI de prueba", "est": "verde", "viz": "ring", "vals": {"POL1": "80%"}, "num": {"POL1": 80}}).json()
    payload_k = next(x for x in api("u_pol").get("/portal/clientes/POL").json()["kpis"] if x["n"] == "KPI de prueba")
    assert payload_k["vals"] == {"POL1": "80%"} and payload_k["num"] == {"POL1": 80}
    a.patch(f"/admin/kpis/{k['id']}", json={"vals": {"POL1": "90%", "POL2": "10%"}, "num": {"POL1": 90, "POL2": 10}})
    payload_k = next(x for x in api("u_pol").get("/portal/clientes/POL").json()["kpis"] if x["n"] == "KPI de prueba")
    assert payload_k["vals"] == {"POL1": "90%", "POL2": "10%"}
    assert a.delete(f"/admin/kpis/{k['id']}").status_code == 200


def test_admin_asigna_usuario_a_cliente(api):
    a = api("u_admin")
    u = next(x for x in a.get("/admin/usuarios").json() if x["email"] == "sin@cliente.pe")
    assert a.patch(f"/admin/usuarios/{u['id']}", json={"cliente_id": "RAP"}).json()["cliente_id"] == "RAP"
    assert a.patch(f"/admin/usuarios/{u['id']}", json={"cliente_id": "NOPE"}).status_code == 404
    assert api("u_nada").get("/portal/clientes/RAP").status_code == 200


def test_admin_borra_empresa_con_todo_su_contenido(api, seeded):
    from app import models as m

    a = api("u_admin")
    assert a.delete("/admin/empresas/POL2").status_code == 200
    assert seeded.query(m.Fuga).filter_by(empresa_codigo="POL2").count() == 0
    assert [e["ruc"] for e in api("u_pol").get("/portal/clientes/POL").json()["empresas"]] == ["POL1"]


def test_exportar_e_importar_conserva_los_envios_del_cliente(api):
    c = api("u_pol")
    item = next(x for x in c.get("/portal/clientes/POL").json()["checklist"] if x["est"] == "Por enviar")
    c.put(f"/portal/clientes/POL/checklist/{item['ruc']}/{item['cod']}/envio", json={"nombre": "a.pdf", "url": "https://drive/x"})

    admin = api("u_admin")
    respaldo = admin.get("/admin/clientes/POL/exportar").json()
    assert admin.post("/admin/importar", json={"clientes": {"POL": respaldo}}).status_code == 200

    hecho = next(x for x in api("u_pol").get("/portal/clientes/POL").json()["checklist"] if x["cod"] == item["cod"])
    assert hecho["envio"]["nombre"] == "a.pdf" and hecho["envio"]["url"] == "https://drive/x"


def test_importar_base_solo_admin(api):
    assert api("u_pol").post("/admin/importar-base").status_code == 403
    r = api("u_admin").post("/admin/importar-base")
    assert r.status_code == 200 and set(r.json()) >= {"POL", "RAP"}


def test_rol_inicial():
    from app.auth import rol_inicial
    from app.models import Rol

    # sin ADMIN_EMAILS: el primero es admin, el resto cliente
    assert rol_inicial("a@x.pe", True, True, []) == Rol.admin
    assert rol_inicial("a@x.pe", True, False, []) == Rol.cliente
    # con ADMIN_EMAILS: solo esos correos verificados, aunque sea el primero
    assert rol_inicial("Yo@core.pe", True, False, ["yo@core.pe"]) == Rol.admin
    assert rol_inicial("otro@x.pe", True, True, ["yo@core.pe"]) == Rol.cliente
    assert rol_inicial("yo@core.pe", False, True, ["yo@core.pe"]) == Rol.cliente


def test_admin_importa_json_nuevo(api, data):
    a = api("u_admin")
    assert a.post("/admin/importar", json={"nada": 1}).status_code == 422
    r = a.post("/admin/importar", json={"clientes": {"POL": data["clientes"]["POL"]}})
    assert r.status_code == 200 and r.json()["POL"]["fugas"] == len(data["clientes"]["POL"]["fugas"])
