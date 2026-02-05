import { ProjectConfig } from '../lib/types';

export const PROJECT_CONFIG: ProjectConfig = {
    clientId: 'client_base_001',
    clientName: 'Wellness Growth Agency',
    primaryColor: 'hsl(142, 76%, 36%)',
    targets: {
        icp: 'Gimnasios, Centros de Crossfit y Estudios de Yoga que necesitan más clientes',
        locations: ['Madrid', 'Barcelona', 'Valencia'],
    },
    enabledPlatforms: ['gmail', 'linkedin'],
    searchSettings: {
        defaultDepth: 10,
        defaultMode: 'fast'
    }
};
