import assert from 'node:assert/strict';
import { test } from 'node:test';
import type axios from 'axios';
import { updateProfileImage } from '../src/utils/profileImage.ts';

const apiUrl = 'http://backend.test';
const email = 'member+photo@test.cl';
const imageUrl = 'https://images.example/profile.jpg';
function fixture() {
    const calls: unknown[][] = [];
    const client = {
        post: async (...args: unknown[]) => { calls.push(['post', ...args]); return { data: { imageUrl } }; },
        patch: async (...args: unknown[]) => { calls.push(['patch', ...args]); return { data: {} }; },
    };
    return { calls, client, http: client as unknown as Pick<typeof axios, 'post' | 'patch'> };
}

test('upload and profile update both send the JWT, with an encoded owner email', async () => {
    const f = fixture();
    const file = new Blob(['image'], { type: 'image/png' });
    assert.equal(await updateProfileImage(apiUrl, email, file, 'fixture-token', f.http), imageUrl);
    assert.equal(f.calls.length, 2);
    assert.deepEqual(f.calls[0].slice(0, 2), ['post', `${apiUrl}/register/profile`]);
    const form = f.calls[0][2] as FormData;
    assert.ok(form.get('image') instanceof Blob);
    assert.deepEqual(f.calls[0][3], { headers: { Authorization: 'Bearer fixture-token' } });
    assert.deepEqual(f.calls[1], ['patch', `${apiUrl}/register/${encodeURIComponent(email)}`, { imageUrlProfile: imageUrl }, { headers: { Authorization: 'Bearer fixture-token' } }]);
});

for (const token of [null, '', '   ']) {
    test(`missing session (${JSON.stringify(token)}) makes no upload or profile request`, async () => {
        const f = fixture();
        await assert.rejects(updateProfileImage(apiUrl, email, new Blob(['image']), token, f.http), /iniciar sesión/);
        assert.equal(f.calls.length, 0);
    });
}

test('a missing owner email makes no HTTP request', async () => {
    const f = fixture();
    await assert.rejects(updateProfileImage(apiUrl, '', new Blob(['image']), 'fixture-token', f.http), /iniciar sesión/);
    assert.equal(f.calls.length, 0);
});

test('failed upload never attempts the profile update', async () => {
    const f = fixture();
    f.client.post = async () => { throw new Error('upload denied'); };
    await assert.rejects(updateProfileImage(apiUrl, email, new Blob(['image']), 'fixture-token', f.http), /upload denied/);
    assert.equal(f.calls.length, 0);
});

test('a failed profile update is reported instead of showing success', async () => {
    const f = fixture();
    f.client.patch = async () => { throw new Error('profile denied'); };
    await assert.rejects(updateProfileImage(apiUrl, email, new Blob(['image']), 'fixture-token', f.http), /profile denied/);
    assert.equal(f.calls.length, 1);
});

test('a malformed upload response never updates the profile', async () => {
    const f = fixture();
    f.client.post = async () => ({ data: { imageUrl: '' } });
    await assert.rejects(updateProfileImage(apiUrl, email, new Blob(['image']), 'fixture-token', f.http), /imagen válida/);
    assert.equal(f.calls.length, 0);
});
