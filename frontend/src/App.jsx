import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@frontend/routes/router';
import '@frontend/i18n';

function App() {
    useEffect(() => {
        document.body.classList.add('light-ui');
        return () => {
            document.body.classList.remove('light-ui');
        };
    }, []);

    return <RouterProvider router={router} />;
}

export default App;
