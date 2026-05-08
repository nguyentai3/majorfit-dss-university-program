import React, { forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

function hrefToString(href) {
    if (typeof href === 'string') {
        return href;
    }

    return `${href.pathname || ''}${href.search || ''}${href.hash || ''}` || '/';
}

function isExternal(href) {
    return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

const AppLink = forwardRef(function AppLink(
    { href, replace, scroll: _scroll, prefetch: _prefetch, onClick, children, ...rest },
    ref,
) {
    const to = hrefToString(href);

    if (isExternal(to)) {
        return (
            <a ref={ref} href={to} onClick={onClick} {...rest}>
                {children}
            </a>
        );
    }

    return (
        <RouterLink ref={ref} to={to} replace={replace} onClick={onClick} {...rest}>
            {children}
        </RouterLink>
    );
});

export default AppLink;
