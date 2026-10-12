import '../styles/loading-spinner.css';

interface LoadingSpinnerProps {
    size?: number;
    label?: string;
    className?: string;
}

export function LoadingSpinner({
    size = 120,
    label = 'Cargando',
    className = '',
}: LoadingSpinnerProps) {
    return (
        <span
            className={`ctq-spinner ${className}`.trim()}
            role="status"
            aria-label={label}
            style={{ width: size, height: size }}
        >
            <img
                className="ctq-spinner__inner"
                src="/images/ctq_centro_giratorio.png"
                alt=""
                draggable={false}
            />
            <img
                className="ctq-spinner__outer"
                src="/images/ctq_aro_fijo.png"
                alt=""
                draggable={false}
            />
        </span>
    );
}
