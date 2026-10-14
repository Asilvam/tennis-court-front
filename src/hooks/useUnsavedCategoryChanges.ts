import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { confirmDiscardCategoryChanges } from '../utils/categoryConfirmation';

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
    const latest = useRef({ dirty, saving });
    latest.current = { dirty, saving };
    const enabled = dirty || saving;
    useEffect(() => {
        if (!enabled) return;
        let disposed = false;
        let prompting = false;
        let approvedUnload = false;
        const confirmLeave = async (continueNavigation: () => void) => {
            if (disposed || prompting || latest.current.saving) return;
            prompting = true;
            try {
                const approved =
                    !latest.current.dirty ||
                    (await confirmDiscardCategoryChanges('leave'));
                if (approved && !disposed && !latest.current.saving)
                    continueNavigation();
            } finally {
                prompting = false;
            }
        };
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (approvedUnload) return;
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
        let pendingDelta: number | undefined;
        let currentIndex = window.history.state?.idx;
        navigator.push = (...args) => {
            void confirmLeave(() => original.push.apply(navigator, args));
        };
        navigator.replace = (...args) => {
            void confirmLeave(() => original.replace.apply(navigator, args));
        };
        navigator.go = (...args) => {
            void confirmLeave(() => {
                approvedUnload = args[0] === 0;
                approvedPop = !approvedUnload;
                original.go.apply(navigator, args);
            });
        };
        // BrowserRouter has no data-router blocker; intercept Back before its listener.
        const onPop = (event: PopStateEvent) => {
            const nextIndex = window.history.state?.idx;
            if (approvedPop) {
                approvedPop = false;
                currentIndex = nextIndex;
                return;
            }
            if (restoring) {
                event.stopImmediatePropagation();
                if (nextIndex === currentIndex) {
                    restoring = false;
                    const delta = pendingDelta;
                    pendingDelta = undefined;
                    if (delta !== undefined)
                        void confirmLeave(() => {
                            approvedPop = true;
                            original.go.call(navigator, delta);
                        });
                } else if (
                    typeof currentIndex === 'number' &&
                    typeof nextIndex === 'number'
                ) {
                    window.history.go(currentIndex - nextIndex);
                }
                return;
            }
            if (
                typeof currentIndex === 'number' &&
                typeof nextIndex === 'number'
            ) {
                event.stopImmediatePropagation();
                if (currentIndex === nextIndex) return;
                // Restore the URL before opening an asynchronous dialog, keeping the draft mounted.
                pendingDelta =
                    prompting || latest.current.saving
                        ? undefined
                        : nextIndex - currentIndex;
                restoring = true;
                window.history.go(currentIndex - nextIndex);
            }
        };
        window.addEventListener('beforeunload', beforeUnload);
        categoryPopHandler = onPop;
        return () => {
            disposed = true;
            if (prompting) Swal.close();
            Object.assign(navigator, original);
            window.removeEventListener('beforeunload', beforeUnload);
            if (categoryPopHandler === onPop) categoryPopHandler = undefined;
        };
    }, [enabled, navigator]);
}
