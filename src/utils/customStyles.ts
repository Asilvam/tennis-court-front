import { StylesConfig } from 'react-select';

interface OptionType {
    value: string;
    label: string;
}

export const customStyles: StylesConfig<OptionType> = {
    control: (base) => ({
        ...base,
        minHeight: '40px', // Adjust this value to set the height
        height: '40px',    // Set the input height
        fontSize: '10px',
    }),
    valueContainer: (base) => ({
        ...base,
        height: '40px',
        padding: '0 6px',
        fontSize: '10px',
    }),
    input: (base) => ({
        ...base,
        margin: '0px',
        fontSize: '12px',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
    indicatorsContainer: (base) => ({
        ...base,
        height: '40px',
    }),
    menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
    }),
};
