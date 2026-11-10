// Jednou vygeneruje klíče pro upozornění (VAPID):  node tools/vapid.mjs
const b64u = buf => Buffer.from(buf).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey));
const d = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d;
console.log('Veřejný klíč (VAPID_PUBLIC):\n' + pub + '\n');
console.log('Soukromý klíč (VAPID_PRIVATE) – nikomu neukazuj:\n' + d + '\n');
console.log('Ulož je do Cloudflare (každý příkaz se zeptá na hodnotu, vlož ji):');
console.log('npx wrangler secret put VAPID_PUBLIC');
console.log('npx wrangler secret put VAPID_PRIVATE');
