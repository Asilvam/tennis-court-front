export enum PlayerCategory {
    PRIMERA = '1',
    SEGUNDA = '2',
    TERCERA = '3',
    CUARTA = '4',
    DOBLES = 'Dobles',
    DAMAS = 'Damas',
    MAS_55 = '+55',
    MAS_65 = '+65',
    MENORES = 'Menores',
    MENORES_AMARILLA = 'Menores - Cancha Amarilla',
    MENORES_VERDE = 'Menores - Cancha Verde',
    MENORES_NARANJA = 'Menores - Cancha Naranja',
    MENORES_ROJA = 'Menores - Cancha Roja',
}

export const categoryOptions = Object.values(PlayerCategory).map(category => ({
    value: category,
    label: category,
}));

export const roleOptions = [
    {value: 'user', label: 'User'},
    {value: 'admin', label: 'Admin'},
];