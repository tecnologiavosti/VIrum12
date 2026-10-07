import type { ReactNode } from 'react';
import type { Chapter } from './types';

export function ChapterSection({ chapter, children }: { chapter: Chapter; children: ReactNode }) {
  return (
    <section
      id={chapter.id}
      data-chapter-id={chapter.id}
      className="scroll-mt-24 py-16 border-b border-border last:border-0"
    >
      <p className="font-serif text-sm tracking-[0.3em] text-muted-foreground uppercase">{chapter.numeral}</p>
      <h2 className="mt-2 font-serif text-3xl md:text-5xl text-foreground leading-tight tracking-tight uppercase">{chapter.title}</h2>
      <p className="mt-3 text-sm font-sans italic text-muted-foreground">{chapter.kicker}</p>
      <div className="mt-12 space-y-6">{children}</div>
    </section>
  );
}