import { Accordion } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/json-ld";

export function FaqList({
  items,
  title,
}: {
  items: { id: string; question: string; answer: string }[];
  title?: string;
}) {
  if (!items.length) return null;
  return (
    <section className="mt-16 md:mt-24">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
      {title ? <h2 className="mb-2 font-display text-3xl tracking-[-0.03em]">{title}</h2> : null}
      <div>
        {items.map((item) => (
          <Accordion key={item.id} title={item.question}>
            <p>{item.answer}</p>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
