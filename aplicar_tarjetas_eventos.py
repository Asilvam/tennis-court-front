#!/usr/bin/env python3
"""Refactor visual mínimo de cuatro estados en el Dashboard de CTQ.

Ejecución desde la raíz de tennis-court-front:
    python3 aplicar_tarjetas_eventos.py --check
    python3 aplicar_tarjetas_eventos.py --apply

No ejecuta git, no hace commit ni push. No cambia lógica de reserva.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise ValueError(f"{label}: se esperaba 1 coincidencia, hay {count}; no se aplicó ningún cambio")
    return text.replace(old, new, 1)


TSX_REPLACEMENTS = [
    (
        "if (category === 'mantencion') return '🪏';",
        "if (category === 'mantencion') return '🛠️';",
        "Emoji de mantención",
    ),
    (
        '<div className="legend-item maintenance"><span className="dot maintenance"></span>Mantención</div>',
        '<div className="legend-item maintenance"><span className="legend-event-emoji" aria-hidden="true">🛠️</span>Mantención</div>',
        "Leyenda mantención",
    ),
    (
        '<div className="legend-item championship"><span className="dot championship"></span>Campeonato</div>',
        '<div className="legend-item championship"><span className="legend-event-emoji" aria-hidden="true">🏆</span>Campeonato</div>',
        "Leyenda campeonato",
    ),
    (
        '<div className="legend-item class"><span className="dot class"></span>Clases</div>',
        '<div className="legend-item class"><span className="legend-event-emoji" aria-hidden="true">🎾</span>Clases</div>',
        "Leyenda clases",
    ),
    (
        '<div className="legend-item weather"><span className="dot weather"></span>Clima</div>',
        '<div className="legend-item weather"><span className="legend-event-emoji" aria-hidden="true">🌦️</span>Clima</div>',
        "Leyenda clima",
    ),
]

CSS_OLD = '''.court-card.championship {
    background-color: rgba(168, 85, 247, 0.14);
    color: #e9d5ff;
    border-color: rgba(192, 132, 252, 0.28);
}

.court-card.maintenance {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background-color: #172033;
    color: #fff7d6;
    border-color: #fbbf24;
    box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.24);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.court-card.maintenance::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
        135deg,
        rgba(15, 23, 42, 0.68) 0 14px,
        rgba(251, 191, 36, 0.38) 14px 28px
    );
}

.court-card.maintenance > * {
    position: relative;
    z-index: 1;
}

.court-card.class {
    background-color: rgba(74, 222, 128, 0.14);
    color: #bbf7d0;
    border-color: rgba(74, 222, 128, 0.24);
}

.court-card.weather {
    background-color: #94a3b8;
    background-image:
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 20px),
        linear-gradient(135deg, #64748b 0%, #94a3b8 100%);
    color: #f8fafc;
    border-color: #475569;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}'''

CSS_NEW = '''/* Eventos y bloqueos: superficies limpias, sin franjas ni relieves fuertes.
   Se mantienen dimensiones, grilla, tipografía y comportamiento de las tarjetas. */
.court-card.championship {
    background-color: #322546;
    color: #e3caff;
    border-color: #ae86e7;
}

.court-card.maintenance {
    background-color: #3c3020;
    color: #ffd787;
    border-color: #d9a64d;
}

.court-card.class {
    background-color: #173d37;
    color: #a2f0c5;
    border-color: #36b98a;
}

.court-card.weather {
    background-color: #263b54;
    color: #d7e9fa;
    border-color: #7e9fbe;
}

/* Diferenciar la franja lateral sin cambiar su ancho ni su orientación. */
.court-card.championship .court-name { background-color: #46315f; }
.court-card.maintenance .court-name { background-color: #574126; }
.court-card.class .court-name { background-color: #205348; }
.court-card.weather .court-name { background-color: #354c68; }

/* El detalle sigue siendo legible y conserva todos los datos originales. */
.court-card.championship .status-text { color: #f0e4fc; }
.court-card.maintenance .status-text { color: #fae9c7; }
.court-card.class .status-text { color: #dbf7e9; }
.court-card.weather .status-text { color: #dae5f3; }'''

LEGEND_ANCHOR = '''.legend-item {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 6px;
}
'''
LEGEND_NEW = LEGEND_ANCHOR + '''
/* Únicamente los cuatro eventos utilizan emojis en la leyenda. */
.legend-event-emoji {
    display: inline-flex;
    flex: 0 0 14px;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
}
'''


def transform(tsx: str, css: str) -> tuple[str, str]:
    for old, new, label in TSX_REPLACEMENTS:
        tsx = replace_once(tsx, old, new, label)
    css = replace_once(css, CSS_OLD, CSS_NEW, "Estilos de cuatro estados")
    css = replace_once(css, LEGEND_ANCHOR, LEGEND_NEW, "Estilos leyenda")
    return tsx, css


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validar sin modificar archivos")
    parser.add_argument("--apply", action="store_true", help="escribir solo dos archivos del Dashboard")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="raíz del repositorio")
    args = parser.parse_args()
    if args.apply == args.check:
        parser.error("elige exactamente una opción: --check o --apply")

    repo = args.repo.resolve()
    tsx_path = repo / "src/components/Dashboard.tsx"
    css_path = repo / "src/styles/Dashboard.css"
    try:
        original_tsx = tsx_path.read_text(encoding="utf-8")
        original_css = css_path.read_text(encoding="utf-8")
        new_tsx, new_css = transform(original_tsx, original_css)
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.apply:
        tsx_path.write_text(new_tsx, encoding="utf-8")
        css_path.write_text(new_css, encoding="utf-8")
        print("Cambios visuales aplicados en Dashboard.tsx y Dashboard.css")
        print("Sin commits, sin push y sin cambios a reservas o backend")
    else:
        print("Validación correcta: los cambios visuales se pueden aplicar a estos archivos")
        print("No se modificó ningún archivo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
