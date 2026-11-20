import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";

import { formatInteger } from "@/lib/format";

import type { BppColony, BppRace } from "./types";

interface QaItem {
  answer: string;
  id: string;
  question: string;
}

export function QaAccordion({ colony, race }: { colony: BppColony | null; race: BppRace | null }) {
  const minimum = colony?.minimum ?? 100;
  const agreement = colony?.agreement ?? 55;
  const quorum = race?.quorum ?? 451;
  const bar = race?.bar ?? 3504;

  const items: QaItem[] = [
    {
      answer:
        "A Qubic experiment where computors' trained networks predict whether Bitcoin will close the next hour higher or lower. This page shows their calls and what actually happened.",
      id: "what",
      question: "What is BPP-9000?",
    },
    {
      answer:
        "Qubic computors. Each runs a network trained on past Bitcoin hours, then votes up or down for the current hour.",
      id: "who",
      question: "Who votes?",
    },
    {
      answer: `A call is the side most computors support once at least ${formatInteger(minimum)} have voted and one side reaches ${agreement}% agreement. It is about where Bitcoin closes at the end of the hour, not where it goes next.`,
      id: "call",
      question: "What does a call mean?",
    },
    {
      answer: `A computor is aligned when its network's error score is at or below this epoch's bar of ${formatInteger(bar)} errors. ${formatInteger(quorum)} computors form the quorum the network needs. Open the alignment board to inspect every computor.`,
      id: "aligned",
      question: "What does aligned mean?",
    },
    {
      answer: `An hour is scored only when at least ${formatInteger(minimum)} computors vote and one side reaches ${agreement}% agreement. Otherwise it is marked no consensus or not scored and is left out of accuracy.`,
      id: "scored",
      question: "Why are some hours not scored?",
    },
    {
      answer:
        "When the hour closes, the call is right if the network's side matches Bitcoin's move. Wrong means Bitcoin went the other way. No consensus is neither right nor wrong, so it does not affect factual accuracy.",
      id: "right-wrong",
      question: "What do right and wrong mean?",
    },
    {
      answer:
        "Calls refresh every two minutes and the alignment board every five. The countdown updates more often as votes arrive.",
      id: "refresh",
      question: "How often does this page refresh?",
    },
    {
      answer: "The public Jetski ANN Explorer BPP feed.",
      id: "source",
      question: "Where does the data come from?",
    },
    {
      answer: "No. This is a prediction experiment, not a trading signal or financial advice.",
      id: "advice",
      question: "Is this financial advice?",
    },
  ];

  return (
    <section>
      <h2 className="font-medium text-foreground text-xl">Questions</h2>
      <div className="mt-3">
        {items.map((item) => (
          <details className="group" key={item.id}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-foreground text-sm [&::-webkit-details-marker]:hidden">
              {item.question}
              <AltArrowDownIcon className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="max-w-3xl pb-3 text-muted text-sm leading-6">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
