import { generateKeyPairSync, privateDecrypt } from 'crypto';

let pub = process.env.RSA_PUBLIC_KEY ? process.env.RSA_PUBLIC_KEY.replace(/\\n/g, '\n') : undefined;
let pri = process.env.RSA_PRIVATE_KEY ? process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
if (!pub || !pri) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  pub = publicKey;
  pri = privateKey;
}

export const getPublicKeyPem = () => pub;
export const decryptWithPrivateKey = (base64) => {
  const buf = Buffer.from(base64, 'base64');
  const dec = privateDecrypt({ key: pri, padding: 4, oaepHash: 'sha256' }, buf);
  return dec.toString('utf8');
};
