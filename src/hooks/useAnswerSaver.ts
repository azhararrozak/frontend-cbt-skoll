import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AnswerStatus } from '../types';

const DEBOUNCE_MS = 1000;

/**
 * Menyimpan jawaban siswa ke server dengan teknik debouncing:
 * request baru dikirim setelah siswa berhenti mengubah jawaban
 * selama 1 detik (per soal). Jawaban terakhir selalu yang terkirim.
 */
export function useAnswerSaver(sessionId: number) {
  const [statuses, setStatuses] = useState<Record<number, AnswerStatus>>({});
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<number, string>());

  const setStatus = (questionId: number, status: AnswerStatus) =>
    setStatuses((prev) => ({ ...prev, [questionId]: status }));

  const persist = useCallback(
    async (questionId: number) => {
      const answer = latest.current.get(questionId);
      if (answer === undefined) return;
      setStatus(questionId, 'saving');
      try {
        await api.submitAnswer(sessionId, questionId, answer);
        // Hanya tandai tersimpan jika nilainya masih yang terbaru
        if (latest.current.get(questionId) === answer) {
          setStatus(questionId, 'saved');
        }
      } catch {
        setStatus(questionId, 'error');
      }
    },
    [sessionId],
  );

  /** Panggil setiap kali siswa mengubah jawaban; otomatis debounce 1 detik */
  const queue = useCallback(
    (questionId: number, answer: string) => {
      latest.current.set(questionId, answer);
      setStatus(questionId, 'pending');

      const existing = timers.current.get(questionId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        timers.current.delete(questionId);
        void persist(questionId);
      }, DEBOUNCE_MS);
      timers.current.set(questionId, timer);
    },
    [persist],
  );

  /** Kirim sekarang semua jawaban yang belum tersimpan (dipakai saat selesai ujian) */
  const flushAll = useCallback(async () => {
    const pendingIds = [...latest.current.keys()];
    await Promise.all(
      pendingIds.map(async (id) => {
        const timer = timers.current.get(id);
        if (timer) {
          clearTimeout(timer);
          timers.current.delete(id);
        }
        await persist(id);
      }),
    );
  }, [persist]);

  // Bersihkan timer saat unmount
  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
    },
    [],
  );

  return { statuses, queue, flushAll };
}

/** Hitung mundur berdasarkan deadline; minim drift karena berbasis timestamp */
export function useCountdown(initialSeconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  // Simpan callback terbaru tanpa mengubah interval
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const deadline = Date.now() + initialSeconds * 1000;
    const tick = () => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // Hanya dijalankan sekali saat komponen pengerjaan ujian dimuat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return remaining;
}
