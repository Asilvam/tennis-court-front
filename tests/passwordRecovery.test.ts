import assert from 'node:assert/strict';
import { test } from 'node:test';
import type axios from 'axios';
import { ADMIN_PASSWORD_RECOVERY_MESSAGE, PASSWORD_RECOVERY_MESSAGE, confirmPasswordRecovery, readPasswordResetToken, requestPasswordRecovery, validateResetPasswords } from '../src/utils/passwordRecovery.ts';

const apiUrl = 'http://backend.test';
const token = 'a'.repeat(64);

test('public recovery mentions the waiting restriction, while admin recovery specifies the link lifetime', () => {
    assert.match(PASSWORD_RECOVERY_MESSAGE, /cuenta activa/);
    assert.match(PASSWORD_RECOVERY_MESSAGE, /24 horas/);
    assert.match(ADMIN_PASSWORD_RECOVERY_MESSAGE, /cuenta activa/);
    assert.match(ADMIN_PASSWORD_RECOVERY_MESSAGE, /vence en 24 horas/);
    assert.doesNotMatch(ADMIN_PASSWORD_RECOVERY_MESSAGE, /no solicitaste recuperación en las últimas/);
});
function fixture() {
    const calls: unknown[][] = [];
    const client = { post: async (...args: unknown[]) => { calls.push(args); return { data: { success: true } }; } };
    return { calls, client, http: client as unknown as Pick<typeof axios, 'post'> };
}

test('public recovery works without a JWT and sends only the normalized email to the new route', async () => {
    const f = fixture();
    await requestPasswordRecovery(apiUrl, ' MEMBER@TEST.CL ', {}, f.http);
    assert.deepEqual(f.calls, [[`${apiUrl}/register/password-recovery`, { email: 'member@test.cl' }, undefined]]);
});

test('admin recovery uses the protected route and session JWT', async () => {
    const f = fixture();
    await requestPasswordRecovery(apiUrl, 'member@test.cl', { admin: true, token: 'admin-jwt' }, f.http);
    assert.deepEqual(f.calls, [[`${apiUrl}/register/admin/resetpass`, { email: 'member@test.cl' }, { headers: { Authorization: 'Bearer admin-jwt' } }]]);
});

test('an admin request without a session makes no request', async () => {
    const f = fixture();
    await assert.rejects(requestPasswordRecovery(apiUrl, 'member@test.cl', { admin: true }, f.http), /iniciar sesión/);
    assert.equal(f.calls.length, 0);
});

for (const email of ['', 'invalid', 'a@', 'a@b', 'a b@test.cl']) {
    test(`invalid email (${JSON.stringify(email)}) makes no request`, async () => {
        const f = fixture();
        await assert.rejects(requestPasswordRecovery(apiUrl, email, {}, f.http), /correo electrónico válido/);
        assert.equal(f.calls.length, 0);
    });
}

test('the token is read from the fragment, not a page query or persistent storage', () => {
    assert.equal(readPasswordResetToken(`#token=${token}`), token);
    assert.equal(readPasswordResetToken(`?token=${token}`), '');
});

for (const hash of ['', '#token=invalid', '#token=', `#token=${token}&token=${token}`, '#token=' + 'a'.repeat(65)]) {
    test(`malformed or duplicate token fragment (${hash.length} characters) is rejected`, () => assert.equal(readPasswordResetToken(hash), ''));
}

test('valid matching passwords use the existing minimum length and bcrypt byte limit', () => {
    assert.doesNotThrow(() => validateResetPasswords('secret', 'secret'));
    assert.doesNotThrow(() => validateResetPasswords('x'.repeat(72), 'x'.repeat(72)));
});

for (const [password, confirmation] of [['short', 'short'], ['secret1', 'secret2'], ['x'.repeat(73), 'x'.repeat(73)], ['á'.repeat(40), 'á'.repeat(40)]]) {
    test(`invalid password pair (${password.length}/${confirmation.length}) makes no confirmation request`, async () => {
        const f = fixture();
        await assert.rejects(confirmPasswordRecovery(apiUrl, token, password, confirmation, f.http));
        assert.equal(f.calls.length, 0);
    });
}

test('confirmation sends only the one-use token and matching passwords, never an email or role', async () => {
    const f = fixture();
    await confirmPasswordRecovery(apiUrl, token, 'secret123', 'secret123', f.http);
    assert.deepEqual(f.calls, [[`${apiUrl}/register/password-recovery/confirm`, { token, password: 'secret123', passwordConfirmation: 'secret123' }]]);
});

test('a missing token never submits the password', async () => {
    const f = fixture();
    await assert.rejects(confirmPasswordRecovery(apiUrl, '', 'secret123', 'secret123', f.http), /enlace no es válido/);
    assert.equal(f.calls.length, 0);
});

test('failed mail requests are reported, not presented as confirmed delivery', async () => {
    const f = fixture();
    f.client.post = async () => { throw new Error('backend unavailable'); };
    await assert.rejects(requestPasswordRecovery(apiUrl, 'member@test.cl', {}, f.http), /backend unavailable/);
});

test('a rejected or expired token does not produce a successful confirmation', async () => {
    const f = fixture();
    f.client.post = async () => { throw new Error('expired'); };
    await assert.rejects(confirmPasswordRecovery(apiUrl, token, 'secret123', 'secret123', f.http), /expired/);
});
