import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '93680eae03382d7cfcc6091599167187';

export const config = getDefaultConfig({
  appName: 'Breaking News - Read to Earn',
  projectId,
  chains: [base],
  ssr: true,
});
