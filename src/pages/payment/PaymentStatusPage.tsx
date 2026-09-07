import React from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AppLoader from '../../components/AppLoader';
import './Payment.css';

type PaymentStatus = 'success' | 'failure' | 'pending' | 'processing';

interface PaymentStatusPageProps {
    status: PaymentStatus;
    icon?: IconDefinition;
    eyebrow: string;
    title: string;
    description: string;
    secondaryText?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const PaymentStatusPage: React.FC<PaymentStatusPageProps> = ({
    status,
    icon,
    eyebrow,
    title,
    description,
    secondaryText,
    actionLabel,
    onAction,
}) => (
    <main className="payment-status-page">
        <section className={`payment-status-card payment-status-card--${status}`} aria-live="polite">
            <span className="payment-status-eyebrow">{eyebrow}</span>

            <div className="payment-status-icon" aria-hidden="true">
                {status === 'processing' ? <AppLoader text="" size="3x" /> : icon && <FontAwesomeIcon icon={icon} />}
            </div>

            <h1>{title}</h1>
            <p className="payment-status-description">{description}</p>
            {secondaryText && <p className="payment-status-secondary">{secondaryText}</p>}

            {actionLabel && onAction && (
                <button type="button" className="payment-status-action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </section>
    </main>
);

export default PaymentStatusPage;
