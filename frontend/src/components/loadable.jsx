import React, { Suspense, lazy } from 'react';

export default function loadable(loader, options = {}) {
    const LazyComponent = lazy(async () => {
        const moduleExports = await loader();

        if (moduleExports && typeof moduleExports === 'object' && 'default' in moduleExports) {
            return { default: moduleExports.default };
        }

        return { default: moduleExports };
    });

    const Loading = options.loading;

    function LoadableComponent(props) {
        return (
            <Suspense fallback={Loading ? <Loading /> : null}>
                <LazyComponent {...props} />
            </Suspense>
        );
    }

    LoadableComponent.displayName = 'LoadableComponent';

    return LoadableComponent;
}
