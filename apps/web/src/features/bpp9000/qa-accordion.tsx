"use client";

import { Accordion } from "@heroui/react";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";

import { formatInteger } from "@/lib/format";

import type { BppColony, BppRace } from "./types";

export function QaAccordion({ colony, race }: { colony: BppColony | null; race: BppRace | null }) {
  const minimum = colony?.minimum ?? 100;
  const agreement = colony?.agreement ?? 55;
  const quorum = race?.quorum ?? 451;
  const bar = race?.bar ?? 3504;

  const items = [
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
      answer: `A computor is aligned when its network's error score is at or below this epoch's bar of ${formatInteger(bar)} errors. ${formatInteger(quorum)} aligned computors form the quorum the network needs. Open the alignment stat to inspect the full board.`,
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
        "When the hour closes, the call is right if the network's side matches Bitcoin's move. Wrong means Bitcoin went the other way. No consensus is neither right nor wrong.",
      id: "right-wrong",
      question: "What do right and wrong mean?",
    },
    {
      answer: "Every minute. The countdown and the current hour update more often as votes arrive.",
      id: "refresh",
      question: "How often does this page refresh?",
    },
    {
      answer:
        "The public Jetski ANN Explorer BPP feed. This is a read-only view and does not connect to a wallet.",
      id: "source",
      question: "Where does the data come from?",
    },
    {
      answer:
        "No. This is a read-only view of a prediction experiment, not a trading signal or financial advice.",
      id: "advice",
      question: "Is this financial advice?",
    },
  ];

  return (
    <section className="pt-2">
      <h2 className="font-medium text-foreground text-lg">Questions</h2>
      <p className="mt-1 text-muted text-sm">Plain answers to the things people ask most.</p>

      <Accordion allowsMultipleExpanded className="mt-2" hideSeparator variant="default">
        {items.map((item) => (
          <Accordion.Item id={item.id} key={item.id}>
            <Accordion.Heading>
              <Accordion.Trigger className="flex w-full items-center justify-between gap-4 rounded-md px-0 py-3 text-left font-medium text-foreground text-sm hover:bg-transparent">
                {item.question}
                <Accordion.Indicator className="size-4 shrink-0 text-muted">
                  <AltArrowDownIcon />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-0 pb-3 text-muted text-sm leading-6">
                {item.answer}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
