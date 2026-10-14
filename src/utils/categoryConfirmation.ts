import Swal from 'sweetalert2';

let confirmationOpen = false;

export async function confirmDiscardCategoryChanges(
    action: 'leave' | 'reload',
): Promise<boolean> {
    if (confirmationOpen) return false;
    confirmationOpen = true;
    try {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Cambios sin guardar',
            text:
                action === 'reload'
                    ? 'Se descartarán tus cambios pendientes al recargar los datos.'
                    : 'Si sales ahora, perderás los cambios de categorías y puntajes que no has guardado.',
            showCancelButton: true,
            confirmButtonText:
                action === 'reload'
                    ? 'Descartar y recargar'
                    : 'Descartar y salir',
            cancelButtonText: 'Seguir editando',
            focusCancel: true,
            allowOutsideClick: false,
        });
        return result.isConfirmed;
    } finally {
        confirmationOpen = false;
    }
}
