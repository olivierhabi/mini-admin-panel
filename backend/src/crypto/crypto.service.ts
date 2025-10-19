import { Injectable } from '@nestjs/common';
import { createSign, generateKeyPairSync, createVerify } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class CryptoService {
    private privateKeyPem: string;
    private publicKeyPem: string;

    constructor() {
        const dir = path.join(process.cwd(), 'keys');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const privPath = path.join(dir, 'private.pem');
        const pubPath = path.join(dir, 'public.pem');

        if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
            this.privateKeyPem = fs.readFileSync(privPath, 'utf8');
            this.publicKeyPem = fs.readFileSync(pubPath, 'utf8');
        } else {
            const { publicKey, privateKey } = generateKeyPairSync('ec', {
                namedCurve: 'secp384r1',
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
            fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
            fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });
            this.privateKeyPem = privateKey;
            this.publicKeyPem = publicKey;
        }
    }

    sign(message: string): string {
        const signer = createSign('sha384');
        signer.update(message);
        signer.end();
        return signer.sign(this.privateKeyPem, 'base64');
    }

    getPublicKeyPem(): string {
        return this.publicKeyPem;
    }

}
