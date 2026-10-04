import test from 'node:test';
import assert from 'node:assert/strict';
import { isDriverPin } from '../src/lib/driverPin.ts';

test('PIN is exactly four ASCII digits and preserves leading zeros', () => {
  for (const value of ['0000','0123','9876']) assert.equal(isDriverPin(value), true);
  for (const value of ['','123','12345','12a4','1234\n',' 1234','1234 ','１２３４','١٢٣٤'])
    assert.equal(isDriverPin(value), false, value);
});
