import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAdminMemberUpdate, memberType, titularOptions, validateMemberAssociation, type EditableMember } from '../src/utils/memberEditing.ts';

const member: EditableMember = {
    _id: '000000000000000000000001', email: 'member@test.cl', namePlayer: 'Member', cellular: '123', role: 'user',
    statePlayer: true, updatePayment: false, partnerType: 'Titular',
};
const titular: EditableMember = { ...member, _id: '000000000000000000000002', namePlayer: 'Titular', email: 'titular@test.cl' };

test('legacy Familiar displays as Carga without changing stored data', () => {
    assert.equal(memberType('Familiar'), 'Carga');
    const legacy = { ...member, partnerType: 'Familiar' };
    assert.deepEqual(buildAdminMemberUpdate(legacy, legacy), {});
});

test('missing legacy type displays as Titular', () => assert.equal(memberType(undefined), 'Titular'));

test('titular choices exclude the edited member and other cargas or familiares', () => {
    const options = titularOptions([member, titular, { ...member, _id: 'carga', partnerType: 'Carga' }, { ...member, _id: 'familiar', partnerType: 'Familiar' }], member._id);
    assert.deepEqual(options, [{ value: titular._id, label: 'Titular — titular@test.cl' }]);
});

test('member identifiers, not names or emails, are used for associations', () => {
    const edited = { ...member, partnerType: 'Carga', titularId: titular._id };
    const payload = buildAdminMemberUpdate(edited, member);
    assert.deepEqual(payload, { partnerType: 'Carga', titularId: titular._id });
    assert.doesNotThrow(() => validateMemberAssociation(payload, edited, [member, titular]));
});

test('saving a titular clears its old association', () => {
    const original = { ...member, partnerType: 'Carga', titularId: titular._id };
    assert.deepEqual(buildAdminMemberUpdate({ ...original, partnerType: 'Titular', titularId: null }, original), { partnerType: 'Titular', titularId: null });
});

test('editing unrelated legacy details does not force an unassociated familiar into a new type', () => {
    const original = { ...member, partnerType: 'Familiar' };
    const payload = buildAdminMemberUpdate({ ...original, namePlayer: 'Updated' }, original);
    assert.deepEqual(payload, { namePlayer: 'Updated' });
    assert.doesNotThrow(() => validateMemberAssociation(payload, original, []));
});

test('completing a legacy familiar association explicitly saves Carga', () => {
    const original = { ...member, partnerType: 'Familiar' };
    assert.deepEqual(buildAdminMemberUpdate({ ...original, titularId: titular._id }, original), { partnerType: 'Carga', titularId: titular._id });
});

test('reassigning a carga emits its new titular, without changing role or access flags', () => {
    const original = { ...member, partnerType: 'Carga', titularId: '000000000000000000000003' };
    assert.deepEqual(buildAdminMemberUpdate({ ...original, titularId: titular._id }, original), { partnerType: 'Carga', titularId: titular._id });
});

test('only changed editable fields are sent, never returned credentials or identifiers', () => {
    const returned = { ...member, pwd: 'hidden', verificationToken: 'hidden' };
    const payload = buildAdminMemberUpdate({ ...returned, namePlayer: 'Updated', cellular: '456', role: 'profesor', statePlayer: false, updatePayment: true }, returned);
    assert.deepEqual(payload, { namePlayer: 'Updated', cellular: '456', role: 'profesor', statePlayer: false, updatePayment: true });
    assert.ok(!('email' in payload) && !('_id' in payload) && !('pwd' in payload) && !('verificationToken' in payload));
});

test('an unchanged edit does not enable saving', () => assert.deepEqual(buildAdminMemberUpdate(member, member), {}));

test('a carga cannot clear its titular during an association change', () => {
    assert.throws(() => validateMemberAssociation({ partnerType: 'Carga', titularId: null }, member, [titular]), /Selecciona el titular/);
});

test('a member cannot choose itself as titular', () => {
    assert.throws(() => validateMemberAssociation({ partnerType: 'Carga', titularId: member._id }, member, [member]), /propio titular/);
});

test('a disappeared or demoted titular cannot be selected', () => {
    assert.throws(() => validateMemberAssociation({ partnerType: 'Carga', titularId: titular._id }, member, []), /no está disponible/);
    assert.throws(() => validateMemberAssociation({ partnerType: 'Carga', titularId: titular._id }, member, [{ ...titular, partnerType: 'Carga' }]), /no está disponible/);
});

test('invalid types are not silently converted to Titular', () => {
    assert.equal(memberType('Unknown'), '');
    assert.throws(() => buildAdminMemberUpdate({ ...member, partnerType: 'Unknown' }, member), /tipo de socio válido/);
});
