import { Button } from '@/components/ui/button';

export function HomePage() {
  return (
    <main className="flex flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Summarise</h1>
      <Button>Get started</Button>
    </main>
  );
}
