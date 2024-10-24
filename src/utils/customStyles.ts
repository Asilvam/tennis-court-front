export const customStyles = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: (base: any) => ({
        ...base,
        minHeight: '40px', // Adjust this value to set the height
        height: '40px', // Set the input height
        fontSize: '12px',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueContainer: (base: any) => ({
        ...base,
        height: '40px',
        padding: '0 6px',
        fontSize: '12px',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: (base: any) => ({
        ...base,
        margin: '0px',
        fontSize: '12px',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    indicatorSeparator: (base: any) => ({
        display: 'none',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    indicatorsContainer: (base: any) => ({
        ...base,
        height: '40px',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menuPortal: (base: any) => ({...base, zIndex: 9999})
};
