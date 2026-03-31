import { randomBytes } from 'node:crypto';
import tls from 'node:tls';

const TOP_N_SHUFFLE = 8;

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUint32LE() % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomizeCiphers(): void {
  const defaultCiphers = tls.DEFAULT_CIPHERS.split(':');
  const top = defaultCiphers.slice(0, TOP_N_SHUFFLE);
  const rest = defaultCiphers.slice(TOP_N_SHUFFLE);

  let shuffled: string[];
  do {
    shuffled = [...shuffleArray(top), ...rest];
  } while (shuffled.join(':') === defaultCiphers.join(':'));

  tls.DEFAULT_CIPHERS = shuffled.join(':');
}
