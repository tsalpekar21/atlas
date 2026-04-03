"use client";

import { Button } from "@atlas/subframe/components/Button";
import { IconButton } from "@atlas/subframe/components/IconButton";
import {
  FeatherArrowRight,
  FeatherClipboardList,
  FeatherClock,
  FeatherMonitor,
  FeatherRefreshCw,
  FeatherSmartphone,
  FeatherUser,
} from "@subframe/core";
import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ensureSessionForTriage } from "@/lib/ensure-session-for-triage";
import { buildPatientTriageHref } from "@/lib/patient-triage-url";

const EXAMPLE_PROMPTS: Array<string> = [
  "I have a persistent headache",
  "Help me understand my lab results",
  "Should I see a specialist?",
];

function newThreadId(): string {
  return crypto.randomUUID();
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [isStartingTriage, setIsStartingTriage] = useState(false);
  const [triageStartError, setTriageStartError] = useState<string | null>(null);
  const [examplePrompts, setExamplePrompts] = useState(() => [
    ...EXAMPLE_PROMPTS,
  ]);

  const stagger: Variants = useMemo(
    () => ({
      hidden: {},
      show: {
        transition: reduceMotion
          ? { duration: 0 }
          : { staggerChildren: 0.08, delayChildren: 0.06 },
      },
    }),
    [reduceMotion],
  );

  const fadeUp: Variants = useMemo(
    () => ({
      hidden: reduceMotion
        ? { opacity: 1, y: 0 }
        : { opacity: 0, y: 14 },
      show: reduceMotion
        ? { opacity: 1, y: 0 }
        : {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 380, damping: 28 },
          },
    }),
    [reduceMotion],
  );

  const goToTriage = useCallback(async (initialMessage?: string) => {
    if (isStartingTriage) {
      return;
    }
    setIsStartingTriage(true);
    setTriageStartError(null);
    const session = await ensureSessionForTriage();
    if (!session.ok) {
      setTriageStartError(session.message);
      setIsStartingTriage(false);
      return;
    }
    const threadId = newThreadId();
    const href = buildPatientTriageHref({ threadId, initialMessage });
    window.location.assign(href);
  }, [isStartingTriage]);

  const shuffleExamples = useCallback(() => {
    setExamplePrompts((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = next[i];
        next[i] = next[j];
        next[j] = tmp;
      }
      return next;
    });
  }, []);

  const onSubmit = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    void goToTriage(t);
  }, [draft, goToTriage]);

  return (
    <div className="flex h-full min-h-svh w-full flex-col items-center justify-center bg-neutral-50 px-6 py-12">
      <motion.div
        className="flex w-full max-w-[576px] flex-col items-center gap-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          variants={fadeUp}
        >
          <span className="text-center font-heading-1 text-[48px] font-semibold leading-[52px] text-default-font -tracking-[0.04em] mobile:text-[36px] mobile:font-normal mobile:leading-[40px] mobile:tracking-normal">
            Every patient deserves a care team
          </span>
          <span className="text-center text-body font-body text-subtext-color">
            AI-guided triage, real doctors when you need them
          </span>
        </motion.div>

        <motion.div
          className="relative w-full rounded-rounded-extra-large bg-default-background px-6 pt-6 pb-20 shadow-md"
          variants={fadeUp}
        >
          <textarea
            className="min-h-[128px] w-full resize-none text-body font-body text-default-font outline-none placeholder:text-neutral-400 disabled:opacity-60"
            placeholder="Describe how you are feeling and we will guide you..."
            value={draft}
            disabled={isStartingTriage}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          {triageStartError ? (
            <p className="mt-2 text-caption font-caption text-error-600">
              {triageStartError}
            </p>
          ) : null}
          <div className="absolute right-6 bottom-6 left-6 flex items-center justify-end pt-4">
            <motion.div
              whileHover={
                reduceMotion || isStartingTriage
                  ? undefined
                  : { scale: 1.05 }
              }
              whileTap={
                reduceMotion || isStartingTriage
                  ? undefined
                  : { scale: 0.95 }
              }
            >
              <IconButton
                variant="brand-primary"
                size="large"
                icon={<FeatherArrowRight />}
                disabled={isStartingTriage}
                loading={isStartingTriage}
                onClick={onSubmit}
              />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="flex w-full flex-wrap items-start justify-center gap-8 mobile:flex-row mobile:flex-wrap mobile:gap-6"
          variants={fadeUp}
        >
          {[
            { icon: <FeatherClock />, label: "Symptoms" },
            { icon: <FeatherClipboardList />, label: "Records" },
            { icon: <FeatherUser />, label: "Doctors" },
            { icon: <FeatherMonitor />, label: "Resources" },
            { icon: <FeatherSmartphone />, label: "Devices" },
          ].map(({ icon, label }) => (
            <motion.div
              key={label}
              className="flex flex-col items-center gap-2"
              variants={fadeUp}
            >
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-solid border-neutral-200 bg-default-background">
                <span className="text-heading-3 font-heading-3 text-default-font">
                  {icon}
                </span>
              </div>
              <span className="text-caption font-caption text-subtext-color">
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-4"
          variants={fadeUp}
        >
          <motion.button
            type="button"
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-caption font-caption text-subtext-color"
            onClick={shuffleExamples}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            <span>Try an example</span>
            <FeatherRefreshCw className="text-caption font-caption" />
          </motion.button>
          <div className="flex flex-wrap items-center justify-center gap-3 mobile:h-auto mobile:w-full mobile:flex-none mobile:flex-col mobile:flex-nowrap mobile:gap-3">
            {examplePrompts.map((text) => (
              <motion.div
                key={text}
                layout={!reduceMotion}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  variant="neutral-secondary"
                  disabled={isStartingTriage}
                  onClick={() => void goToTriage(text)}
                >
                  {text}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
