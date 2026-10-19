import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * React Native has no WebCrypto. Supabase Auth needs crypto.subtle.digest (SHA-256) to build the
 * PKCE code challenge for OAuth; without it, it falls back to the weaker "plain" method and logs a
 * warning. This fills in the two pieces it uses, backed by expo-crypto. Browsers already have them.
 */
if (Platform.OS !== 'web') {
  const g = globalThis as { crypto?: { getRandomValues?: Crypto['getRandomValues']; subtle?: SubtleCrypto } };
  g.crypto ??= {};
  g.crypto.getRandomValues ??= ((array: ArrayBufferView) =>
    ExpoCrypto.getRandomValues(array as Uint8Array)) as Crypto['getRandomValues'];
  g.crypto.subtle ??= {
    digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
      const name = (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase();
      if (name !== 'SHA-256') throw new Error(`Unsupported digest ${name}`);
      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    },
  } as SubtleCrypto;
}
