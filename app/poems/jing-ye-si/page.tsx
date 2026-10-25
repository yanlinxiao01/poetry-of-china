import type { Metadata } from 'next';
import JingYeSiExperience from './experience';

export const metadata: Metadata = {
  title: '静夜思 · Quiet Night Thoughts — Poetry of China',
  description:
    "An immersive scroll experience of Li Bai's most beloved poem, Quiet Night Thoughts.",
};

export default function Page() {
  return <JingYeSiExperience />;
}
