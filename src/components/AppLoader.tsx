import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface AppLoaderProps {
    /** Text shown below the spinner. Defaults to "Cargando..." */
    text?: string;
    /** Spinner size preset. Defaults to "3x" */
    size?: '1x' | '2x' | '3x' | '4x' | '5x';
    /** Extra className applied to the wrapper */
    className?: string;
}

const spinnerSizes = { '1x': 24, '2x': 64, '3x': 120, '4x': 144, '5x': 168 };

const AppLoader: React.FC<AppLoaderProps> = ({
    text = 'Cargando...',
    size = '3x',
    className = '',
}) => (
    <div className={`app-loader ${className}`.trim()}>
        <LoadingSpinner size={spinnerSizes[size]} label={text || 'Cargando'} />
        {text && <p className="app-loader-text">{text}</p>}
    </div>
);

export default AppLoader;
