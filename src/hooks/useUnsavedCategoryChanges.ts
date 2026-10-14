import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

let categoryPopHandler: ((event: PopStateEvent) => void) | undefined;
// Loaded by App before BrowserRouter registers its history listener.
if (typeof window !== 'undefined') {
    window.addEventListener(
        'popstate',
        (event) => categoryPopHandler?.(event),
        true,
    );
}

export function useUnsavedCategoryChanges(dirty: boolean, saving: boolean) {
    const { navigator } = useContext(UNSAFE_NavigationContext);
    useEffect(() => {
        if (!dirty && !saving) return;
        const confirmLeave = () =>
            !saving &&
            window.confirm(
                'Tienes cambios sin guardar. ¿Descartarlos y salir?',
            );
        const beforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        const original = {
            push: navigator.push,
            replace: navigator.replace,
            go: navigator.go,
        };
        let approvedPop = false;
        let restoring = false;
        let currentIndex = window.history.state?.idx;
        navigator.push = (...args) => {
            if (confirmLeave()) original.push.apply(navigator, args);
        };
        navigator.replace = (...args) => {
            if (confirmLeave()) original.replace.apply(navigator, args);
        };
        navigator.go = (...args) => {
            if (confirmLeave()) {
                approvedPop = true;
                original.go.apply(navigator, args);
            }
        };
        // BrowserRouter has no data-router blocker; intercept Back before its listener.
        const onPop = (event: PopStateEvent) => {
            if (restoring) {
                restoring = false;
                event.stopImmediatePropagation();
                return;
            }
            const nextIndex = window.history.state?.idx;
            if (approvedPop || confirmLeave()) {
                approvedPop = false;
                currentIndex = nextIndex;
                return;
            }
            if (
                typeof currentIndex === 'number' &&
                typeof nextIndex === 'number'
            ) {
                event.stopImmediatePropagation();
                restoring = true;
                window.history.go(currentIndex - nextIndex);
            }
        };
        window.addEventListener('beforeunload', beforeUnload);
        categoryPopHandler = onPop;
        return () => {
            Object.assign(navigator, original);
            window.removeEventListener('beforeunload', beforeUnload);
            if (categoryPopHandler === onPop) categoryPopHandler = undefined;
        };
    }, [dirty, saving, navigator]);
}
