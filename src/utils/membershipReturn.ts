import type { MemberPaymentState } from './memberPayments';

export function membershipReturnView(payment: Pick<MemberPaymentState, 'status' | 'providerPaymentId'>) {
  switch (payment.status) {
    case 'CONFIRMED':
      return { tone: 'success', title: 'Mensualidad pagada', description: 'Tu pago quedó registrado correctamente en tus mensualidades.' };
    case 'CANCELLED':
      return { tone: 'neutral', title: 'Pago cancelado', description: 'El intento se cerró sin un pago confirmado. Tu cuota sigue sin pagar.' };
    case 'REJECTED':
      return { tone: 'danger', title: 'Pago rechazado', description: 'Mercado Pago rechazó la operación. Tu cuota no se registró como pagada.' };
    case 'REVIEW_REQUIRED':
      return { tone: 'warning', title: 'Pago en revisión', description: 'Administración debe revisar esta operación. No vuelvas a pagar estas cuotas.' };
    case 'REVERSED':
      return { tone: 'warning', title: 'Pago revertido', description: 'La operación figura revertida. Comunícate con administración antes de realizar otro pago.' };
    default:
      return payment.providerPaymentId
        ? { tone: 'warning', title: 'Pago pendiente', description: 'La operación todavía no está confirmada. No repitas el pago mientras se consulta su estado.' }
        : { tone: 'neutral', title: 'Pago no completado', description: 'Volviste sin un pago confirmado. Tu cuota sigue abierta. Si ya te cobraron, consulta el estado antes de volver a pagar.' };
  }
}

type ReturnReader = { state: () => Promise<MemberPaymentState>; reconcile: () => Promise<MemberPaymentState> };

export async function readMembershipReturn(reference: string, reader: ReturnReader, reconcile: boolean) {
  const validate = (state: MemberPaymentState) => {
    if (state?.reference !== reference || !Number.isSafeInteger(state.amount) || state.amount <= 0 ||
      !['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'REVIEW_REQUIRED', 'REVERSED'].includes(state.status))
      throw new Error('No se pudo verificar la respuesta de esta operación.');
    return state;
  };
  let state = validate(await reader.state());
  if (reconcile && ['PENDING', 'REJECTED'].includes(state.status)) state = validate(await reader.reconcile());
  return state;
}
