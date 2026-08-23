import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { trpc } from './lib/trpc';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { supabase } from './lib/supabase';
import App from './App';
import './index.css';

const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: '/api/trpc',
            transformer: superjson,
            async headers() {
                // Attach Supabase auth token to every tRPC request
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    return {
                        Authorization: `Bearer ${session.access_token}`,
                    };
                }
                return {};
            },
        }),
    ],
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </trpc.Provider>
    </StrictMode>
);
