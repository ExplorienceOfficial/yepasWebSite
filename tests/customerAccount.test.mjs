import test from 'node:test';
import assert from 'node:assert/strict';
import { isCustomerPin, isCustomerLogin, suggestCustomerLogin } from '../src/lib/customerAccount.ts';

test('customer PIN uses four ASCII digits, retaining leading zeros', () => {
  for (const pin of ['0000','0123','9999']) assert.equal(isCustomerPin(pin), true);
  for (const pin of ['12','123','12345','12a4','１２３４','١٢٣٤','1234\n']) assert.equal(isCustomerPin(pin), false);
});
test('tax/TCKN login and optional branch suffix are validated', () => {
  for (const name of ['0123456789','01234567890','0123456789/Çankaya-1','01234567890/Şube_2']) assert.equal(isCustomerLogin(name), true);
  for (const name of ['oldusername','123456789','123456789012','0123456789/','0123456789/a/b','0123456789/a b','0123456789\n']) assert.equal(isCustomerLogin(name), false, name);
  assert.equal(suggestCustomerLogin('0123456789'), '0123456789');
  assert.equal(suggestCustomerLogin('0123456789','Çankaya Şube'), '0123456789/Çankaya-Şube');
  assert.equal(suggestCustomerLogin('missing'), '');
});
