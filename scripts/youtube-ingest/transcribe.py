#!/usr/bin/env python
"""Local ASR transcription via faster-whisper.

Usage: python transcribe.py <audio_file> <output_json> [--model MODEL]

Adaptive model strategy: defaults to 'medium' (good accuracy/throughput
balance for Portuguese technical tutorial audio on CPU-only hardware).
Pass --model large-v3 to retry difficult/low-confidence audio with a
stronger model. Never defaults to the heaviest model for everything.

Outputs a transcript.timestamped.json-shaped file: segments with
start/end/text/avg_logprob (used as a confidence proxy), plus an overall
quality classification (HIGH/MEDIUM/LOW) derived from segment-level
no_speech_prob and avg_logprob, per the project's confidence pipeline.
"""
import sys
import json
import time
import argparse

def classify_confidence(segments):
    if not segments:
        return 'LOW'
    avg_logprob = sum(s['avg_logprob'] for s in segments) / len(segments)
    avg_no_speech = sum(s['no_speech_prob'] for s in segments) / len(segments)
    # faster-whisper avg_logprob is typically in [-1, 0]; closer to 0 = more confident.
    # no_speech_prob close to 1 means the model thinks that segment is silence/noise.
    if avg_logprob > -0.35 and avg_no_speech < 0.15:
        return 'HIGH'
    if avg_logprob > -0.6 and avg_no_speech < 0.35:
        return 'MEDIUM'
    return 'LOW'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('audio_file')
    parser.add_argument('output_json')
    parser.add_argument('--model', default='medium')
    parser.add_argument('--language', default='pt')
    args = parser.parse_args()

    from faster_whisper import WhisperModel

    t0 = time.time()
    model = WhisperModel(args.model, device='cpu', compute_type='int8')
    load_time = time.time() - t0

    t1 = time.time()
    segments_iter, info = model.transcribe(
        args.audio_file, language=args.language, word_timestamps=False,
        vad_filter=True,
    )
    segments = []
    for seg in segments_iter:
        segments.append({
            'start': round(seg.start, 2),
            'end': round(seg.end, 2),
            'text': seg.text.strip(),
            'avg_logprob': round(seg.avg_logprob, 4),
            'no_speech_prob': round(seg.no_speech_prob, 4),
        })
    transcribe_time = time.time() - t1

    quality = classify_confidence(segments)
    audio_duration = info.duration
    processing_ratio = round(transcribe_time / audio_duration, 3) if audio_duration else None

    output = {
        'asrModel': args.model,
        'asrEngine': 'faster-whisper (ctranslate2, CPU, int8)',
        'language': args.language,
        'detectedLanguage': info.language,
        'languageProbability': round(info.language_probability, 3),
        'audioDurationSec': round(audio_duration, 2),
        'modelLoadTimeSec': round(load_time, 2),
        'transcribeTimeSec': round(transcribe_time, 2),
        'processingRatio': processing_ratio,  # transcribe_time / audio_duration -- lower is faster than realtime
        'confidenceClassification': quality,
        'segmentCount': len(segments),
        'segments': segments,
    }

    with open(args.output_json, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"OK model={args.model} duration={audio_duration:.1f}s transcribe={transcribe_time:.1f}s "
          f"ratio={processing_ratio} quality={quality} segments={len(segments)}")

if __name__ == '__main__':
    main()
