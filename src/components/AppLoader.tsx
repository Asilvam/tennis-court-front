import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface AppLoaderProps {
    /** Text shown below the spinner. Defaults to "Cargando..." */
    text?: string;
    /** FontAwesome icon size. Defaults to "3x" */
    size?: '1x' | '2x' | '3x' | '4x' | '5x';
    /** Extra className applied to the wrapper */
    className?: string;
}

const AppLoader: React.FC<AppLoaderProps> = ({
    text = 'Cargando...',
    size = '3x',
    className = '',
}) => (
    <div className={`app-loader ${className}`.trim()}>
        <FontAwesomeIcon icon={faSpinner} spin size={size} className="app-loader-icon" />
        {text && <p className="app-loader-text">{text}</p>}
    </div>
);

export default AppLoader;
