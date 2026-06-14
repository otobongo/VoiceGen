// Central studio state + actions for the Prepare -> Preview -> Finalize wizard:
// the script, voice/persona/speed, AI copy prep, short previews, the full master
// render, session usage, and step navigation.
//
// This hook is the single source of truth the step screens render from.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  auditScript,
  generateMasterAudio,
  generateSpeech,
  prepareCopy as prepareCopyApi,
} from '@/lib/api';
import { decodeGeminiAudio, exportWavAtSpeed, type DecodedAudio } from '@/lib/audio';
import {
  composeContexts,
  MAX_TEXT_LENGTH,
  type AIImprovement,
  type AuditIssue,
  type PersonaType,
  type ScriptChange,
  type ScriptContext,
  type Take,
  type VoiceName,
  type WizardStep,
} from '@/lib/types';

const STARTER_TEXT =
  'Welcome to the studio. [pause]\n[whisper] Listen closely to the dynamic range. [break]\nSuddenly [shout] we can project power and authority! [pause]\n[happy] And just as easily switch to a cheerful, bright tone. [pause]\n[slow] We can slow things down for emphasis... [fast] or speed them up to convey excitement! [break]\nHow will you direct the voice today?';

export interface StudioError {
  code: string;
  quota: boolean;
}

export interface StudioOptions {
  /**
   * Called with the rendered script after a successful Finalize master render.
   * Used to auto-save the script to history. Kept optional + UI-agnostic so the
   * hook has no direct dependency on the history store.
   */
  onMasterRendered?: (text: string) => void;
}

export function useStudio(options: StudioOptions = {}) {
  const { onMasterRendered } = options;
  // Wizard
  const [step, setStep] = useState<WizardStep>('prepare');

  // Script + shaping
  const [text, setText] = useState(STARTER_TEXT);
  const [voice, setVoice] = useState<VoiceName>('Fenrir');
  const [persona, setPersona] = useState<PersonaType>('nigerian');
  const [speed, setSpeed] = useState(1);
  const [reviewCopy, setReviewCopy] = useState(false);

  // Async + status
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Master render progress: chunks completed vs. total (null when not running).
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<StudioError | null>(null);
  const [improvement, setImprovement] = useState<AIImprovement | null>(null);
  const [contexts, setContexts] = useState<ScriptContext[]>([]);
  const [changes, setChanges] = useState<ScriptChange[]>([]);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [sessionTokens, setSessionTokens] = useState(0);

  // Spell/grammar audit
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[] | null>(null);

  // Results: one preview take, one final master take.
  const [previewTake, setPreviewTake] = useState<Take | null>(null);
  const [masterTake, setMasterTake] = useState<Take | null>(null);

  const decodedRef = useRef<Map<string, DecodedAudio>>(new Map());
  const takeCounter = useRef(0);

  useEffect(() => {
    const decoded = decodedRef.current;
    return () => {
      for (const d of decoded.values()) URL.revokeObjectURL(d.url);
      decoded.clear();
    };
  }, []);

  const charCount = text.length;
  const overLimit = charCount > MAX_TEXT_LENGTH;
  const isEmpty = text.trim().length === 0;
  const isValid = !isEmpty && !overLimit;
  // "Prepare Copy" must run before leaving the Prepare step.
  const hasPrepared = contexts.length > 0;

  const toError = (err: unknown): StudioError =>
    err instanceof ApiError
      ? { code: err.code, quota: err.code === 'QUOTA_EXHAUSTED' }
      : { code: 'UNKNOWN', quota: false };

  const dropDecoded = (id: string | undefined) => {
    if (!id) return;
    const d = decodedRef.current.get(id);
    if (d) URL.revokeObjectURL(d.url);
    decodedRef.current.delete(id);
  };

  const makeTake = (
    decoded: DecodedAudio,
    meta: Omit<Take, 'id' | 'audioUrl' | 'createdAt' | 'label'>,
  ): Take => {
    takeCounter.current += 1;
    const id = `take-${takeCounter.current}`;
    decodedRef.current.set(id, decoded);
    return {
      ...meta,
      id,
      audioUrl: decoded.url,
      createdAt: Date.now(),
      label: meta.scope === 'full' ? 'Master' : 'Preview',
    };
  };

  // Editing the script (or changing voice/persona) invalidates rendered audio —
  // a stale preview/master must not carry downstream.
  const invalidateAudio = useCallback(() => {
    setPreviewTake((prev) => {
      if (prev) dropDecoded(prev.id);
      return null;
    });
    setMasterTake((prev) => {
      if (prev) dropDecoded(prev.id);
      return null;
    });
    // A prior audit result no longer reflects edited text.
    setAuditIssues(null);
  }, []);

  const updateText = useCallback(
    (next: string) => {
      setText(next);
      invalidateAudio();
    },
    [invalidateAudio],
  );

  const setVoiceChecked = useCallback(
    (v: VoiceName) => {
      setVoice(v);
      invalidateAudio();
    },
    [invalidateAudio],
  );

  const setPersonaChecked = useCallback(
    (p: PersonaType) => {
      setPersona(p);
      invalidateAudio();
    },
    [invalidateAudio],
  );

  // ---- Step navigation ----
  // Backward navigation is always allowed. Moving FORWARD past Prepare requires
  // a valid script that has been prepared (Prepare Copy run).
  const goToStep = useCallback(
    (next: WizardStep) => {
      const order: WizardStep[] = ['prepare', 'preview', 'finalize'];
      const movingForward = order.indexOf(next) > order.indexOf(step);
      if (movingForward && (!isValid || !hasPrepared)) return;
      setError(null);
      setStep(next);
    },
    [step, isValid, hasPrepared],
  );

  // ---- Prepare Copy: ONE pass that structures the script into contexts AND
  // applies prosody tags (+ optional grammar/flow + instruction), then applies
  // the composed result (continuous within each context, a break between). ----
  const prepareCopy = useCallback(
    async (instruction?: string) => {
      if (!isValid || isPreparing) return;
      setIsPreparing(true);
      setError(null);
      try {
        const res = await prepareCopyApi({ text, reviewCopy, instruction });
        setPreviousText(text);
        setContexts(res.contexts);
        setChanges(res.changes ?? []);
        setText(composeContexts(res.contexts));
        invalidateAudio();
        setImprovement({
          reviewedCopy: reviewCopy,
          changedWording: res.changedWording,
          contextCount: res.contexts.length,
        });
      } catch (err) {
        setError(toError(err));
      } finally {
        setIsPreparing(false);
      }
    },
    [text, reviewCopy, isValid, isPreparing, invalidateAudio],
  );

  const undoPrepare = useCallback(() => {
    if (previousText !== null) {
      setText(previousText);
      setPreviousText(null);
      setImprovement(null);
      setContexts([]);
      setChanges([]);
      invalidateAudio();
    }
  }, [previousText, invalidateAudio]);

  // ---- Spell/grammar audit ----
  const runAudit = useCallback(async () => {
    if (!isValid || isAuditing) return;
    setIsAuditing(true);
    setError(null);
    try {
      const res = await auditScript({ text });
      if (res.totalTokens) setSessionTokens((t) => t + res.totalTokens!);
      setAuditIssues(res.issues);
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsAuditing(false);
    }
  }, [text, isValid, isAuditing]);

  const clearAudit = useCallback(() => setAuditIssues(null), []);

  // ---- Preview: short audition of the user's script ----
  const generatePreview = useCallback(async () => {
    if (!isValid || isPreviewing) return;
    setIsPreviewing(true);
    setError(null);
    try {
      const res = await generateSpeech({ text, voice, persona, scope: 'preview' });
      if (res.totalTokens) setSessionTokens((t) => t + res.totalTokens!);
      const decoded = decodeGeminiAudio(res.audioChunks, res.sampleRate);
      setPreviewTake((prev) => {
        if (prev) dropDecoded(prev.id);
        return makeTake(decoded, { voice, persona, scope: 'preview', speed });
      });
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsPreviewing(false);
    }
  }, [text, voice, persona, speed, isValid, isPreviewing]);

  // ---- Finalize: full master render ----
  const generateMaster = useCallback(async () => {
    if (!isValid || isGenerating) return;
    setIsGenerating(true);
    setGenProgress(null);
    setError(null);
    try {
      // Browser-orchestrated: one short request per ~1000-char chunk, assembled
      // here. No single call hits the 60s function ceiling, so long (up to ~10
      // min) renders complete without timing out.
      const res = await generateMasterAudio({ text, voice, persona }, (done, total) =>
        setGenProgress({ done, total }),
      );
      if (res.totalTokens) setSessionTokens((t) => t + res.totalTokens!);
      const decoded = decodeGeminiAudio(res.audioChunks, res.sampleRate);
      const take = makeTake(decoded, { voice, persona, scope: 'full', speed });
      setMasterTake((prev) => {
        if (prev) dropDecoded(prev.id);
        return take;
      });
      // Auto-save the rendered script to history (Finalize only).
      onMasterRendered?.(text);
      return take;
    } catch (err) {
      setError(toError(err));
      return null;
    } finally {
      setIsGenerating(false);
      setGenProgress(null);
    }
  }, [text, voice, persona, speed, isValid, isGenerating, onMasterRendered]);

  // Build a speed-baked WAV for download. Returns null on failure AND surfaces a
  // meaningful error banner, so a failed export is never silent. Two distinct
  // failure modes: the take's decoded audio is gone (NO_AUDIO_TO_EXPORT), or WAV
  // encoding threw (EXPORT_FAILED, e.g. empty/oversized samples).
  const exportTake = useCallback((takeId: string, exportSpeed: number): Blob | null => {
    const decoded = decodedRef.current.get(takeId);
    if (!decoded) {
      setError({ code: 'NO_AUDIO_TO_EXPORT', quota: false });
      return null;
    }
    try {
      return exportWavAtSpeed(decoded, exportSpeed);
    } catch (err) {
      console.error('[export] WAV encode failed:', err);
      setError({ code: 'EXPORT_FAILED', quota: false });
      return null;
    }
  }, []);

  const dismissError = useCallback(() => setError(null), []);
  const reportError = useCallback((code: string) => {
    setError({ code, quota: code === 'QUOTA_EXHAUSTED' });
  }, []);

  return {
    // wizard
    step,
    goToStep,
    // script + shaping
    text,
    voice,
    persona,
    speed,
    reviewCopy,
    setText: updateText,
    setVoice: setVoiceChecked,
    setPersona: setPersonaChecked,
    setSpeed,
    setReviewCopy,
    // validation
    charCount,
    overLimit,
    isEmpty,
    isValid,
    hasPrepared,
    maxChars: MAX_TEXT_LENGTH,
    // async + status
    isPreparing,
    isPreviewing,
    isGenerating,
    genProgress,
    isAuditing,
    error,
    improvement,
    contexts,
    changes,
    auditIssues,
    previousText,
    sessionTokens,
    // results
    previewTake,
    masterTake,
    // actions
    prepareCopy,
    undoPrepare,
    runAudit,
    clearAudit,
    generatePreview,
    generateMaster,
    exportTake,
    dismissError,
    reportError,
  };
}

export type StudioApi = ReturnType<typeof useStudio>;
