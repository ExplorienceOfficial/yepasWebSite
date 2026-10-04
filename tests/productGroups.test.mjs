import test from 'node:test';
import assert from 'node:assert/strict';
import { groupProducts, separateProducts } from '../src/lib/productGroups.ts';

test('upper stock owns standard and variant rows without changing source data', () => {
  const lines = [
    { uStokId: 373, aStokId: 296, quantity: 15 },
    { uStokId: 75, aStokId: 0, quantity: 2 },
    { uStokId: 373, aStokId: 0, quantity: 10 },
  ];
  const original = structuredClone(lines);
  const groups = groupProducts(lines);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].lines.map(item => item.aStokId), [0, 296]);
  assert.equal(groups[0].lines.reduce((sum, item) => sum + item.quantity, 0), 25);
  assert.deepEqual(lines, original);
});

test('equal names never merge different upper stock IDs; empty data stays empty', () => {
  assert.equal(groupProducts([{ uStokId: 1, aStokId: 0 }, { uStokId: 2, aStokId: 0 }]).length, 2);
  assert.deepEqual(groupProducts([]), []);
});

test('standard and lower-stock variants render as independent rows with their own quantities', () => {
  const lines = [{uStokId:373,aStokId:296,quantity:10}, {uStokId:373,aStokId:0,quantity:12}];
  const before = structuredClone(lines);
  assert.deepEqual(separateProducts(lines), [lines[1],lines[0]]);
  assert.equal(separateProducts(lines).length, 2);
  assert.deepEqual(lines, before);
  assert.deepEqual(separateProducts([]), []);
});
