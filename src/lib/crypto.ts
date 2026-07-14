// Chiffrement au repos (CN-004) — AES-256-GCM.
// Protège la signature manuscrite (PNG) et tutorIdLast4 dans la base et les
// sauvegardes. La clé vient de ENCRYPTION_KEY (base64 de 32 octets).
//
// Format d'un blob chiffré : [0x01 version][12o IV][16o tag][ciphertext].
// Les chaînes chiffrées sont préfixées "enc:v1:" + base64(blob).
//
// Rétrocompatibilité : les anciennes lignes en clair (avant chiffrement) sont
// détectées et renvoyées telles quelles à la lecture, pour ne pas casser les
// récépissés déjà générés. Réencrypter idéalement via une migration ultérieure.
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const VERSION = 0x01;
const IV_LEN = 12;
const TAG_LEN = 16;
const STR_PREFIX = "enc:v1:";

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY manquante — impossible de chiffrer/déchiffrer les données sensibles.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY invalide : 32 octets attendus (base64), reçu ${key.length}.`,
    );
  }
  cachedKey = key;
  return key;
}

export function encryptBytes(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, ct]);
}

function looksEncrypted(buf: Buffer): boolean {
  return buf.length > 1 + IV_LEN + TAG_LEN && buf[0] === VERSION;
}

export function decryptBytes(blob: Buffer): Buffer {
  // Ligne héritée en clair → passthrough.
  if (!looksEncrypted(blob)) return blob;
  try {
    const iv = blob.subarray(1, 1 + IV_LEN);
    const tag = blob.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
    const ct = blob.subarray(1 + IV_LEN + TAG_LEN);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  } catch {
    // En cas d'échec d'authentification, renvoyer le blob brut plutôt que
    // planter le rendu ; l'anomalie sera visible (image illisible).
    return blob;
  }
}

export function encryptString(plain: string): string {
  if (!plain) return plain;
  return STR_PREFIX + encryptBytes(Buffer.from(plain, "utf8")).toString("base64");
}

export function decryptString(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith(STR_PREFIX)) return value; // héritage en clair
  const blob = Buffer.from(value.slice(STR_PREFIX.length), "base64");
  return decryptBytes(blob).toString("utf8");
}
