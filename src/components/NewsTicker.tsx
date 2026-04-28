import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../styles/ResultsTicker.css";
interface Noticia {
    titulo: string;
    url?: string;
    resumen?: string;
    es_local?: boolean;
    fecha: string;
    fuente?: string;
}
// ApiResponse removed because backend may return either an array or { noticias: [...] }
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const CHARS_PER_SECOND = 15;
function formatShortDate(iso: string, locale = "es-CL") {
    try {
        const d = new Date(iso);
        return d.toLocaleString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            // hour: "2-digit",
            // minute: "2-digit",
        });
    } catch {
        return iso;
    }
}
function calcDurationSeconds(text: string, minSec = 20, maxSec = 120) {
    const chars = text.length || 0;
    const secs = Math.max(minSec, Math.ceil(chars / CHARS_PER_SECOND));
    return Math.min(secs, maxSec);
}
type Props = {
    limit?: number;
    locale?: string;
    variant?: "ticker" | "stacked";
};
const NewsTicker: React.FC<Props> = ({
                                         limit = DEFAULT_LIMIT,
                                         locale = "es-CL",
                                         variant = "ticker",
                                     }) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        setLoading(true);
// Reemplaza la llamada axios existente por esto:
        axios
            .get(`${apiUrl}/news-ctq`)
            .then((res) => {
                if (!mounted) return;
                // El backend puede devolver { noticias: [...] } o directamente un array [...]
                const payload = res.data;
                const data: Noticia[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.noticias)
                        ? payload.noticias
                        : [];

                // filter: only last 1 day (user requested)
                const cutoff = Date.now() - ONE_DAY_MS;
                const recent = data.filter((n) => {
                    if (!n?.fecha) return true;
                    return new Date(n.fecha).getTime() >= cutoff;
                });
                recent.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                setNoticias(recent);
            })
            .catch((err) => {
                console.error("NewsTicker: error fetching news", err);
                setNoticias([]);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        // cleanup to avoid setting state on unmounted component
        return () => {
            mounted = false;
        };
    }, [apiUrl, limit]);

    // Hooks must be called unconditionally and in the same order on every render.
    // Move all useMemo/use calculations here (even if noticias is empty) to avoid
    // changing the hooks order between renders (previously we returned early
    // before these hooks ran which caused the Hooks order error).
    const items = useMemo(() => {
        return [...noticias, ...noticias];
    }, [noticias]);

    const totalText = useMemo(() => {
        return noticias
            .map((n) => `${n.titulo} — ${n.fuente || ""} · ${formatShortDate(n.fecha, locale)}`)
            .join("   ");
    }, [noticias, locale]);

    const duration = calcDurationSeconds(totalText);

    // prepare dynamic CSS variable safely without using `any`
    const dynamicStyle = ({ ['--rt-duration' as unknown as string]: `${duration}s` } as unknown) as React.CSSProperties;

    if (loading || noticias.length === 0) return null;
    if (variant === "stacked") {
        return (
            <section className="rt-stacked" role="region" aria-label="Últimas noticias">
                {noticias.map((n, idx) => (
                    <article key={`${n.titulo}-${idx}`} className="rt-card">
                        <h3 className="rt-title">
                            {n.url ? (
                                <a href={n.url} target="_blank" rel="noopener noreferrer">
                                    {n.titulo}
                                </a>
                            ) : (
                                n.titulo
                            )}
                        </h3>
                        <p className="rt-meta">
                            <span className="rt-source">{n.fuente}</span>
                            <span className="rt-dot">•</span>
                            <time dateTime={n.fecha}>{formatShortDate(n.fecha, locale)}</time>
                        </p>
                        <p className="rt-summary">{n.resumen}</p>
                    </article>
                ))}
            </section>
        );
    }
    return (
        <div
            className="rt-wrapper"
            style={dynamicStyle}
            role="region"
            aria-label="Titulares mundiales"
        >
            <span className="rt-label">Noticias</span>
            <div className="rt-track" aria-hidden="false">
                <div className="rt-inner">
                    {items.map((n, i) => (
                        <span key={`${n.titulo}-${i}`} className="rt-item">
              <a
                  href={n.url || "#"}
                  className="rt-link"
                  target={n.url ? "_blank" : undefined}
                  rel={n.url ? "noopener noreferrer" : undefined}
                  onClick={(e) => {
                      if (!n.url) e.preventDefault();
                  }}
                  title={n.titulo}
              >
                {n.titulo}
              </a>
              <span className="rt-divider"> — </span>
              <span className="rt-source">{n.fuente}</span>
              <span className="rt-time"> · {formatShortDate(n.fecha, locale)}</span>
            </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default NewsTicker;