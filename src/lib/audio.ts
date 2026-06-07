// Audio helpers: decode Gemini's base64 PCM, optionally apply playback speed by
// resampling, and encode a WAV blob.
//
// Hardening vs the original:
//  - Respects the decoded array's byteOffset/byteLength instead of assuming the
//    underlying ArrayBuffer is exactly the sample data.
//  - Guards odd byte lengths (16-bit PCM must be an even number of bytes).
//  - `speed` is actually baked into the exported file via linear resampling,
//    so a downloaded take matches what the user heard. (Rate-style speed: like
//    the live <audio>.playbackRate, this shifts pitch too — consistent behavior,
//    not a pitch-preserving time-stretch.)

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Concatenate multiple base64 PCM chunks into one contiguous byte buffer. */
function decodeChunksToBytes(base64Chunks: string[]): Uint8Array {
  const parts = base64Chunks.map(decodeBase64ToBytes);
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

/** Read 16-bit little-endian PCM into a normalized Float32Array, safely. */
function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  // Drop a dangling odd byte rather than letting Int16Array throw.
  const usableBytes = bytes.byteLength - (bytes.byteLength % 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, usableBytes);
  const sampleCount = usableBytes / 2;
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

/** Linear-interpolation resample. speed > 1 shortens (faster), < 1 lengthens. */
function resample(samples: Float32Array, speed: number): Float32Array {
  if (!Number.isFinite(speed) || speed <= 0 || Math.abs(speed - 1) < 1e-3) {
    return samples;
  }
  const outLength = Math.max(1, Math.round(samples.length / speed));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * speed;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcPos - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export interface DecodedAudio {
  /** Blob URL for an unmodified (1.0x) WAV, used for in-app playback. */
  url: string;
  /** Cached samples + rate so we can re-export at a chosen speed cheaply. */
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Turn the base64 PCM chunks returned by /api/generate-speech into one playable
 * WAV. Multiple chunks (from server-side chunking) are concatenated seamlessly.
 */
export function decodeGeminiAudio(
  base64Chunks: string[],
  sampleRate: number,
): DecodedAudio {
  const bytes = decodeChunksToBytes(base64Chunks);
  const samples = pcm16ToFloat32(bytes);
  const blob = encodeWav(samples, sampleRate);
  return { url: URL.createObjectURL(blob), samples, sampleRate };
}

/** Produce a WAV blob with `speed` baked in (for download). */
export function exportWavAtSpeed(decoded: DecodedAudio, speed: number): Blob {
  const resampled = resample(decoded.samples, speed);
  return encodeWav(resampled, decoded.sampleRate);
}

/**
 * Trigger a browser download of `blob` as `filename`. Returns true on success,
 * false if the browser blocked or threw (so callers can show a meaningful
 * error instead of failing silently).
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (err) {
    console.error('[download] failed:', err);
    return false;
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url as string), 1000);
  }
}
