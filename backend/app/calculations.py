"""Motor de calculo. Puerto del bloque `calcular()` del prototipo
(docs/prototipo-v2.html) para el modulo de Contabilidad. Como en el
prototipo: si un numero no sale de aqui, no se muestra.
"""

RENTA_TERCERA = 0.295  # NORMA.rentaTercera, Regimen General

# Claves de Saldo (er.*) que necesita este modulo, y su etiqueta para el
# estado de resultados. El orden es el orden en que se muestran.
LINEAS_ER = [
    ("ingresos", "Ingresos operativos", "+"),
    ("costoServicios", "Costo de servicios", "-"),
    ("gastosAdmin", "Gastos administrativos", "-"),
    ("gastosVentas", "Gastos de ventas", "-"),
    ("depreciacion", "Depreciación", "-"),
    ("otrosIngresos", "Otros ingresos", "+"),
]


def calcular_contabilidad(er: dict[str, float]) -> dict:
    ingresos = er.get("ingresos", 0.0)
    costo_servicios = er.get("costoServicios", 0.0)
    gastos_admin = er.get("gastosAdmin", 0.0)
    gastos_ventas = er.get("gastosVentas", 0.0)
    depreciacion = er.get("depreciacion", 0.0)
    otros_ingresos = er.get("otrosIngresos", 0.0)
    gastos_financieros = er.get("gastosFinancieros", 0.0)

    ebit = ingresos - costo_servicios - gastos_admin - gastos_ventas - depreciacion + otros_ingresos
    ebitda = ebit + depreciacion
    margen_operativo = ebit / ingresos if ingresos else 0.0
    utilidad_neta = (ebit - gastos_financieros) * (1 - RENTA_TERCERA)

    valores = {
        "ingresos": ingresos,
        "costoServicios": -costo_servicios,
        "gastosAdmin": -gastos_admin,
        "gastosVentas": -gastos_ventas,
        "depreciacion": -depreciacion,
        "otrosIngresos": otros_ingresos,
    }
    lineas = [
        {
            "clave": clave,
            "cuenta": etiqueta,
            "signo": signo,
            "importe": valores[clave],
            "pct_ingresos": (valores[clave] / ingresos) if ingresos else 0.0,
        }
        for clave, etiqueta, signo in LINEAS_ER
    ]

    return {
        "ingresos": ingresos,
        "ebitda": ebitda,
        "ebit": ebit,
        "margen_operativo": margen_operativo,
        "utilidad_neta": utilidad_neta,
        "lineas": lineas,
    }
