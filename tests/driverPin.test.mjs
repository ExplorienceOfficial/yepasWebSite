import test from 'node:test';
import assert from 'node:assert/strict';
import { isDriverPin } from '../src/lib/driverPin.ts';

test('PIN is exactly two ASCII digits and preserves leading zeros', () => {
  for (const value of ['00','01','98']) assert.equal(isDriverPin(value), true);
  for (const value of ['','1','123','0123','a1','12\n',' 12','12 ','１２','١٢'])
    assert.equal(isDriverPin(value), false, value);
});
