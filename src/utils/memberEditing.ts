export interface EditableMember {
    _id?: string;
    email: string;
    namePlayer: string;
    cellular: string;
    role: string;
    statePlayer: boolean;
    updatePayment: boolean;
    partnerType?: string;
    titularId?: string | null;
}

export interface AdminMemberUpdate {
    namePlayer?: string;
    cellular?: string;
    role?: string;
    statePlayer?: boolean;
    updatePayment?: boolean;
    partnerType?: 'Titular' | 'Carga';
    titularId?: string | null;
}

export const memberTypeOptions = [{ value: 'Titular', label: 'Titular' }, { value: 'Carga', label: 'Carga' }];

export function memberType(value?: string): 'Titular' | 'Carga' | '' {
    if (value === 'Carga' || value === 'Familiar') return 'Carga';
    if (!value || value === 'Titular') return 'Titular';
    return '';
}

export function titularOptions(members: EditableMember[], editedId?: string) {
    return members.filter(member => member._id && member._id !== editedId && memberType(member.partnerType) === 'Titular')
        .map(member => ({ value: member._id!, label: `${member.namePlayer} — ${member.email}` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function buildAdminMemberUpdate(current: EditableMember, original: EditableMember): AdminMemberUpdate {
    const update: AdminMemberUpdate = {};
    if (current.namePlayer !== original.namePlayer) update.namePlayer = current.namePlayer;
    if (current.cellular !== original.cellular) update.cellular = current.cellular;
    if (current.role !== original.role) update.role = current.role;
    if (current.statePlayer !== original.statePlayer) update.statePlayer = current.statePlayer;
    if (current.updatePayment !== original.updatePayment) update.updatePayment = current.updatePayment;
    if (memberType(current.partnerType) !== memberType(original.partnerType) || (current.titularId ?? null) !== (original.titularId ?? null)) {
        const type = memberType(current.partnerType);
        if (!type) throw new Error('Selecciona un tipo de socio válido.');
        update.partnerType = type;
        update.titularId = type === 'Titular' ? null : current.titularId ?? null;
    }
    return update;
}

export function validateMemberAssociation(update: AdminMemberUpdate, current: EditableMember, members: EditableMember[]) {
    if (update.partnerType !== 'Carga') return;
    if (!update.titularId) throw new Error('Selecciona el titular de esta carga.');
    if (update.titularId === current._id) throw new Error('Un socio no puede ser su propio titular.');
    if (!titularOptions(members, current._id).some(option => option.value === update.titularId)) {
        throw new Error('El titular seleccionado ya no está disponible. Selecciona un socio titular.');
    }
}
